/**
 * One-time setup function: creates the Hedera HCS topic for the Since app.
 * Run once: supabase functions invoke create-hedera-topic --no-verify-jwt
 * Copy the returned topicId and set it as: supabase secrets set HEDERA_TOPIC_ID=0.0.XXXXX
 */

import {
  Client,
  TopicCreateTransaction,
  PrivateKey,
  AccountId,
} from 'npm:@hashgraph/sdk@2';

Deno.serve(async () => {
  const hederaAccountId = Deno.env.get('HEDERA_ACCOUNT_ID');
  const hederaPrivateKey = Deno.env.get('HEDERA_PRIVATE_KEY');
  const hederaNetwork = Deno.env.get('HEDERA_NETWORK') ?? 'testnet';

  if (!hederaAccountId || !hederaPrivateKey) {
    return new Response(
      JSON.stringify({ error: 'HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY secrets required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const client = hederaNetwork === 'mainnet'
    ? Client.forMainnet()
    : Client.forTestnet();

  client.setOperator(
    AccountId.fromString(hederaAccountId),
    PrivateKey.fromString(hederaPrivateKey),
  );

  const txResponse = await new TopicCreateTransaction()
    .setTopicMemo('Since app — event evidence log')
    .execute(client);

  const receipt = await txResponse.getReceipt(client);
  const topicId = receipt.topicId!.toString();
  client.close();

  return new Response(
    JSON.stringify({ topicId, message: `Run: supabase secrets set HEDERA_TOPIC_ID=${topicId}` }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
