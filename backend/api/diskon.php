<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/validate.php';
require_once __DIR__ . '/../lib/diskon.php';

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
    error_log('[diskon] db failed: ' . $e->getMessage());
    json_error('Gagal terhubung ke database.', 500);
}

require_store_access($pdo, $storeId);

$input['normal_price'] = validate_int(
    $input['normal_price'] ?? $input['harga_normal'] ?? 0,
    'normal_price',
    1
);
$input['discount_percent'] = validate_number(
    $input['discount_percent'] ?? $input['diskon_persen'] ?? 0,
    'discount_percent',
    0,
    100
);
$input['quantity'] = validate_int(
    $input['quantity'] ?? $input['qty'] ?? $input['jumlah'] ?? 1,
    'quantity',
    1
);
$input['additional_cost'] = validate_int(
    $input['additional_cost'] ?? $input['biaya_tambahan'] ?? 0,
    'additional_cost',
    0
);
$input['hpp_per_unit'] = validate_number(
    $input['hpp_per_unit'] ?? $input['hpp_unit'] ?? 0,
    'hpp_per_unit',
    0
);
$input['target_margin_percent'] = validate_number(
    $input['target_margin_percent'] ?? $input['target_margin'] ?? 0,
    'target_margin_percent',
    0,
    100
);

try {
    $res = hitungDiskon($input);
} catch (Throwable $e) {
    error_log('[diskon] hitung failed: ' . $e->getMessage());
    json_error('Gagal menghitung diskon.', 500);
}

if (isset($res['ok']) && $res['ok'] === false) {
    $status = ($res['error_code'] ?? 'VALIDATION_ERROR') === 'SERVER_ERROR' ? 500 : 400;
    json_error($res['message'] ?? 'Gagal menghitung diskon.', $status, $res['errors'] ?? null, $res['error_code'] ?? null);
}

$data = $res['data'] ?? $res;

if (is_array($data)) {
    $data['engine'] = $res['engine'] ?? ($data['engine'] ?? 'php');
}

json_success($data, $res['message'] ?? 'Simulasi diskon berhasil dihitung.');
