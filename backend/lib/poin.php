<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

final class PoinException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $httpStatus = 400
    ) {
        parent::__construct($message);
    }
}

function poin_transaction(PDO $pdo, callable $callback): mixed
{
    $owned = !$pdo->inTransaction();

    if ($owned) {
        $pdo->beginTransaction();
    }

    try {
        $result = $callback();

        if ($owned) {
            $pdo->commit();
        }

        return $result;
    } catch (Throwable $exception) {
        if ($owned && $pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $exception;
    }
}

function poin_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

function poin_settings(PDO $pdo, string $storeId): array
{
    $stmt = $pdo->prepare(
        'SELECT store_id, point_value_rp, earn_rate_rp, expiry_days, is_active
         FROM point_settings
         WHERE store_id = ?
         LIMIT 1'
    );
    $stmt->execute([$storeId]);
    $settings = $stmt->fetch();

    if (!$settings || (int) $settings['is_active'] !== 1) {
        throw new PoinException(
            'NOT_FOUND',
            'Pengaturan poin toko tidak ditemukan atau tidak aktif.',
            404
        );
    }

    return $settings;
}

function poin_account(PDO $pdo, string $storeId, string $buyerUserId, bool $forUpdate = false): array
{
    $stmt = $pdo->prepare(
        'INSERT INTO point_accounts (store_id, buyer_user_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE point_account_id = point_account_id'
    );
    $stmt->execute([$storeId, $buyerUserId]);

    $sql = 'SELECT point_account_id, store_id, buyer_user_id, balance,
                   reserved_balance, lifetime_earned, lifetime_redeemed
            FROM point_accounts
            WHERE store_id = ? AND buyer_user_id = ?
            LIMIT 1';

    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$storeId, $buyerUserId]);
    $account = $stmt->fetch();

    if (!$account) {
        throw new PoinException('SERVER_ERROR', 'Akun poin gagal dibuat.', 500);
    }

    return $account;
}

function poin_saldo_data(array $account, array $settings): array
{
    $balance = (int) $account['balance'];
    $reservedBalance = (int) $account['reserved_balance'];

    return [
        'point_account_id'  => $account['point_account_id'],
        'store_id'          => $account['store_id'],
        'buyer_user_id'     => $account['buyer_user_id'],
        'balance'           => $balance,
        'reserved_balance'  => $reservedBalance,
        'available_balance' => $balance - $reservedBalance,
        'lifetime_earned'   => (int) $account['lifetime_earned'],
        'lifetime_redeemed' => (int) $account['lifetime_redeemed'],
        'point_value_rp'    => (int) $settings['point_value_rp'],
        'earn_rate_rp'      => (int) $settings['earn_rate_rp'],
    ];
}

function saldoPoin(PDO $pdo, string $storeId, string $buyerUserId): array
{
    $settings = poin_settings($pdo, $storeId);
    $account = poin_account($pdo, $storeId, $buyerUserId);

    return poin_saldo_data($account, $settings);
}

