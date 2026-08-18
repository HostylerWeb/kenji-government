#!/usr/bin/env bash
# Example: hourly session aggregate cron for an operator server.
# Install: copy to operator cron, e.g. every hour at :05
#
#   5 * * * * /var/www/operator-app/scripts/gra-hourly-session-aggregate.sh
#
# Requires: php, curl, GRA_* env vars in operator .env or exported here.

set -euo pipefail

COUNTY="${GRA_OPERATOR_COUNTY:-Nairobi}"
REGION="${GRA_OPERATOR_REGION:-Central}"
SESSION_COUNT="${GRA_SESSION_COUNT:-100}"
MINUTES="${GRA_SESSION_MINUTES:-2400}"

export GRA_INGEST_URL="${GRA_INGEST_URL:-http://127.0.0.1:4001/v1}"
export GRA_API_KEY="${GRA_API_KEY:?Set GRA_API_KEY}"
export GRA_HMAC_SECRET="${GRA_HMAC_SECRET:?Set GRA_HMAC_SECRET}"

php -r "
\$base = getenv('GRA_INGEST_URL');
\$apiKey = getenv('GRA_API_KEY');
\$secret = getenv('GRA_HMAC_SECRET');
\$bucket = date('c', strtotime(date('Y-m-d H:00:00')));
\$payload = [
  'county' => getenv('GRA_OPERATOR_COUNTY') ?: 'Nairobi',
  'region' => getenv('GRA_OPERATOR_REGION') ?: 'Central',
  'bucket_start' => \$bucket,
  'session_count' => (int) (getenv('GRA_SESSION_COUNT') ?: 100),
  'total_session_minutes' => (int) (getenv('GRA_SESSION_MINUTES') ?: 2400),
  'stake_band_distribution' => ['0-50' => 30, '51-100' => 25, '101-250' => 20],
  'age_band_distribution' => ['18-24' => 20, '25-34' => 35, '35-44' => 25, '45-54' => 15, '55+' => 10],
];
\$body = json_encode(\$payload, JSON_UNESCAPED_SLASHES);
\$sig = hash_hmac('sha256', \$body, \$secret);
\$key = 'session-cron-' . preg_replace('/[^0-9]/', '', \$bucket);
\$ch = curl_init(rtrim(\$base, '/') . '/events/session-aggregate');
curl_setopt_array(\$ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'X-Api-Key: ' . \$apiKey,
    'X-Signature: ' . \$sig,
    'X-Idempotency-Key: ' . \$key,
  ],
  CURLOPT_POSTFIELDS => \$body,
]);
\$resp = curl_exec(\$ch);
\$code = curl_getinfo(\$ch, CURLINFO_HTTP_CODE);
curl_close(\$ch);
echo \"HTTP \$code \$resp\n\";
if (\$code < 200 || \$code >= 300) exit(1);
"
