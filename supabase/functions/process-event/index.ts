/**
 * process-event Edge Function
 *
 * Receives a completed event with an attached photo, then:
 *   1. Downloads the image from Supabase Storage
 *   2. Sends it to Claude Vision for structured data extraction
 *   3. Submits an immutable fingerprint to Hedera Consensus Service
 *   4. Returns { extractedData, hederaTxId }
 *
 * Required Supabase secrets (set via: supabase secrets set KEY=value):
 *   ANTHROPIC_API_KEY      — from console.anthropic.com
 *   HEDERA_ACCOUNT_ID      — e.g. 0.0.1234567
 *   HEDERA_PRIVATE_KEY     — DER-encoded or raw hex private key
 *   HEDERA_TOPIC_ID        — HCS topic ID, e.g. 0.0.9999999
 *                            Create once: supabase functions invoke create-hedera-topic
 *   HEDERA_NETWORK         — "mainnet" or "testnet" (default: testnet)
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.30';
import {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
} from 'npm:@hashgraph/sdk@2';

const STORAGE_BUCKET = 'event-photos';

interface RequestBody {
  itemId: string;
  eventId: string;
  storagePath: string;
  eventDate: string;
  itemName: string;
  category: string;
}

interface ExtractedReceiptData {
  vendor?: string | null;
  amount?: number | null;
  currency?: string | null;
  receiptDate?: string | null;
  description?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body: RequestBody = await req.json();
    const { itemId, eventId, storagePath, eventDate, itemName, category } = body;

    // 1. Download image from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);
    if (fileError || !fileData) throw new Error(`Storage download failed: ${fileError?.message}`);

    const imageBytes = new Uint8Array(await fileData.arrayBuffer());
    const base64Image = btoa(String.fromCharCode(...imageBytes));

    // 2. Claude Vision: extract structured data from the image
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            {
              type: 'text',
              text: `This image is attached to a "${category}" task called "${itemName}" completed on ${eventDate}.
Extract any relevant information visible in the image and return ONLY valid JSON with these fields (omit fields not present):
{
  "vendor": "business or service name",
  "amount": 0.00,
  "currency": "USD",
  "receiptDate": "YYYY-MM-DD",
  "description": "brief description of what was done or purchased"
}
If this is not a receipt or document, return {}`,
            },
          ],
        },
      ],
    });

    let extractedData: ExtractedReceiptData | null = null;
    const rawText = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : '{}';
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) extractedData = JSON.parse(jsonMatch[0]);
      if (Object.keys(extractedData ?? {}).length === 0) extractedData = null;
    } catch {
      extractedData = null;
    }

    // 3. Hedera HCS: write immutable fingerprint
    let hederaTxId: string | null = null;
    const hederaAccountId = Deno.env.get('HEDERA_ACCOUNT_ID');
    const hederaPrivateKey = Deno.env.get('HEDERA_PRIVATE_KEY');
    const hederaTopicId = Deno.env.get('HEDERA_TOPIC_ID');
    const hederaNetwork = Deno.env.get('HEDERA_NETWORK') ?? 'testnet';

    if (hederaAccountId && hederaPrivateKey && hederaTopicId) {
      try {
        const client = hederaNetwork === 'mainnet'
          ? Client.forMainnet()
          : Client.forTestnet();

        client.setOperator(
          AccountId.fromString(hederaAccountId),
          PrivateKey.fromString(hederaPrivateKey),
        );

        // Fingerprint: hash the key fields (not the full image)
        const fingerprint = {
          app: 'since',
          userId: user.id,
          itemId,
          eventId,
          storagePath,
          eventDate,
          extractedVendor: extractedData?.vendor ?? null,
          extractedAmount: extractedData?.amount ?? null,
          timestamp: new Date().toISOString(),
        };

        const message = JSON.stringify(fingerprint);

        const txResponse = await new TopicMessageSubmitTransaction()
          .setTopicId(hederaTopicId)
          .setMessage(message)
          .execute(client);

        const receipt = await txResponse.getReceipt(client);
        hederaTxId = txResponse.transactionId.toString();

        client.close();
      } catch (hederaErr) {
        // Hedera failure is non-fatal — extraction result is still returned
        console.error('Hedera error:', hederaErr);
      }
    }

    return json({ extractedData, hederaTxId });
  } catch (err: any) {
    console.error('process-event error:', err);
    return json({ error: err?.message ?? 'Internal error' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
