<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/hpp.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_error('Metode tidak diizinkan. Gunakan POST.', 405, null);
}

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    json_error('JSON tidak valid.', 400, null);
}

$storeId = $input['store_id'] ?? null;
if (empty($storeId)) {
    json_error('store_id wajib diisi.', 400, ['store_id' => 'Wajib diisi']);
}

try {
    $pdo = db();
    $stmt = $pdo->prepare('SELECT store_id FROM stores WHERE store_id = ? LIMIT 1');
    $stmt->execute([$storeId]);
    if (!$stmt->fetch()) {
        json_error('Store tidak ditemukan.', 404, ['store_id' => 'Tidak ditemukan']);
    }
} catch (Throwable $e) {
    error_log('[hpp] store check failed: ' . $e->getMessage());
    json_error('Gagal validasi store.', 500);
}

$unitCount = (int)($input['unit_count'] ?? $input['units_produced'] ?? 0);
$materialCost = (int)($input['material_cost'] ?? 0);
$laborCost = (int)($input['labor_cost'] ?? 0);
$packagingCost = (int)($input['packaging_cost'] ?? 0);
$overheadCost = (int)($input['overhead_cost'] ?? 0);
$targetMargin = $input['target_margin'] ?? $input['target_margin_percent'] ?? 0;
$targetMargin = is_numeric($targetMargin) ? (float)$targetMargin : 0;
$targetMarginInput = $targetMargin > 1.0 ? ($targetMargin / 100.0) : $targetMargin;

$calcInput = [
    'unit_count' => $unitCount,
    'units_produced' => $unitCount,
    'material_cost' => $materialCost,
    'labor_cost' => $laborCost,
    'packaging_cost' => $packagingCost,
    'overhead_cost' => $overheadCost,
    'target_margin' => $targetMarginInput,
];

try {
    $res = hitungHpp($calcInput);
} catch (Throwable $e) {
    error_log('[hpp] hitung failed: ' . $e->getMessage());
    json_error('Gagal menghitung HPP.', 500);
}

if (isset($res['ok']) && $res['ok'] === false) {
    json_error($res['message'] ?? 'Gagal menghitung HPP.', 400, $res['errors'] ?? null);
}

$data = $res['data'] ?? $res;
$save = !empty($input['save']) || !empty($input['product_id']) || !empty($input['variant_id']);
$calculationId = null;

if ($save) {
    try {
        $pdo = db();
        $calculationId = $pdo->query('SELECT UUID()')->fetchColumn();
        $hppPerUnitVal = $data['hpp_per_unit'] ?? 0;
        $suggestedPriceVal = $data['suggested_price'] ?? 0;
        $targetMarginPct = $targetMargin > 1.0 ? $targetMargin : round($targetMarginInput * 100, 2);

        $stmt = $pdo->prepare('INSERT INTO hpp_calculations (calculation_id, store_id, product_id, variant_id, total_cost, unit_count, hpp_per_unit, target_margin, suggested_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $calculationId,
            $storeId,
            $input['product_id'] ?? null,
            $input['variant_id'] ?? null,
            $data['total_cost'] ?? ($materialCost + $laborCost + $packagingCost + $overheadCost),
            $unitCount,
            $hppPerUnitVal,
            $targetMarginPct,
            $suggestedPriceVal,
        ]);

        $comp = $pdo->prepare('INSERT INTO hpp_components (component_id, calculation_id, component_type, amount) VALUES (UUID(), ?, ?, ?)');
        if ($materialCost > 0) {
            $comp->execute([$calculationId, 'material', $materialCost]);
        }
        if ($laborCost > 0) {
            $comp->execute([$calculationId, 'labor', $laborCost]);
        }
        if ($packagingCost > 0) {
            $comp->execute([$calculationId, 'packaging', $packagingCost]);
        }
        if ($overheadCost > 0) {
            $comp->execute([$calculationId, 'overhead', $overheadCost]);
        }
    } catch (Throwable $e) {
        error_log('[hpp] save failed: ' . $e->getMessage());
        json_error('Gagal menyimpan hasil HPP.', 500);
    }
}

$out = [
    'total_cost' => $data['total_cost'] ?? ($materialCost + $laborCost + $packagingCost + $overheadCost),
    'unit_count' => $data['unit_count'] ?? $unitCount,
    'hpp_per_unit' => $data['hpp_per_unit'] ?? 0,
    'target_margin_percent' => $targetMargin > 1.0 ? $targetMargin : round($targetMarginInput * 100, 2),
    'suggested_price' => $data['suggested_price'] ?? 0,
    'margin_percent' => $data['margin_percent'] ?? null,
    'markup_percent' => $data['markup_percent'] ?? null,
    'engine' => $res['engine'] ?? ($data['engine'] ?? 'php'),
    'saved' => (bool)$calculationId,
    'calculation_id' => $calculationId,
];

json_success($out, 'HPP berhasil dihitung.');
