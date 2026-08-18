<?php
/**
 * Example: submit monthly return to GRA Ingest API (op-001 sandbox).
 *
 * Usage: php examples/operator-ingest-monthly-return.php
 */

$baseUrl = getenv('GRA_INGEST_URL') ?: 'http://localhost:4001/v1';
$apiKey = getenv('GRA_API_KEY') ?: 'gra_sandbox_op001_devkey0001';
$hmacSecret = getenv('GRA_HMAC_SECRET') ?: 'sandbox_hmac_op001_secret_32chars_min';

$payload = [
    'reporting_year' => 2026,
    'reporting_month' => 7,
    'tickets_sold' => 13200,
    'gross_revenue' => 54800000,
    'prizes_paid' => 27400000,
    'expenses' => 6800000,
    'gross_gaming_revenue' => 42000000,
    'tax_paid' => 5200000,
    'notes' => 'July 2026 return via operator platform example client',
];

$body = json_encode($payload, JSON_UNESCAPED_SLASHES);
$signature = hash_hmac('sha256', $body, $hmacSecret);
$idempotencyKey = 'monthly-op-001-2026-07-example-' . time();

$ch = curl_init($baseUrl . '/returns/monthly');
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
