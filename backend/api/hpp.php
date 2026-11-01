<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/hpp.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

handle_preflight();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_error('Metode tidak diizinkan. Gunakan POST.', 405);
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

if (!is_array($input)) {
    json_error('JSON tidak valid.', 400);
}

$storeId = $input['store_id'] ?? null;

if (!is_string($storeId) || trim($storeId) === '') {
    json_error('store_id wajib diisi.', 400, ['store_id' => 'Wajib diisi']);
}

$storeId = trim($storeId);

try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('[hpp] db failed: ' . $e->getMessage());
    json_error('Gagal terhubung ke database.', 500);
}

require_store_access($pdo, $storeId);

$unitCount = (int)($input['units_produced'] ?? $input['unit_count'] ?? 0);
$materialCost = (int)($input['material_cost'] ?? 0);
$laborCost = (int)($input['labor_cost'] ?? 0);
$packagingCost = (int)($input['packaging_cost'] ?? 0);
$overheadCost = (int)($input['overhead_cost'] ?? 0);

$targetMarginRaw = $input['target_margin_percent'] ?? $input['target_margin'] ?? 0;
$targetMarginRaw = is_numeric($targetMarginRaw) ? (float)$targetMarginRaw : 0;
$targetMarginInput = array_key_exists('target_margin_percent', $input)
    ? $targetMarginRaw / 100.0
    : ($targetMarginRaw > 1.0 ? $targetMarginRaw / 100.0 : $targetMarginRaw);

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
    $status = ($res['error_code'] ?? 'VALIDATION_ERROR') === 'SERVER_ERROR' ? 500 : 400;
    json_error($res['message'] ?? 'Gagal menghitung HPP.', $status, $res['errors'] ?? null, $res['error_code'] ?? null);
}

$data = $res['data'] ?? $res;
$save = filter_var($input['save'] ?? false, FILTER_VALIDATE_BOOLEAN);
$productId = isset($input['product_id']) && is_string($input['product_id']) && trim($input['product_id']) !== ''
    ? trim($input['product_id'])
    : null;
$variantId = isset($input['variant_id']) && is_string($input['variant_id']) && trim($input['variant_id']) !== ''
    ? trim($input['variant_id'])
    : null;
$calculationId = null;
$saved = false;

if ($save) {
    if ($productId !== null) {
        $stmt = $pdo->prepare(
            'SELECT 1 FROM products
             WHERE product_id = ? AND store_id = ? AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([$productId, $storeId]);

        if (!$stmt->fetchColumn()) {
            json_error('Produk tidak ditemukan.', 404, ['product_id' => 'Tidak ditemukan'], 'NOT_FOUND');
        }
    }

    if ($variantId !== null) {
        $sql = 'SELECT 1 FROM product_variants WHERE variant_id = ? AND store_id = ?';
        $params = [$variantId, $storeId];

        if ($productId !== null) {
            $sql .= ' AND product_id = ?';
            $params[] = $productId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if (!$stmt->fetchColumn()) {
            json_error('Varian tidak ditemukan.', 404, ['variant_id' => 'Tidak ditemukan'], 'NOT_FOUND');
        }
    }

    try {
        $pdo->beginTransaction();
        $calculationId = $pdo->query('SELECT UUID()')->fetchColumn();
        $targetMarginPct = round($targetMarginInput * 100, 2);

        $stmt = $pdo->prepare(
            'INSERT INTO hpp_calculations
                (calculation_id, store_id, product_id, variant_id, total_cost, unit_count,
                 hpp_per_unit, target_margin, suggested_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $calculationId,
            $storeId,
            $productId,
            $variantId,
            (int)($data['total_cost'] ?? ($materialCost + $laborCost + $packagingCost + $overheadCost)),
            $unitCount,
            (int)($data['hpp_per_unit'] ?? 0),
            $targetMarginPct,
            (int)($data['suggested_price'] ?? 0),
        ]);

        $comp = $pdo->prepare(
            'INSERT INTO hpp_components (component_id, calculation_id, component_type, amount)
             VALUES (UUID(), ?, ?, ?)'
        );

        foreach ([
            'material' => $materialCost,
            'labor' => $laborCost,
            'packaging' => $packagingCost,
            'overhead' => $overheadCost,
        ] as $type => $amount) {
            if ($amount > 0) {
                $comp->execute([$calculationId, $type, $amount]);
            }
        }

        $pdo->commit();
        $saved = true;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        error_log('[hpp] save failed: ' . $e->getMessage());
        json_error('Gagal menyimpan hasil HPP.', 500);
    }
}

$out = [
    'total_cost' => (int)($data['total_cost'] ?? ($materialCost + $laborCost + $packagingCost + $overheadCost)),
    'units_produced' => (int)($data['unit_count'] ?? $unitCount),
    'hpp_per_unit' => (int)($data['hpp_per_unit'] ?? 0),
    'target_margin_percent' => round($targetMarginInput * 100, 2),
    'suggested_price' => (int)($data['suggested_price'] ?? 0),
    'margin_percent' => $data['margin_percent'] ?? null,
    'markup_percent' => $data['markup_percent'] ?? null,
    'engine' => $res['engine'] ?? ($data['engine'] ?? 'php'),
    'saved' => $saved,
    'calculation_id' => $calculationId,
];

json_success($out, 'HPP berhasil dihitung.');
