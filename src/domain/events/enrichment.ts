import { supabase } from '../../lib/supabase';
import { SUPABASE_URL } from '../../config';
import { ExtractedReceiptData } from '../../types';

interface EnrichmentResult {
  extractedData: ExtractedReceiptData | null;
  hederaTxId: string | null;
}

export async function processEventEvidence(params: {
  itemId: string;
  eventId: string;
  storagePath: string;
  eventDate: string;
  itemName: string;
  category: string;
}): Promise<EnrichmentResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const fnUrl = `${SUPABASE_URL}/functions/v1/process-event`;

  const response = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Edge function error: ${response.status}`);
  }

  return response.json();
}