function poin_validasi_order(
    PDO $pdo,
    string $storeId,
    string $buyerUserId,
    string $orderId,
    string $pointAccountId
): void {
    $stmt = $pdo->prepare(
        'SELECT order_id, store_id, buyer_user_id, status
         FROM orders
         WHERE order_id = ?
         LIMIT 1
         FOR UPDATE'
    );
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();

    if (
        !$order
        || $order['store_id'] !== $storeId
        || $order['buyer_user_id'] !== $buyerUserId
    ) {
        throw new PoinException('NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
    }

    if ($order['status'] !== 'completed') {
        throw new PoinException(
            'CONFLICT',
            'Poin hanya dapat diberikan untuk pesanan yang sudah selesai.',
            409
        );
    }

    $stmt = $pdo->prepare(
        "SELECT point_tx_id
         FROM point_transactions
         WHERE point_account_id = ? AND order_id = ? AND type = 'earn'
         LIMIT 1"
    );
    $stmt->execute([$pointAccountId, $orderId]);

    if ($stmt->fetchColumn()) {
        throw new PoinException(
            'CONFLICT',
            'Poin untuk pesanan ini sudah diberikan.',
            409
        );
    }
}

function tambahPoin(
    PDO $pdo,
    string $storeId,
    string $buyerUserId,
    int $points,
    ?string $orderId = null,
    ?string $referenceId = null
): array {
    if ($points <= 0) {
        throw new PoinException('VALIDATION_ERROR', 'Jumlah poin harus lebih dari 0.', 400);
    }

    return poin_transaction(
        $pdo,
        static function () use ($pdo, $storeId, $buyerUserId, $points, $orderId, $referenceId): array {
            $settings = poin_settings($pdo, $storeId);
            $account = poin_account($pdo, $storeId, $buyerUserId, true);

            if ($orderId !== null) {
                poin_validasi_order(
                    $pdo,
                    $storeId,
                    $buyerUserId,
                    $orderId,
                    $account['point_account_id']
                );
            }

            $balance = (int) $account['balance'];
            $newBalance = $balance + $points;
            $pointAccountId = $account['point_account_id'];
            $pointTxId = poin_uuid();

            $stmt = $pdo->prepare(
                'UPDATE point_accounts
                 SET balance = ?, lifetime_earned = lifetime_earned + ?
                 WHERE point_account_id = ?'
            );
            $stmt->execute([$newBalance, $points, $pointAccountId]);

            $stmt = $pdo->prepare(
                "INSERT INTO point_transactions
                    (point_tx_id, point_account_id, store_id, order_id, type,
                     points, balance_after, reference_id)
                 VALUES (?, ?, ?, ?, 'earn', ?, ?, ?)"
            );
            $stmt->execute([
                $pointTxId,
                $pointAccountId,
                $storeId,
                $orderId,
                $points,
                $newBalance,
                $referenceId ?? $orderId,
            ]);

            $pointValue = (int) $settings['point_value_rp'];
            $reservedAmount = $points * $pointValue;

            $stmt = $pdo->prepare(
                "INSERT INTO point_liabilities
                    (liability_id, store_id, point_tx_id, points, point_value_rp,
                     reserved_amount, remaining_amount, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'reserved')"
            );
            $stmt->execute([
                poin_uuid(),
                $storeId,
                $pointTxId,
                $points,
                $pointValue,
                $reservedAmount,
                $reservedAmount,
            ]);

            return [
                'point_tx_id'      => $pointTxId,
                'points_earned'    => $points,
                'balance_after'    => $newBalance,
                'balance'          => $newBalance,
                'reserved_balance' => (int) $account['reserved_balance'],
                'available_balance' => $newBalance - (int) $account['reserved_balance'],
            ];
        }
    );
}

function tukarPoin(
    PDO $pdo,
    string $storeId,
    string $buyerUserId,
    int $points,
    ?string $referenceId = null
): array {
    if ($points <= 0) {
        throw new PoinException('VALIDATION_ERROR', 'Jumlah poin harus lebih dari 0.', 400);
    }

    return poin_transaction(
        $pdo,
        static function () use ($pdo, $storeId, $buyerUserId, $points, $referenceId): array {
            poin_settings($pdo, $storeId);
            $account = poin_account($pdo, $storeId, $buyerUserId, true);
            $pointAccountId = $account['point_account_id'];

            if ($referenceId !== null) {
                $stmt = $pdo->prepare(
                    "SELECT point_tx_id
                     FROM point_transactions
                     WHERE point_account_id = ?
                       AND type = 'reserve'
                       AND reference_id = ?
                     LIMIT 1"
                );
                $stmt->execute([$pointAccountId, $referenceId]);

                if ($stmt->fetchColumn()) {
                    throw new PoinException(
                        'CONFLICT',
                        'Penukaran poin ini sudah diproses.',
                        409
                    );
                }
            }

            $balance = (int) $account['balance'];
            $reservedBalance = (int) $account['reserved_balance'];
            $availableBalance = $balance - $reservedBalance;

            if ($points > $availableBalance) {
                throw new PoinException(
                    'INSUFFICIENT_POINTS',
                    'Saldo poin tidak cukup.',
                    409
                );
            }

            $newReservedBalance = $reservedBalance + $points;
            $newAvailableBalance = $balance - $newReservedBalance;
            $pointTxId = poin_uuid();

            $stmt = $pdo->prepare(
                'UPDATE point_accounts
                 SET reserved_balance = ?
                 WHERE point_account_id = ?'
            );
            $stmt->execute([$newReservedBalance, $pointAccountId]);

            $stmt = $pdo->prepare(
                "INSERT INTO point_transactions
                    (point_tx_id, point_account_id, store_id, order_id, type,
                     points, balance_after, reference_id)
                 VALUES (?, ?, ?, NULL, 'reserve', ?, ?, ?)"
            );
            $stmt->execute([
                $pointTxId,
                $pointAccountId,
                $storeId,
                -$points,
                $balance,
                $referenceId,
            ]);

            return [
                'point_tx_id'       => $pointTxId,
                'points_reserved'   => $points,
                'points_used'       => $points,
                'balance_after'     => $newAvailableBalance,
                'balance'           => $balance,
                'reserved_balance'  => $newReservedBalance,
                'available_balance' => $newAvailableBalance,
            ];
        }
    );
}

function poin_iso(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    $timezone = new DateTimeZone('Asia/Jakarta');
    $date = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value, $timezone);

    if (!$date) {
        return $value;
    }

    return $date->format(DateTimeInterface::ATOM);
}

