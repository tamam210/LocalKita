<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/hpp.php';
require_once __DIR__ . '/../lib/diskon.php';

function cek_sama(mixed $expected, mixed $actual, string $label): void
{
    if (is_float($expected) || is_float($actual)) {
        if (abs((float)$expected - (float)$actual) > 0.001) {
            fwrite(STDERR, "GAGAL {$label}: expected " . var_export($expected, true) . ', got ' . var_export($actual, true) . PHP_EOL);
            exit(1);
        }
        return;
    }

    if ($expected !== $actual) {
        fwrite(STDERR, "GAGAL {$label}: expected " . var_export($expected, true) . ', got ' . var_export($actual, true) . PHP_EOL);
        exit(1);
    }
}

$hpp = hitungHppPhp([
    'unit_count' => 50,
    'material_cost' => 300000,
    'labor_cost' => 100000,
    'packaging_cost' => 50000,
    'overhead_cost' => 25000,
    'target_margin' => 0.30,
]);

cek_sama(475000, $hpp['total_cost'], 'hpp total_cost');
cek_sama(50, $hpp['unit_count'], 'hpp unit_count');
cek_sama(9500, $hpp['hpp_per_unit'], 'hpp per unit');
cek_sama(13600, $hpp['suggested_price'], 'hpp suggested price');
cek_sama(30.15, $hpp['margin_percent'], 'hpp margin');
cek_sama(43.16, $hpp['markup_percent'], 'hpp markup');
cek_sama('php', $hpp['engine'], 'hpp engine');

try {
    hitungHppPhp(['unit_count' => 0, 'target_margin' => 0.30]);
    fwrite(STDERR, "GAGAL hpp unit nol tidak ditolak" . PHP_EOL);
    exit(1);
} catch (InvalidArgumentException $e) {
}

$diskon = hitungDiskonPhp([
    'normal_price' => 15000,
    'discount_percent' => 20,
    'quantity' => 3,
    'additional_cost' => 0,
    'hpp_per_unit' => 9500,
    'target_margin_percent' => 30,
]);

cek_sama(3000, $diskon['discount_amount_per_unit'], 'diskon amount');
cek_sama(12000, $diskon['final_price_per_unit'], 'diskon final price');
cek_sama(36000, $diskon['total_revenue'], 'diskon revenue');
cek_sama(2500, $diskon['profit_per_unit'], 'diskon profit unit');
cek_sama(7500, $diskon['total_profit'], 'diskon total profit');
cek_sama(20.83, $diskon['margin_percent'], 'diskon margin');
cek_sama(36.67, $diskon['max_discount_percent_safe'], 'diskon max safe');
cek_sama(9.52, $diskon['max_discount_percent_target'], 'diskon max target');
cek_sama('below_target', $diskon['status'], 'diskon below target');

$diskonLoss = hitungDiskonPhp([
    'normal_price' => 15000,
    'discount_percent' => 40,
    'quantity' => 3,
    'hpp_per_unit' => 9500,
    'target_margin_percent' => 30,
]);
cek_sama(-500, $diskonLoss['profit_per_unit'], 'diskon loss unit');
cek_sama(-1500, $diskonLoss['total_profit'], 'diskon loss total');
cek_sama('loss', $diskonLoss['status'], 'diskon loss status');

$diskonSafe = hitungDiskonPhp([
    'normal_price' => 15000,
    'discount_percent' => 20,
    'quantity' => 1,
    'hpp_per_unit' => 9500,
    'target_margin_percent' => 0,
]);
cek_sama('safe', $diskonSafe['status'], 'diskon safe status');

putenv('HITUNG_BASE_URL=http://127.0.0.1:1');

$fallbackHpp = hitungHpp([
    'unit_count' => 50,
    'material_cost' => 300000,
    'labor_cost' => 100000,
    'packaging_cost' => 50000,
    'overhead_cost' => 25000,
    'target_margin' => 0.30,
]);
cek_sama(true, $fallbackHpp['ok'], 'fallback hpp ok');
cek_sama('php', $fallbackHpp['engine'], 'fallback hpp engine');
cek_sama(13600, $fallbackHpp['data']['suggested_price'], 'fallback hpp price');

$fallbackDiskon = hitungDiskon([
    'normal_price' => 15000,
    'discount_percent' => 20,
    'quantity' => 3,
    'hpp_per_unit' => 9500,
    'target_margin_percent' => 30,
]);
cek_sama(true, $fallbackDiskon['ok'], 'fallback diskon ok');
cek_sama('php', $fallbackDiskon['engine'], 'fallback diskon engine');
cek_sama('below_target', $fallbackDiskon['data']['status'], 'fallback diskon status');

echo "Tes C8 lib HPP/diskon OK." . PHP_EOL;
