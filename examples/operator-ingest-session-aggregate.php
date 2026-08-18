<?php
/**
 * Example: session aggregate event to GRA Ingest API.
 *
 * Usage: php examples/operator-ingest-session-aggregate.php
 */

$baseUrl = getenv('GRA_INGEST_URL') ?: 'http://localhost:4001/v1';
$apiKey = getenv('GRA_API_KEY') ?: 'gra_sandbox_op001_devkey0001';
$hmacSecret = getenv('GRA_HMAC_SECRET') ?: 'sandbox_hmac_op001_secret_32chars_min';

$bucketStart = date('c', strtotime(date('Y-m-d H:00:00')));

$payload = [
    'county' => 'Mombasa',
    'region' => 'Coast',
    'bucket_start' => $bucketStart,
    'session_count' => 142,
    'total_session_minutes' => 3180,
    'stake_band_distribution' => [
        '0-50' => 45,
        '51-100' => 38,
        '101-250' => 30,
        '251-500' => 18,
        '501-1000' => 7,
        '1001+' => 2,
    ],
    'age_band_distribution' => [
        '18-24' => 52,
        '25-34' => 48,
        '35-44' => 22,
        '45-54' => 12,
        '55+' => 8,
    ],
];

$body = json_encode($payload, JSON_UNESCAPED_SLASHES);
$signature = hash_hmac('sha256', $body, $hmacSecret);
$idempotencyKey = 'session-agg-demo-' . time();

$ch = curl_init($baseUrl . '/events/session-aggregate');
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