function poin_earn_order(PDO $pdo, string $storeId, string $orderId): array
{
    return poin_transaction(
        $pdo,
        static function () use ($pdo, $storeId, $orderId): array {
            $stmt = $pdo->prepare(
                'SELECT order_id, store_id, buyer_user_id, status, total_amount, points_earned
                 FROM orders
                 WHERE order_id = ?
                 LIMIT 1
                 FOR UPDATE'
            );
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();

            if (!$order || $order['store_id'] !== $storeId) {
                throw new PoinException('NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
            }

            if ($order['status'] !== 'completed') {
                throw new PoinException(
                    'CONFLICT',
                    'Poin hanya dapat diberikan untuk pesanan yang sudah selesai.',
                    409
                );
            }

            if ((int) $order['points_earned'] > 0) {
                throw new PoinException(
                    'CONFLICT',
                    'Poin untuk pesanan ini sudah diberikan.',
                    409
                );
            }

            $settings = poin_settings($pdo, $storeId);
            $earnRate = (int) $settings['earn_rate_rp'];
            $points = intdiv((int) $order['total_amount'], $earnRate);

            if ($points <= 0) {
                throw new PoinException(
                    'VALIDATION_ERROR',
                    'Pesanan ini belum memenuhi syarat perolehan poin.',
                    400
                );
            }

            $result = tambahPoin(
                $pdo,
                $storeId,
                $order['buyer_user_id'],
                $points,
                $orderId,
                $orderId
            );

            $stmt = $pdo->prepare(
                'UPDATE orders SET points_earned = ? WHERE order_id = ?'
            );
            $stmt->execute([$points, $orderId]);

            return [
                'point_tx_id'   => $result['point_tx_id'],
                'points_earned' => $points,
                'balance_after' => $result['balance_after'],
            ];
        }
    );
}

function poin_history(
    PDO $pdo,
    string $storeId,
    string $buyerUserId,
    int $page = 1,
    int $perPage = 20
): array {
    poin_settings($pdo, $storeId);
    $account = poin_account($pdo, $storeId, $buyerUserId);
    $pointAccountId = $account['point_account_id'];
    $offset = ($page - 1) * $perPage;

    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM point_transactions
         WHERE point_account_id = ?'
    );
    $stmt->execute([$pointAccountId]);
    $total = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT point_tx_id, type, points, balance_after, order_id, reference_id, created_at
         FROM point_transactions
         WHERE point_account_id = ?
         ORDER BY created_at DESC, point_tx_id DESC
         LIMIT ? OFFSET ?'
    );
    $stmt->bindValue(1, $pointAccountId);
    $stmt->bindValue(2, $perPage, PDO::PARAM_INT);
    $stmt->bindValue(3, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $items = array_map(
        static fn (array $row): array => [
            'point_tx_id'  => $row['point_tx_id'],
            'type'         => $row['type'],
            'points'       => (int) $row['points'],
            'balance_after' => (int) $row['balance_after'],
            'order_id'     => $row['order_id'],
            'reference_id' => $row['reference_id'],
            'created_at'   => poin_iso($row['created_at']),
        ],
        $rows
    );

    return [
        'items'      => $items,
        'pagination' => [
            'page'        => $page,
            'per_page'    => $perPage,
            'total'       => $total,
            'total_pages' => $total > 0 ? (int) ceil($total / $perPage) : 0,
        ],
    ];
}

