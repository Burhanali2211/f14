import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AudioFile {
  id: string;
  r2Key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds?: number;
  pieceId?: string;
  createdAt: string;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseR2AudioReturn {
  uploadAudio: (file: File, pieceId?: string) => Promise<AudioFile>;
  getStreamUrl: (audioId: string) => Promise<string>;
  deleteAudio: (audioId: string) => Promise<void>;
  getUserAudioFiles: (pieceId?: string) => Promise<AudioFile[]>;
  uploadProgress: UploadProgress | null;
  isUploading: boolean;
  error: string | null;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;
/** Proxy upload avoids CORS; Vercel serverless body limit ~4.5MB */
const PROXY_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
const AUDIO_EXTENSIONS = [
  '.mp3', '.wav', '.ogg', '.webm', '.aac', '.m4a', '.mp4', '.flac',
  '.opus', '.wma', '.aiff', '.aif', '.amr', '.3gp', '.3gpp', '.3g2',
  '.mid', '.midi', '.mp2', '.ra', '.ram', '.ac3', '.caf', '.mka',
  '.oga', '.spx', '.wv', '.ape', '.alac', '.dts', '.mpc', '.snd', '.au'
];

function isValidAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) return true;
  if (file.type === 'video/mp4' || file.type === 'video/3gpp') return true;
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

function getAudioMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream' && file.type !== '') {
    return file.type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
    'aac': 'audio/aac',
    'm4a': 'audio/mp4',
    'mp4': 'audio/mp4',
    'flac': 'audio/flac',
    'opus': 'audio/opus',
    'wma': 'audio/x-ms-wma',
    'aiff': 'audio/aiff',
    'aif': 'audio/aiff',
    'amr': 'audio/amr',
    '3gp': 'audio/3gpp',
    '3gpp': 'audio/3gpp',
    '3g2': 'audio/3gpp2',
    'mid': 'audio/midi',
    'midi': 'audio/midi',
    'mp2': 'audio/mpeg',
    'ac3': 'audio/ac3',
    'caf': 'audio/x-caf',
    'mka': 'audio/x-matroska',
    'oga': 'audio/ogg',
  };
  return mimeTypes[ext] || 'audio/mpeg';
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export function useR2Audio(): UseR2AudioReturn {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

    const uploadAudio = useCallback(async (file: File, pieceId?: string): Promise<AudioFile> => {
      setError(null);
      setUploadProgress(null);

      if (!isValidAudioFile(file)) {
        const err = `Invalid file type. Please upload an audio file.`;
        setError(err);
        throw new Error(err);
      }

      if (file.size > MAX_FILE_SIZE) {
        const err = `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
        setError(err);
        throw new Error(err);
      }

      setIsUploading(true);
      const contentType = getAudioMimeType(file);
      const useProxy = file.size <= PROXY_UPLOAD_MAX_BYTES;

        try {
          const token = await getAuthToken();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const uploadUrlResponse = await fetch('/api/r2-upload-url', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              filename: file.name,
              contentType: contentType,
              fileSize: file.size,
              pieceId,
              useProxy,
            }),
          });

      if (!uploadUrlResponse.ok) {
        const errData = await uploadUrlResponse.json().catch(() => ({}));
        const msg = errData.error || (uploadUrlResponse.status === 500 ? 'Server error. Check R2 credentials and database.' : 'Failed to get upload URL');
        throw new Error(msg);
      }

      const { uploadUrl, r2Key, audioId, useProxy: proxyMode } = await uploadUrlResponse.json();

      if (proxyMode) {
        abortControllerRef.current = new AbortController();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('r2Key', r2Key);

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              setUploadProgress({
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100),
              });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              try {
                const errData = JSON.parse(xhr.responseText || '{}');
                reject(new Error(errData.error || `Upload failed with status ${xhr.status}`));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed due to network error'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload was cancelled'));
          });

          abortControllerRef.current?.signal.addEventListener('abort', () => {
            xhr.abort();
          });

          xhr.open('POST', '/api/r2-audio-upload');
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          xhr.send(formData);
        });
      } else {
        abortControllerRef.current = new AbortController();

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              setUploadProgress({
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100),
              });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              const msg = xhr.status === 401
                ? 'Upload failed (401). Check R2 credentials in Vercel env vars - see R2_CORS_SETUP.md'
                : `Upload failed with status ${xhr.status}. For large files, ensure CORS and R2 credentials are configured.`;
              reject(new Error(msg));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed. Check R2 credentials and CORS - see R2_CORS_SETUP.md'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload was cancelled'));
          });

          abortControllerRef.current?.signal.addEventListener('abort', () => {
            xhr.abort();
          });

          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', contentType);
          xhr.send(file);
        });
      }

      const audioFile: AudioFile = {
        id: audioId,
        r2Key,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        pieceId,
        createdAt: new Date().toISOString(),
      };

      return audioFile;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const getStreamUrl = useCallback(async (audioIdOrR2Key: string): Promise<string> => {
    setError(null);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = audioIdOrR2Key.startsWith('audio/') 
        ? { r2Key: audioIdOrR2Key }
        : { audioId: audioIdOrR2Key };

      const response = await fetch('/api/r2-stream-url', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get stream URL');
      }

      const { streamUrl } = await response.json();
      return streamUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get stream URL';
      setError(message);
      throw err;
    }
  }, []);

  const deleteAudio = useCallback(async (audioId: string): Promise<void> => {
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required to delete audio');
      }

      const response = await fetch('/api/r2-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ audioId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete audio');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete audio';
      setError(message);
      throw err;
    }
  }, []);

  const getUserAudioFiles = useCallback(async (pieceId?: string): Promise<AudioFile[]> => {
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      let query = supabase
        .from('user_audio_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (pieceId) {
        query = query.eq('piece_id', pieceId);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(queryError.message);
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        r2Key: row.r2_key,
        filename: row.filename,
        contentType: row.content_type,
        sizeBytes: row.size_bytes,
        durationSeconds: row.duration_seconds,
        pieceId: row.piece_id,
        createdAt: row.created_at,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch audio files';
      setError(message);
      throw err;
    }
  }, []);

  return {
    uploadAudio,
    getStreamUrl,
    deleteAudio,
    getUserAudioFiles,
    uploadProgress,
    isUploading,
    error,
  };
}
