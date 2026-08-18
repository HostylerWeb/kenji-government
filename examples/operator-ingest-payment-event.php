<?php
/**
 * Example: emit a real-time payment event to GRA Ingest API (op-001 sandbox).
 *
 * Usage: php examples/operator-ingest-payment-event.php
 */

$baseUrl = getenv('GRA_INGEST_URL') ?: 'http://localhost:4001/v1';
$apiKey = getenv('GRA_API_KEY') ?: 'gra_sandbox_op001_devkey0001';
$hmacSecret = getenv('GRA_HMAC_SECRET') ?: 'sandbox_hmac_op001_secret_32chars_min';

$now = new DateTimeImmutable('now', new DateTimeZone('Africa/Nairobi'));

$payload = [
    'action' => 'completed',
    'payment_id' => 'PAY-' . bin2hex(random_bytes(4)),
    'amount' => 500,
    'currency' => 'KES',
    'method' => 'mpesa',
    'reference' => 'QGH' . random_int(100000, 999999),
    'occurred_at' => $now->format('Y-m-d\TH:i:sP'),
];

$body = json_encode($payload, JSON_UNESCAPED_SLASHES);
$signature = hash_hmac('sha256', $body, $hmacSecret);
$idempotencyKey = 'payment-' . $payload['payment_id'];

$ch = curl_init($baseUrl . '/events/payment');
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
