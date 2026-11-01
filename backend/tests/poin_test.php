<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/poin.php';

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
$aryaId = '00000000-0000-4000-8000-000000000004';
$aryaCompletedOrderId = '90000000-0000-4000-8000-000000000001';
$buyerPendingOrderId = '90000000-0000-4000-8000-000000000002';

$aryaSaldo = saldoPoin($pdo, $storeId, $aryaId);
cek_sama(20, $aryaSaldo['balance'], 'saldo total Arya dari seed');
cek_sama(15, $aryaSaldo['reserved_balance'], 'saldo ditahan Arya dari seed');
cek_sama(5, $aryaSaldo['available_balance'], 'saldo tersedia Arya dari seed');
cek_sama(20, $aryaSaldo['lifetime_earned'], 'lifetime earned Arya dari seed');
cek_sama(0, $aryaSaldo['lifetime_redeemed'], 'lifetime redeemed Arya dari seed');

$saldoAwal = saldoPoin($pdo, $storeId, $buyerId);
$accountId = $saldoAwal['point_account_id'];

$pdo->beginTransaction();
$pdo->prepare('DELETE FROM point_transactions WHERE point_account_id = ?')
    ->execute([$accountId]);
$pdo->prepare(
    'UPDATE point_accounts
     SET balance = 0, reserved_balance = 0, lifetime_earned = 0, lifetime_redeemed = 0
     WHERE point_account_id = ?'
)->execute([$accountId]);
$pdo->commit();

$saldoAwal = saldoPoin($pdo, $storeId, $buyerId);
cek_sama(0, $saldoAwal['balance'], 'saldo awal pembeli uji');
cek_sama(0, $saldoAwal['reserved_balance'], 'reserved awal pembeli uji');
cek_sama(0, $saldoAwal['available_balance'], 'available awal pembeli uji');

cek_poin_exception(
    static fn () => tambahPoin($pdo, $storeId, $buyerId, 10, $buyerPendingOrderId),
    'CONFLICT',
    'earn dari pesanan pending ditolak'
);

$earn = tambahPoin($pdo, $storeId, $buyerId, 20, null, 'c1-test-earn');
cek_sama(20, $earn['points_earned'], 'poin earn');
cek_sama(20, $earn['balance_after'], 'balance setelah earn');
cek_sama(0, $earn['reserved_balance'], 'reserved setelah earn');
cek_sama(20, $earn['available_balance'], 'available setelah earn');

$stmt = $pdo->prepare(
    'SELECT type, points, balance_after
     FROM point_transactions
     WHERE point_tx_id = ?'
);
$stmt->execute([$earn['point_tx_id']]);
$earnTx = $stmt->fetch();
cek_sama('earn', $earnTx['type'], 'tipe ledger earn');
cek_sama(20, (int) $earnTx['points'], 'poin ledger earn');
cek_sama(20, (int) $earnTx['balance_after'], 'balance_after ledger earn');

$stmt = $pdo->prepare(
    'SELECT points, point_value_rp, reserved_amount, remaining_amount, status
     FROM point_liabilities
     WHERE point_tx_id = ?'
);
$stmt->execute([$earn['point_tx_id']]);
$liability = $stmt->fetch();
cek_sama(20, (int) $liability['points'], 'poin liabilitas');
cek_sama(100, (int) $liability['point_value_rp'], 'nilai poin liabilitas');
cek_sama(2000, (int) $liability['reserved_amount'], 'cadangan liabilitas');
cek_sama(2000, (int) $liability['remaining_amount'], 'sisa liabilitas');
cek_sama('reserved', $liability['status'], 'status liabilitas');

$saldoSetelahEarn = saldoPoin($pdo, $storeId, $buyerId);
cek_sama(20, $saldoSetelahEarn['balance'], 'saldo setelah earn');
cek_sama(0, $saldoSetelahEarn['reserved_balance'], 'reserved setelah earn');
cek_sama(20, $saldoSetelahEarn['available_balance'], 'available setelah earn');
cek_sama(20, $saldoSetelahEarn['lifetime_earned'], 'lifetime earned setelah earn');

