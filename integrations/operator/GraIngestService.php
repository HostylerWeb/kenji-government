<?php

/**
 * GRA regulatory ingest client for licensed operator platforms.
 *
 * Copy into your operator app, e.g. `app/Services/GraIngestService.php`
 * (CodeIgniter 4). First pilot deployment used `/var/www/byanydream` on the VPS;
 * any raffle operator using the same ingest contract can use this class.
 *
 * Env (.env):
 *   GRA_INGEST_ENABLED=true
 *   GRA_INGEST_URL=http://localhost:4001/v1
 *   Production: GRA_INGEST_URL=https://ingest.force42.com/v1
 *   GRA_API_KEY=gra_sandbox_op001_devkey0001
 *   GRA_HMAC_SECRET=sandbox_hmac_op001_secret_32chars_min
 *   GRA_OPERATOR_EXTERNAL_ID=op-001
 */

namespace App\Services;

use App\Models\CompetitionModel;
use App\Models\OrderItemModel;
use App\Models\OrderModel;
use App\Models\PaymentModel;
use App\Models\SiteSettingModel;
use App\Models\TicketModel;

class GraIngestService
{
    protected bool $enabled;
    protected string $baseUrl;
    protected string $apiKey;
    protected string $hmacSecret;

    public function __construct()
    {
        $flag = strtolower((string) env('GRA_INGEST_ENABLED', '0'));
        $this->enabled = $flag === '1' || $flag === 'true' || $flag === 'yes';
        $this->baseUrl = rtrim((string) env('GRA_INGEST_URL', ''), '/');
        $this->apiKey = (string) env('GRA_API_KEY', '');
        $this->hmacSecret = (string) env('GRA_HMAC_SECRET', '');
    }

    public function isConfigured(): bool
    {
        return $this->enabled
            && $this->baseUrl !== ''
            && $this->apiKey !== ''
            && $this->hmacSecret !== '';
    }

    /**
     * Emit payment + ticket purchased events for a completed order.
     */
    public function emitOrderCompleted(int $orderId): void
    {
        if (!$this->isConfigured()) {
            return;
        }

        $orderModel = new OrderModel();
        $order = $orderModel->find($orderId);

        if (!$order || ($order['status'] ?? '') !== 'completed') {
            return;
        }

        if ($this->isWalletTopupOrder($order)) {
            return;
        }

        $currency = $this->getCurrency();
        $paymentModel = new PaymentModel();
        $payment = $paymentModel->where('order_id', $orderId)
            ->orderBy('id', 'DESC')
            ->first();

        $paymentMethod = $order['payment_method']
            ?? ($payment['payment_method'] ?? 'unknown');
        $transactionId = $order['transaction_id']
            ?? ($payment['transaction_id'] ?? 'order-' . $orderId);
        $amount = floatval($order['total'] ?? 0);

        $this->postJson(
            'events/payment',
            [
                'action' => 'completed',
                'payment_id' => 'pay-order-' . $orderId,
                'amount' => $amount,
                'currency' => $currency,
                'method' => $paymentMethod,
                'reference' => $transactionId,
                'occurred_at' => date('c'),
            ],
            'gra-payment-order-' . $orderId,
        );

        $ticketModel = new TicketModel();
        $tickets = $ticketModel->where('order_id', $orderId)
            ->where('status', 'purchased')
            ->findAll();

        if (empty($tickets)) {
            log_message('warning', "[GRA Ingest] Order {$orderId} completed but no purchased tickets found.");
            return;
        }

        $competitionModel = new CompetitionModel();
        $orderItemModel = new OrderItemModel();
        $orderItems = $orderItemModel->getOrderItemsWithDetails($orderId);
        $unitPrices = [];

        foreach ($orderItems as $item) {
            $unitPrices[(int) $item['competition_id']] = floatval(
                $item['unit_price'] ?? ($item['total'] / max(1, (int) $item['ticket_quantity']))
            );
        }

        foreach ($tickets as $ticket) {
            $competitionId = (int) ($ticket['competition_id'] ?? 0);
            $competition = $competitionId > 0 ? $competitionModel->find($competitionId) : null;
            $ticketAmount = floatval(
                $ticket['purchase_price']
                    ?? ($unitPrices[$competitionId] ?? ($competition['ticket_price'] ?? 0))
            );
            $ticketRef = !empty($ticket['ticket_number'])
                ? 'TKT-' . $ticket['ticket_number']
                : 'TKT-' . $ticket['id'];

            $this->postJson(
                'events/ticket',
                [
                    'action' => 'purchased',
                    'ticket_id' => $ticketRef,
                    'raffle_id' => 'comp-' . $competitionId,
                    'raffle_name' => $competition['title'] ?? 'Competition',
                    'amount' => $ticketAmount,
                    'currency' => $currency,
                    'purchased_at' => date('c'),
                ],
                'gra-ticket-' . $ticket['id'],
            );
        }

        log_message('info', "[GRA Ingest] Emitted live events for order {$orderId} (" . count($tickets) . ' tickets).');
    }

