/**
 * Shared utilities for uploading piece media (images, PDF, audio).
 * Used by AddPiecePage, TeleprompterStudio, and related components.
 */

import { supabase } from '@/integrations/supabase/client';
import { optimizeRecitationImage } from '@/lib/image-optimizer';

const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_MAX_SIZE = 50 * 1024 * 1024;   // 50MB

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const PDF_TYPE = 'application/pdf';

export function isValidImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type);
}

export function isValidPdfFile(file: File): boolean {
  return file.type === PDF_TYPE || file.name.toLowerCase().endsWith('.pdf');
}

export function validateImageFile(file: File): { ok: boolean; error?: string } {
  if (!isValidImageFile(file)) {
    return { ok: false, error: 'Please upload an image (JPEG, PNG, WebP, GIF)' };
  }
  if (file.size > IMAGE_MAX_SIZE) {
    return { ok: false, error: 'Image too large. Max 10MB' };
  }
  return { ok: true };
}

export function validatePdfFile(file: File): { ok: boolean; error?: string } {
  if (!isValidPdfFile(file)) {
    return { ok: false, error: 'Please upload a PDF file' };
  }
  if (file.size > PDF_MAX_SIZE) {
    return { ok: false, error: 'PDF too large. Max 50MB' };
  }
  return { ok: true };
}

export async function uploadImageToSupabase(file: File): Promise<string> {
  const validated = validateImageFile(file);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const optimizedBlob = await optimizeRecitationImage(file);
  const fileName = `recitation-${Date.now()}.webp`;

  const { data, error } = await supabase.storage
    .from('piece-images')
    .upload(fileName, optimizedBlob, {
      cacheControl: '31536000',
      contentType: 'image/webp',
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('piece-images').getPublicUrl(data.path);
  return publicUrl;
}

export async function uploadPdfToSupabase(file: File): Promise<string> {
  const validated = validatePdfFile(file);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const fileName = `piece-${Date.now()}.pdf`;

  const { data, error } = await supabase.storage
    .from('piece-images')
    .upload(fileName, file, {
      cacheControl: '31536000',
      contentType: 'application/pdf',
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('piece-images').getPublicUrl(data.path);
  return publicUrl;
}