$reserve = tukarPoin($pdo, $storeId, $buyerId, 15, 'c1-test-reserve');
cek_sama(15, $reserve['points_reserved'], 'poin ditahan');
cek_sama(5, $reserve['balance_after'], 'available setelah reserve');
cek_sama(20, $reserve['balance'], 'balance total setelah reserve');
cek_sama(15, $reserve['reserved_balance'], 'reserved setelah reserve');
cek_sama(5, $reserve['available_balance'], 'available setelah reserve');

$stmt = $pdo->prepare(
    'SELECT type, points, balance_after
     FROM point_transactions
     WHERE point_tx_id = ?'
);
$stmt->execute([$reserve['point_tx_id']]);
$reserveTx = $stmt->fetch();
cek_sama('reserve', $reserveTx['type'], 'tipe ledger reserve');
cek_sama(-15, (int) $reserveTx['points'], 'poin ledger reserve');
cek_sama(20, (int) $reserveTx['balance_after'], 'balance_after ledger reserve');

$saldoSetelahReserve = saldoPoin($pdo, $storeId, $buyerId);
cek_sama(20, $saldoSetelahReserve['balance'], 'saldo setelah reserve');
cek_sama(15, $saldoSetelahReserve['reserved_balance'], 'reserved setelah reserve');
cek_sama(5, $saldoSetelahReserve['available_balance'], 'available setelah reserve');

cek_poin_exception(
    static fn () => tukarPoin($pdo, $storeId, $buyerId, 1, 'c1-test-reserve'),
    'CONFLICT',
    'referensi reserve ganda ditolak'
);

cek_poin_exception(
    static fn () => tukarPoin($pdo, $storeId, $buyerId, 10, 'c1-test-insufficient'),
    'INSUFFICIENT_POINTS',
    'tukar melebihi saldo tersedia ditolak'
);

$stmt = $pdo->prepare(
    "SELECT COUNT(*)
     FROM point_transactions
     WHERE point_account_id = ? AND reference_id = 'c1-test-insufficient'"
);
$stmt->execute([$accountId]);
cek_sama(0, (int) $stmt->fetchColumn(), 'tidak ada ledger reserve gagal');

$saldoSetelahGagal = saldoPoin($pdo, $storeId, $buyerId);
cek_sama(20, $saldoSetelahGagal['balance'], 'saldo tidak berubah setelah gagal');
cek_sama(15, $saldoSetelahGagal['reserved_balance'], 'reserved tidak berubah setelah gagal');
cek_sama(5, $saldoSetelahGagal['available_balance'], 'available tidak berubah setelah gagal');

cek_poin_exception(
    static fn () => tambahPoin($pdo, $storeId, $buyerId, 0),
    'VALIDATION_ERROR',
    'poin nol ditolak'
);

cek_poin_exception(
    static fn () => tambahPoin($pdo, $storeId, $aryaId, 20, $aryaCompletedOrderId),
    'CONFLICT',
    'earn ganda untuk pesanan yang sama ditolak'
);

$aryaSaldoAkhir = saldoPoin($pdo, $storeId, $aryaId);
cek_sama(20, $aryaSaldoAkhir['balance'], 'saldo Arya tidak berubah setelah earn ganda');
cek_sama(15, $aryaSaldoAkhir['reserved_balance'], 'reserved Arya tidak berubah setelah earn ganda');

$pdo->beginTransaction();
$pdo->prepare('DELETE FROM point_transactions WHERE point_account_id = ?')
    ->execute([$accountId]);
$pdo->prepare(
    'UPDATE point_accounts
     SET balance = 0, reserved_balance = 0, lifetime_earned = 0, lifetime_redeemed = 0
     WHERE point_account_id = ?'
)->execute([$accountId]);
$pdo->commit();

echo "C1 OK.\n";
