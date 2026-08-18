<?php
/**
 * Example: emit a real-time ticket purchase to GRA Ingest API (op-001 sandbox).
 *
 * Usage: php examples/operator-ingest-ticket-event.php
 */

$baseUrl = getenv('GRA_INGEST_URL') ?: 'http://localhost:4001/v1';
$apiKey = getenv('GRA_API_KEY') ?: 'gra_sandbox_op001_devkey0001';
$hmacSecret = getenv('GRA_HMAC_SECRET') ?: 'sandbox_hmac_op001_secret_32chars_min';

$now = new DateTimeImmutable('now', new DateTimeZone('Africa/Nairobi'));

$payload = [
    'action' => 'purchased',
    'ticket_id' => 'TKT-' . bin2hex(random_bytes(4)),
    'raffle_id' => 'raffle-weekly-001',
    'raffle_name' => 'Weekly Dream Draw',
    'amount' => 500,
    'currency' => 'KES',
    'purchased_at' => $now->format('Y-m-d\TH:i:sP'),
];

$body = json_encode($payload, JSON_UNESCAPED_SLASHES);
$signature = hash_hmac('sha256', $body, $hmacSecret);
$idempotencyKey = 'ticket-' . $payload['ticket_id'];

$ch = curl_init($baseUrl . '/events/ticket');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Api-Key: ' . $apiKey,
        'X-Signature: ' . $signature,
        'X-Idempotency-Key: ' . $idempotencyKey,
    ],
    CURLOPT_POSTFIELDS => $body,
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP $status\n";
echo $response . "\n";
