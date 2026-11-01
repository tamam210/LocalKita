<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/poin.php';
require_once __DIR__ . '/../lib/laporan.php';

function cek_sama(mixed $expected, mixed $actual, string $label): void
{
    if ($expected !== $actual) {
        fwrite(
            STDERR,
            'GAGAL: ' . $label
            . ' (harusnya ' . var_export($expected, true)
            . ', didapat ' . var_export($actual, true) . ")\n"
        );
        exit(1);
    }
}

function cek_poin_exception(callable $callback, string $expectedCode, string $label): void
{
    try {
        $callback();
    } catch (PoinException $exception) {
        cek_sama($expectedCode, $exception->errorCode, $label);
        return;
    }

    fwrite(STDERR, 'GAGAL: ' . $label . " (tidak melempar PoinException)\n");
    exit(1);
}

$pdo = db();
$storeId = '20000000-0000-4000-8000-000000000001';
$buyerId = '00000000-0000-4000-8000-000000000005';
$highRewardId = '8c000000-0000-4000-8000-000000000001';
$earnedOrderId = '9c000000-0000-4000-8000-000000000001';

$account = poin_account($pdo, $storeId, $buyerId);
$accountId = $account['point_account_id'];
$saldoAwal = saldoPoin($pdo, $storeId, $buyerId);

$stmt = $pdo->prepare('SELECT COUNT(*) FROM point_transactions WHERE point_account_id = ?');
$stmt->execute([$accountId]);
$txAwal = (int) $stmt->fetchColumn();

$stmt = $pdo->prepare('SELECT COUNT(*) FROM point_redemptions WHERE store_id = ?');
$stmt->execute([$storeId]);
$redeemAwal = (int) $stmt->fetchColumn();

$stmt = $pdo->prepare('SELECT COUNT(*) FROM point_liabilities WHERE store_id = ?');
$stmt->execute([$storeId]);
$liabilityAwal = (int) $stmt->fetchColumn();

try {
    poin_transaction(
        $pdo,
        static function () use ($pdo, $accountId): void {
            $pdo->prepare(
                'UPDATE point_accounts SET balance = balance + 999 WHERE point_account_id = ?'
            )->execute([$accountId]);

            throw new RuntimeException('rollback poin dipaksa');
        }
    );
} catch (RuntimeException) {
}

$saldoSetelahRollback = saldoPoin($pdo, $storeId, $buyerId);
cek_sama($saldoAwal['balance'], $saldoSetelahRollback['balance'], 'balance tetap setelah rollback');
cek_sama(
    $saldoAwal['reserved_balance'],
    $saldoSetelahRollback['reserved_balance'],
    'reserved tetap setelah rollback'
);

cek_poin_exception(
    static fn () => poin_redeem($pdo, $storeId, $highRewardId, $buyerId, 1),
    'INSUFFICIENT_POINTS',
    'redeem gagal karena saldo kurang'
);

$saldoSetelahRedeemGagal = saldoPoin($pdo, $storeId, $buyerId);
cek_sama(
    $saldoAwal['balance'],
    $saldoSetelahRedeemGagal['balance'],
    'balance tetap setelah redeem gagal'
);
cek_sama(
    $saldoAwal['reserved_balance'],
    $saldoSetelahRedeemGagal['reserved_balance'],
    'reserved tetap setelah redeem gagal'
);

$stmt = $pdo->prepare('SELECT COUNT(*) FROM point_transactions WHERE point_account_id = ?');
$stmt->execute([$accountId]);
cek_sama($txAwal, (int) $stmt->fetchColumn(), 'ledger tidak bertambah setelah redeem gagal');

$stmt = $pdo->prepare('SELECT COUNT(*) FROM point_redemptions WHERE store_id = ?');
$stmt->execute([$storeId]);
cek_sama($redeemAwal, (int) $stmt->fetchColumn(), 'redemption tidak bertambah setelah gagal');

$stmt = $pdo->prepare('SELECT COUNT(*) FROM point_liabilities WHERE store_id = ?');
$stmt->execute([$storeId]);
cek_sama($liabilityAwal, (int) $stmt->fetchColumn(), 'liability tidak bertambah setelah gagal');

cek_poin_exception(
    static fn () => poin_earn_order($pdo, $storeId, $earnedOrderId),
    'CONFLICT',
    'earn ganda gagal'
);

$stmt = $pdo->prepare('SELECT COUNT(*) FROM point_transactions WHERE point_account_id = ?');
$stmt->execute([$accountId]);
cek_sama($txAwal, (int) $stmt->fetchColumn(), 'ledger tidak bertambah setelah earn ganda');

$stmt = $pdo->prepare(
    'SELECT net_profit FROM monthly_reports WHERE store_id = ? AND period_year = 2026 AND period_month = 1'
);
$stmt->execute([$storeId]);
$netProfitAwal = (int) $stmt->fetchColumn();

try {
    laporan_transaction(
        $pdo,
        static function () use ($pdo, $storeId): void {
            $pdo->prepare(
                'UPDATE monthly_reports SET net_profit = 123
                 WHERE store_id = ? AND period_year = 2026 AND period_month = 1'
            )->execute([$storeId]);

            throw new RuntimeException('rollback laporan dipaksa');
        }
    );
} catch (RuntimeException) {
}

$stmt = $pdo->prepare(
    'SELECT net_profit FROM monthly_reports WHERE store_id = ? AND period_year = 2026 AND period_month = 1'
);
$stmt->execute([$storeId]);
cek_sama($netProfitAwal, (int) $stmt->fetchColumn(), 'laporan tetap setelah rollback');

echo "C7 OK.\n";