function poin_rewards(PDO $pdo, string $storeId): array
{
    $now = (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))
        ->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare(
        "SELECT reward_id, name, points_required, cash_addon, quota,
                per_buyer_limit, starts_at, ends_at, status
         FROM reward_products
         WHERE store_id = ?
           AND status = 'active'
           AND (starts_at IS NULL OR starts_at <= ?)
           AND (ends_at IS NULL OR ends_at >= ?)
         ORDER BY points_required ASC, name ASC"
    );
    $stmt->execute([$storeId, $now, $now]);

    return array_map(
        static fn (array $row): array => [
            'reward_id'       => $row['reward_id'],
            'name'            => $row['name'],
            'points_required' => (int) $row['points_required'],
            'cash_addon'      => (int) $row['cash_addon'],
            'quota'           => (int) $row['quota'],
            'per_buyer_limit' => (int) $row['per_buyer_limit'],
            'starts_at'       => poin_iso($row['starts_at']),
            'ends_at'         => poin_iso($row['ends_at']),
            'status'          => $row['status'],
        ],
        $stmt->fetchAll()
    );
}

function poin_redeem(
    PDO $pdo,
    string $storeId,
    string $rewardId,
    string $buyerUserId,
    int $quantity = 1
): array {
    if ($quantity <= 0) {
        throw new PoinException('VALIDATION_ERROR', 'Jumlah penukaran harus lebih dari 0.', 400);
    }

    return poin_transaction(
        $pdo,
        static function () use ($pdo, $storeId, $rewardId, $buyerUserId, $quantity): array {
            $stmt = $pdo->prepare(
                'SELECT reward_id, store_id, points_required, cash_addon, quota,
                        per_buyer_limit, starts_at, ends_at, status
                 FROM reward_products
                 WHERE reward_id = ?
                 LIMIT 1
                 FOR UPDATE'
            );
            $stmt->execute([$rewardId]);
            $reward = $stmt->fetch();

            if (!$reward || $reward['store_id'] !== $storeId || $reward['status'] !== 'active') {
                throw new PoinException('NOT_FOUND', 'Reward tidak ditemukan.', 404);
            }

            $now = (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))
                ->format('Y-m-d H:i:s');

            if (
                ($reward['starts_at'] !== null && $now < $reward['starts_at'])
                || ($reward['ends_at'] !== null && $now > $reward['ends_at'])
            ) {
                throw new PoinException(
                    'CONFLICT',
                    'Reward sedang tidak berlaku.',
                    409
                );
            }

            $quota = (int) $reward['quota'];

            if ($quota > 0) {
                $stmt = $pdo->prepare(
                    "SELECT COUNT(*)
                     FROM point_redemptions
                     WHERE reward_id = ?
                       AND status IN ('pending', 'approved', 'completed')"
                );
                $stmt->execute([$rewardId]);
                $usedQuota = (int) $stmt->fetchColumn();

                if ($usedQuota + $quantity > $quota) {
                    throw new PoinException(
                        'CONFLICT',
                        'Kuota reward tidak mencukupi.',
                        409
                    );
                }
            }

            $perBuyerLimit = (int) $reward['per_buyer_limit'];

            if ($perBuyerLimit > 0) {
                $stmt = $pdo->prepare(
                    "SELECT COUNT(*)
                     FROM point_redemptions
                     WHERE reward_id = ?
                       AND buyer_user_id = ?
                       AND status IN ('pending', 'approved', 'completed')"
                );
                $stmt->execute([$rewardId, $buyerUserId]);
                $usedByBuyer = (int) $stmt->fetchColumn();

                if ($usedByBuyer + $quantity > $perBuyerLimit) {
                    throw new PoinException(
                        'CONFLICT',
                        'Batas penukaran reward untuk pembeli ini sudah tercapai.',
                        409
                    );
                }
            }

            $pointsUsed = (int) $reward['points_required'] * $quantity;
            $cashAddon = (int) $reward['cash_addon'] * $quantity;
            $redemptionId = poin_uuid();
            $reserve = tukarPoin($pdo, $storeId, $buyerUserId, $pointsUsed, $redemptionId);
            $account = poin_account($pdo, $storeId, $buyerUserId);
            $createdAt = (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))
                ->format('Y-m-d H:i:s');

            $stmt = $pdo->prepare(
                "INSERT INTO point_redemptions
                    (redemption_id, store_id, reward_id, buyer_user_id, point_account_id,
                     points_used, cash_addon, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
            );
            $stmt->execute([
                $redemptionId,
                $storeId,
                $rewardId,
                $buyerUserId,
                $account['point_account_id'],
                $pointsUsed,
                $cashAddon,
                $createdAt,
            ]);

            return [
                'redemption_id' => $redemptionId,
                'points_used'   => $pointsUsed,
                'cash_addon'    => $cashAddon,
                'status'        => 'pending',
                'balance_after' => $reserve['balance_after'],
                'created_at'    => poin_iso($createdAt),
            ];
        }
    );
}
