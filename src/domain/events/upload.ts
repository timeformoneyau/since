import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { SUPABASE_URL } from '../../config';

export const STORAGE_BUCKET = 'event-photos';

export async function uploadEventPhoto(
  localUri: string,
  itemId: string,
  eventId: string,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const storagePath = `${session.user.id}/${itemId}/${eventId}.jpg`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`;

  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Upload failed: ${result.status}`);
  }

  return storagePath;
}

export async function getSignedPhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600); // 1 hour
  if (error || !data) throw new Error('Could not get signed URL');
  return data.signedUrl;
}
