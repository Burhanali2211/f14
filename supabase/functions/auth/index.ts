import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  const requestOrigin = origin || '';
  
  // More permissive CORS for mobile devices and various deployment scenarios
  // Allow localhost, IP addresses, and common deployment platforms
  const isAllowed = 
    !requestOrigin || // No origin (same-origin request)
    allowedOrigins.some(allowed => requestOrigin === allowed) ||
    requestOrigin.includes('supabase.co') ||
    requestOrigin.includes('netlify.app') ||
    requestOrigin.includes('vercel.app') ||
    requestOrigin.includes('localhost') ||
    requestOrigin.includes('127.0.0.1') ||
    /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(requestOrigin) || // Private network IPs
    /^https?:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?$/.test(requestOrigin) || // Any IP address format
    requestOrigin.startsWith('http://') || // Allow HTTP for local development
    requestOrigin.startsWith('https://'); // Allow HTTPS
  
  // CRITICAL: When Access-Control-Allow-Credentials is 'true',
  // Access-Control-Allow-Origin cannot be '*'. It must be a specific origin.
  // Use the request origin if present, otherwise fall back to first allowed origin
  let corsOrigin: string;
  if (!requestOrigin) {
    // No origin means same-origin request, use first allowed origin as fallback
    corsOrigin = allowedOrigins[0] || 'http://localhost:8080';
  } else if (isAllowed) {
    // Use the request origin if it's allowed
    corsOrigin = requestOrigin;
  } else {
    // If not explicitly allowed but we have an origin, use it anyway for permissive CORS
    // This handles edge cases while maintaining credentials support
    corsOrigin = requestOrigin;
  }
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const userAgent = req.headers.get('user-agent') || '';
  
  // Log for debugging mobile issues
  console.log('Auth request:', {
    origin,
    referer,
    method: req.method,
    userAgent: userAgent.substring(0, 50),
    url: req.url
  });
  
  const corsHeaders = getCorsHeaders(origin || referer);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Since JWT verification is disabled, we can proceed without API key validation
    // The function is protected by Supabase's function URL which requires the anon key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { action, email, password, full_name, phone_number, address } =
      await req.json();

    if (action === "signup") {
      // Hash password using Web Crypto API
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Insert user into database
      const { data: userData, error: insertError } = await supabaseClient
        .from("users")
        .insert({
          email,
          password_hash: passwordHash,
          full_name,
          phone_number: phone_number || null,
          address: address || null,
          role: "user",
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique constraint violation (email already exists)
          return new Response(
            JSON.stringify({ error: "Email already registered" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        throw insertError;
      }

      // Return user data (without password)
      const { password_hash, ...userWithoutPassword } = userData;
      return new Response(JSON.stringify({ user: userWithoutPassword }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (action === "login") {
      // Find user by email
      const { data: userData, error: findError } = await supabaseClient
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("is_active", true)
        .single();

      if (findError || !userData) {
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Hash provided password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Compare hashes
      if (userData.password_hash !== passwordHash) {
        return new Response(
          JSON.stringify({ error: "Invalid email or password" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Return user data (without password)
      const { password_hash, ...userWithoutPassword } = userData;
      return new Response(JSON.stringify({ user: userWithoutPassword }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
