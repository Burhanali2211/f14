export const config = {
    runtime: 'edge',
};
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'kalaam-reader';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function hmacSha256(key, message) {
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}
async function getSignatureKey(secretKey, dateStamp, region, service) {
    const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, service);
    return hmacSha256(kService, 'aws4_request');
}
function toHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
async function deleteFromR2(bucket, key) {
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const region = 'auto';
    const service = 's3';
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`;
    const canonicalUri = `/${bucket}/${key}`;
    const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
        'DELETE',
        canonicalUri,
        '',
        canonicalHeaders,
        signedHeaders,
        'UNSIGNED-PAYLOAD',
    ].join('\n');
    const canonicalRequestHash = toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalRequest)));
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        canonicalRequestHash,
    ].join('\n');
    const signingKey = await getSignatureKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
    const signature = toHex(await hmacSha256(signingKey, stringToSign));
    const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    try {
        const response = await fetch(`${endpoint}${canonicalUri}`, {
            method: 'DELETE',
            headers: {
                'Host': host,
                'x-amz-date': amzDate,
                'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
                'Authorization': authorizationHeader,
            },
        });
        return response.ok || response.status === 204;
    }
    catch (error) {
        console.error('R2 delete error:', error);
        return false;
    }
}
async function verifyUser(authHeader) {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.slice(7);
    try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_SERVICE_KEY,
            },
        });
        if (!response.ok)
            return null;
        const user = await response.json();
        return user?.id ? { userId: user.id } : null;
    }
    catch {
        return null;
    }
}
export default async function handler(request) {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }
    if (request.method !== 'POST' && request.method !== 'DELETE') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    try {
        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
            return new Response(JSON.stringify({ error: 'R2 credentials not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const auth = await verifyUser(request.headers.get('authorization'));
        if (!auth) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const body = await request.json();
        const { audioId } = body;
        if (!audioId) {
            return new Response(JSON.stringify({ error: 'Missing required field: audioId' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const fetchResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_audio_files?id=eq.${audioId}&user_id=eq.${auth.userId}&select=*`, {
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
        });
        if (!fetchResponse.ok) {
            return new Response(JSON.stringify({ error: 'Failed to fetch audio record' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const records = await fetchResponse.json();
        if (!records || records.length === 0) {
            return new Response(JSON.stringify({ error: 'Audio file not found or access denied' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const audioRecord = records[0];
        await deleteFromR2(R2_BUCKET_NAME, audioRecord.r2_key);
        const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_audio_files?id=eq.${audioId}&user_id=eq.${auth.userId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
        });
        if (!deleteResponse.ok) {
            return new Response(JSON.stringify({ error: 'Failed to delete audio record' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
    catch (error) {
        console.error('Error deleting audio:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
//# sourceMappingURL=r2-delete.js.map