    /**
     * Emit payment failed event (CashFlows webhook failures).
     */
    public function emitPaymentFailed(int $orderId, string $reason = ''): void
    {
        if (!$this->isConfigured()) {
            return;
        }

        $orderModel = new OrderModel();
        $order = $orderModel->find($orderId);
        if (!$order) {
            return;
        }

        $currency = $this->getCurrency();
        $amount = floatval($order['total'] ?? 0);

        $this->postJson(
            'events/payment',
            [
                'action' => 'failed',
                'payment_id' => 'pay-failed-order-' . $orderId,
                'amount' => $amount,
                'currency' => $currency,
                'method' => $order['payment_method'] ?? 'unknown',
                'reference' => $reason !== '' ? $reason : 'payment_failed',
                'occurred_at' => date('c'),
            ],
            'gra-payment-failed-order-' . $orderId,
        );
    }

    protected function isWalletTopupOrder(array $order): bool
    {
        if (empty($order['data'])) {
            return false;
        }

        $orderData = json_decode($order['data'], true);
        if (!is_array($orderData)) {
            return false;
        }

        return (isset($orderData['is_wallet_topup']) && $orderData['is_wallet_topup'] === true)
            || (isset($orderData['has_wallet_topups']) && $orderData['has_wallet_topups'] === true);
    }

    protected function getCurrency(): string
    {
        $siteSettingModel = new SiteSettingModel();
        $code = strtoupper((string) $siteSettingModel->getSettingValue('currency', 'KES'));
        $supported = ['KES', 'USD', 'EUR', 'GBP'];

        return in_array($code, $supported, true) ? $code : 'KES';
    }

    protected function postJson(string $path, array $payload, string $idempotencyKey): void
    {
        $url = $this->baseUrl . '/' . ltrim($path, '/');
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac('sha256', $body, $this->hmacSecret);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Api-Key: ' . $this->apiKey,
                'X-Signature: ' . $signature,
                'X-Idempotency-Key: ' . $idempotencyKey,
            ],
            CURLOPT_POSTFIELDS => $body,
        ]);

        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            log_message('error', "[GRA Ingest] CURL error for {$path}: {$error}");
            return;
        }

        if ($status < 200 || $status >= 300) {
            log_message(
                'error',
                "[GRA Ingest] HTTP {$status} for {$path}: " . substr((string) $response, 0, 300),
            );
            return;
        }

        log_message('debug', "[GRA Ingest] {$path} accepted (HTTP {$status}).");
    }

    /**
     * Emit Play Safe activation (anonymised — county only, no player IDs).
     */
    public function emitPlaySafeActivated(string $county, ?string $region = null): void
    {
        if (!$this->isConfigured()) {
            return;
        }

        $this->postJson(
            'events/player-safety',
            [
                'event_type' => 'play_safe',
                'county' => $county,
                'region' => $region,
                'occurred_at' => date('c'),
            ],
            'gra-play-safe-' . time() . '-' . bin2hex(random_bytes(4)),
        );
    }

    /**
     * Emit self-exclusion request (anonymised).
     */
    public function emitSelfExclusion(string $county, ?string $region = null): void
    {
        if (!$this->isConfigured()) {
            return;
        }

        $this->postJson(
            'events/player-safety',
            [
                'event_type' => 'self_exclusion',
                'county' => $county,
                'region' => $region,
                'occurred_at' => date('c'),
            ],
            'gra-self-exclusion-' . time() . '-' . bin2hex(random_bytes(4)),
        );
    }

    /**
     * Emit hourly session aggregate rollup (anonymised stake bands, no player IDs).
     */
    public function emitSessionAggregate(
        string $county,
        int $sessionCount,
        int $totalSessionMinutes,
        array $stakeBandDistribution,
        ?string $region = null,
        ?string $bucketStart = null
    ): void {
        if (!$this->isConfigured()) {
            return;
        }

        $bucket = $bucketStart ?? date('c', strtotime(date('Y-m-d H:00:00')));
        $bucketKey = preg_replace('/[^0-9]/', '', $bucket);

        $this->postJson(
            'events/session-aggregate',
            [
                'county' => $county,
                'region' => $region,
                'bucket_start' => $bucket,
                'session_count' => $sessionCount,
                'total_session_minutes' => $totalSessionMinutes,
                'stake_band_distribution' => $stakeBandDistribution,
            ],
            'gra-session-agg-' . $county . '-' . $bucketKey,
        );
    }
}
