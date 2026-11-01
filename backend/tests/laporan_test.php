<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/laporan.php';

function laporan_cek_sama(mixed $expected, mixed $actual, string $label): void
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

function laporan_cek_dekat(float $expected, float $actual, string $label): void
{
    if (abs($expected - $actual) > 0.001) {
        fwrite(
            STDERR,
            'GAGAL: ' . $label
            . ' (harusnya ' . $expected . ', didapat ' . $actual . ")\n"
        );
        exit(1);
    }
}

function laporan_cek_exception(callable $callback, string $expectedCode, string $label): void
{
    try {
        $callback();
    } catch (LaporanException $exception) {
        laporan_cek_sama($expectedCode, $exception->errorCode, $label);
        return;
    }

    fwrite(STDERR, 'GAGAL: ' . $label . " (tidak melempar LaporanException)\n");
    exit(1);
}

$pdo = db();

$storeId = '20000000-0000-4000-8000-000000000001';
$store2Id = '20000000-0000-4000-8000-000000000002';

$pdo->prepare(
    'DELETE FROM monthly_reports
     WHERE store_id IN (?, ?) AND period_year = 2026 AND period_month = 1'
)->execute([$storeId, $store2Id]);

$laporan = laporanBulanan($pdo, $storeId, 2026, 1, false);

laporan_cek_sama('Januari 2026', $laporan['period']['label'], 'label periode');
laporan_cek_sama(2026, $laporan['period']['year'], 'tahun periode');
laporan_cek_sama(1, $laporan['period']['month'], 'bulan periode');
laporan_cek_sama(45000, $laporan['summary']['gross_revenue'], 'omzet');
laporan_cek_sama(5000, $laporan['summary']['discounts'], 'diskon');
laporan_cek_sama(40000, $laporan['summary']['net_revenue'], 'pendapatan bersih');
laporan_cek_sama(26500, $laporan['summary']['hpp'], 'hpp');
laporan_cek_sama(13500, $laporan['summary']['gross_profit'], 'laba kotor');
laporan_cek_sama(2000000, $laporan['summary']['operating_expenses'], 'biaya operasional');
laporan_cek_sama(2000, $laporan['summary']['promo_costs'], 'biaya promo poin');
laporan_cek_sama(-1988500, $laporan['summary']['net_profit'], 'laba bersih');
laporan_cek_dekat(-4971.25, $laporan['summary']['net_margin'], 'margin bersih');

laporan_cek_sama(2, count($laporan['top_products']), 'jumlah produk terlaris');
laporan_cek_sama('Teh Melati Botol', $laporan['top_products'][0]['product_name'], 'produk terlaris pertama');
laporan_cek_sama(3, $laporan['top_products'][0]['qty_sold'], 'qty produk terlaris pertama');
laporan_cek_sama(15000, $laporan['top_products'][0]['revenue'], 'omzet produk terlaris pertama');
laporan_cek_sama(7500, $laporan['top_products'][0]['profit'], 'laba produk terlaris pertama');
laporan_cek_sama('Risoles Frozen', $laporan['top_products'][1]['product_name'], 'produk terlaris kedua');
laporan_cek_sama(2, $laporan['top_products'][1]['qty_sold'], 'qty produk terlaris kedua');
laporan_cek_sama(30000, $laporan['top_products'][1]['revenue'], 'omzet produk terlaris kedua');
laporan_cek_sama(11000, $laporan['top_products'][1]['profit'], 'laba produk terlaris kedua');

laporan_cek_sama(4, count($laporan['expenses']), 'jumlah pengeluaran');
laporan_cek_sama('Sewa', $laporan['expenses'][0]['category'], 'kategori pengeluaran pertama');
laporan_cek_sama(1000000, $laporan['expenses'][0]['amount'], 'nominal pengeluaran pertama');
laporan_cek_sama('Gaji', $laporan['expenses'][3]['category'], 'kategori pengeluaran terakhir');
laporan_cek_sama(500000, $laporan['expenses'][3]['amount'], 'nominal pengeluaran terakhir');

if (!is_string($laporan['generated_at'])
    || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/', $laporan['generated_at'])) {
    fwrite(STDERR, "GAGAL: generated_at bukan ISO-8601 +07:00\n");
    exit(1);
}

$laporanTersimpan = laporanBulanan($pdo, $storeId, 2026, 1, false);
laporan_cek_sama(
    $laporan['generated_at'],
    $laporanTersimpan['generated_at'],
    'refresh=false memakai snapshot tersimpan'
);
laporan_cek_sama(45000, $laporanTersimpan['summary']['gross_revenue'], 'omzet snapshot');

$laporanRefresh = laporanBulanan($pdo, $storeId, 2026, 1, true);
laporan_cek_sama(45000, $laporanRefresh['summary']['gross_revenue'], 'omzet setelah refresh');

$stmt = $pdo->prepare(
    'SELECT COUNT(*) FROM monthly_reports
     WHERE store_id = ? AND period_year = 2026 AND period_month = 1'
);
$stmt->execute([$storeId]);
laporan_cek_sama(1, (int) $stmt->fetchColumn(), 'laporan bulanan tidak duplikat');

$laporanToko2 = laporanBulanan($pdo, $store2Id, 2026, 1, true);
laporan_cek_sama(85000, $laporanToko2['summary']['gross_revenue'], 'omzet toko 2');
laporan_cek_sama(0, $laporanToko2['summary']['discounts'], 'diskon toko 2');
laporan_cek_sama(85000, $laporanToko2['summary']['net_revenue'], 'pendapatan bersih toko 2');
laporan_cek_sama(55000, $laporanToko2['summary']['hpp'], 'hpp toko 2');
laporan_cek_sama(30000, $laporanToko2['summary']['gross_profit'], 'laba kotor toko 2');
laporan_cek_sama(500000, $laporanToko2['summary']['operating_expenses'], 'biaya operasional toko 2');
laporan_cek_sama(4200, $laporanToko2['summary']['promo_costs'], 'biaya promo toko 2');
laporan_cek_sama(-474200, $laporanToko2['summary']['net_profit'], 'laba bersih toko 2');
laporan_cek_dekat(-557.88, $laporanToko2['summary']['net_margin'], 'margin bersih toko 2');
laporan_cek_sama(1, count($laporanToko2['top_products']), 'jumlah produk terlaris toko 2');
laporan_cek_sama(
    'Tas Anyaman Pandan',
    $laporanToko2['top_products'][0]['product_name'],
    'produk terlaris toko 2'
);
laporan_cek_sama(30000, $laporanToko2['top_products'][0]['profit'], 'laba produk toko 2');

laporan_cek_exception(
    static fn () => laporanBulanan($pdo, $storeId, 2026, 13),
    'VALIDATION_ERROR',
    'bulan tidak valid ditolak'
);

echo "C2 OK.\n";
