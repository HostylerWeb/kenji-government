<?php

/**
 * Raffle operator client for the payment gateway (Harambe Pay).
 *
 * Operators charge ticket purchases through the gateway — not GRA directly.
 * Copy to operator app, e.g. `app/Services/HarambePayGatewayClient.php`
 *
 * Env:
 *   HARAMBE_PAY_URL=https://pay.<domain>/v1   (payment gateway project)
 *   HARAMBE_PAY_API_KEY=...
 *   HARAMBE_PAY_HMAC_SECRET=...
 *
 * Dev: run tools/gateway-simulator/simulate-charge.sh instead of calling GRA ingest.
 */

namespace App\Services;

class HarambePayGatewayClient
{
    private string $baseUrl;
    private string $apiKey;
    private string $hmacSecret;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) env('HARAMBE_PAY_URL', ''), '/');
        $this->apiKey = (string) env('HARAMBE_PAY_API_KEY', '');
        $this->hmacSecret = (string) env('HARAMBE_PAY_HMAC_SECRET', '');
    }

    public function isConfigured(): bool
    {
        return $this->baseUrl !== '' && $this->apiKey !== '' && $this->hmacSecret !== '';
    }

    /**
     * Charge a ticket purchase via the payment gateway.
     *
     * @return array{accepted:bool,message:string,...}
     */
    public function charge(
        float $amount,
        string $cardNumber,
        ?string $ticketReference = null,
        ?string $outcome = null
    ): array {
        $body = [
            'amount' => $amount,
            'currency' => 'KES',
            'card_number' => $cardNumber,
        ];
        if ($ticketReference !== null) {
            $body['ticket_reference'] = $ticketReference;
        }
        if ($outcome !== null) {
            $body['outcome'] = $outcome;
        }

        return $this->post('/charge', $body);
    }

    public function status(): array
    {
        return $this->get('/health');
    }

    private function post(string $path, array $body): array
    {
        $json = json_encode($body, JSON_THROW_ON_ERROR);
        $idempotencyKey = 'hpay-' . bin2hex(random_bytes(16));
        $signature = hash_hmac('sha256', $json, $this->hmacSecret);

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Api-Key: ' . $this->apiKey,
                'X-Signature: ' . $signature,
                'X-Idempotency-Key: ' . $idempotencyKey,
            ],
        ]);

        $response = curl_exec($ch);
        if ($response === false) {
            throw new \RuntimeException('Gateway request failed: ' . curl_error($ch));
        }
        curl_close($ch);

        return json_decode($response, true, 512, JSON_THROW_ON_ERROR);
    }

    private function get(string $path): array
    {
        $idempotencyKey = 'hpay-status-' . bin2hex(random_bytes(8));
        $signature = hash_hmac('sha256', '', $this->hmacSecret);

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'X-Api-Key: ' . $this->apiKey,
                'X-Signature: ' . $signature,
                'X-Idempotency-Key: ' . $idempotencyKey,
            ],
        ]);

        $response = curl_exec($ch);
        if ($response === false) {
            throw new \RuntimeException('Gateway status failed: ' . curl_error($ch));
        }
        curl_close($ch);

        return json_decode($response, true, 512, JSON_THROW_ON_ERROR);
    }
}
