<?php
/**
 * Example: upload a document via GRA Ingest API (op-001 sandbox).
 *
 * Usage: php examples/byanydream-document-upload.php /path/to/file.pdf
 */

$baseUrl = getenv('GRA_INGEST_URL') ?: 'http://localhost:4001/v1';
$apiKey = getenv('GRA_API_KEY') ?: 'gra_sandbox_op001_devkey0001';
$hmacSecret = getenv('GRA_HMAC_SECRET') ?: 'sandbox_hmac_op001_secret_32chars_min';
$filePath = $argv[1] ?? '/tmp/gra-test-doc.txt';

if (!is_readable($filePath)) {
    fwrite(STDERR, "File not readable: {$filePath}\n");
    exit(1);
}

// Multipart uploads sign an empty body (see docs/API.md).
$signature = hash_hmac('sha256', '', $hmacSecret);
$idempotencyKey = 'doc-op-001-' . time();

$ch = curl_init($baseUrl . '/documents');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'X-Api-Key: ' . $apiKey,
        'X-Signature: ' . $signature,
        'X-Idempotency-Key: ' . $idempotencyKey,
    ],
    CURLOPT_POSTFIELDS => [
        'file' => new CURLFile($filePath),
        'title' => 'Ingest test upload',
        'document_type' => 'other',
    ],
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP $status\n";
echo $response . "\n";
