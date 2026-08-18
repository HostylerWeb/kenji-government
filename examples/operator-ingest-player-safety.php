<?php
/**
 * Example: play-safe event to GRA Ingest API.
 *
 * Usage: php examples/operator-ingest-player-safety.php
 */

$baseUrl = getenv('GRA_INGEST_URL') ?: 'http://localhost:4001/v1';
$apiKey = getenv('GRA_API_KEY') ?: 'gra_sandbox_op001_devkey0001';
$hmacSecret = getenv('GRA_HMAC_SECRET') ?: 'sandbox_hmac_op001_secret_32chars_min';

$payload = [
    'event_type' => 'play_safe',
    'county' => 'Nairobi',
    'region' => 'Central',
    'occurred_at' => date('c'),
];

$body = json_encode($payload, JSON_UNESCAPED_SLASHES);
$signature = hash_hmac('sha256', $body, $hmacSecret);
$idempotencyKey = 'play-safe-demo-' . time();

$ch = curl_init($baseUrl . '/events/player-safety');
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

// PII rejection demo (should return 400):
$badPayload = [
    'event_type' => 'play_safe',
    'county' => 'Nairobi',
    'player_id' => 'should-be-rejected',
    'occurred_at' => date('c'),
];
$badBody = json_encode($badPayload, JSON_UNESCAPED_SLASHES);
$badSig = hash_hmac('sha256', $badBody, $hmacSecret);
$ch2 = curl_init($baseUrl . '/events/player-safety');
curl_setopt_array($ch2, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Api-Key: ' . $apiKey,
        'X-Signature: ' . $badSig,
        'X-Idempotency-Key: ' . 'pii-test-' . time(),
    ],
    CURLOPT_POSTFIELDS => $badBody,
]);
$badResponse = curl_exec($ch2);
$badStatus = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);
echo "PII test HTTP $badStatus\n";
echo $badResponse . "\n";
