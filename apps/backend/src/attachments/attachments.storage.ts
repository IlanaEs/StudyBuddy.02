// Private Supabase Storage access for lesson attachments. All access goes through
// the service-role admin client; the bucket is private and reachable only via the
// short-lived signed URLs minted here (after a service-layer access check).

import { AppError } from '../errors/AppError.js';
import { createSupabaseAdminClient } from '../supabase/supabaseClients.js';
import { ATTACHMENTS_BUCKET, SIGNED_URL_TTL_SECONDS } from './attachments.constants.js';

const bucket = () => createSupabaseAdminClient().storage.from(ATTACHMENTS_BUCKET);

export async function uploadObject(path: string, body: Buffer, contentType: string): Promise<void> {
  const { error } = await bucket().upload(path, body, { contentType, upsert: false });
  if (error) throw new AppError('שגיאה בשמירת הקובץ. נסו שוב.', 500);
}

export async function createSignedDownloadUrl(path: string): Promise<string> {
  const { data, error } = await bucket().createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) throw new AppError('שגיאה ביצירת קישור לקובץ.', 500);
  return data.signedUrl;
}

// Best-effort removal (used on draft delete and to clean up a failed insert).
export async function removeObject(path: string): Promise<void> {
  const { error } = await bucket().remove([path]);
  if (error) console.error('[attachments] failed to remove object', path, error.message);
}
