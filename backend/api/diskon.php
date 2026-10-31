<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/diskon.php';

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
    error_log('[diskon] store check failed: ' . $e->getMessage());
    json_error('Gagal validasi store.', 500);
}

try {
    $res = hitungDiskon($input);
} catch (Throwable $e) {
    error_log('[diskon] hitung failed: ' . $e->getMessage());
    json_error('Gagal menghitung diskon.', 500);
}

if (isset($res['ok']) && $res['ok'] === false) {
    $status = 400;
    $code = $res['error_code'] ?? 'VALIDATION_ERROR';
    if ($code === 'SERVER_ERROR') {
        $status = 500;
    }
    json_error($res['message'] ?? 'Gagal menghitung diskon.', $status, $res['errors'] ?? null);
}

$data = $res['data'] ?? $res;

json_success($data, $res['message'] ?? 'Simulasi diskon berhasil dihitung.');