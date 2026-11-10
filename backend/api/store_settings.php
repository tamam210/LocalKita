<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/validate.php';

handle_preflight();

$user = require_auth();

if (!in_array($user['role'], ['seller', 'admin'], true)) {
    json_error('Tidak memiliki akses.', 403);
}

try {
    $pdo = db();
} catch (Throwable $e) {
    json_error('Gagal terhubung ke database.', 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $storeId = validate_uuid($_GET['store_id'] ?? '', 'store_id');
} else {
    $input = read_json_body();
    $storeId = validate_uuid($input['store_id'] ?? '', 'store_id');
}

require_store_access($pdo, $storeId);

if ($method === 'GET') {
    $stmt = $pdo->prepare(
        "SELECT store_id, name,
                payment_online_enabled, payment_bank_name,
                payment_account_number, payment_account_name,
                payment_va_number, payment_qris_image_url,
                payment_instructions
         FROM stores
         WHERE store_id = ? AND deleted_at IS NULL
         LIMIT 1"
    );
    $stmt->execute([$storeId]);
    json_success($stmt->fetch(), 'Pengaturan pembayaran berhasil diambil.');
}

if ($method !== 'POST') {
    json_error('Metode tidak diizinkan.', 405);
}

$input = read_json_body();

$online = filter_var($input['payment_online'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
$bank = trim((string) ($input['payment_bank_name'] ?? ''));
$rek = trim((string) ($input['payment_account_number'] ?? ''));
$pemilik = trim((string) ($input['payment_account_name'] ?? ''));
$va = trim((string) ($input['payment_va_number'] ?? ''));
$qris = trim((string) ($input['payment_qris_image_url'] ?? ''));
$catatan = trim((string) ($input['payment_instructions'] ?? ''));

if ($online === 1 && $bank === '' && $va === '' && $qris === '') {
    json_error('Isi minimal satu metode pembayaran non-tunai.', 400);
}

if (($bank !== '' || $rek !== '' || $pemilik !== '') && ($bank === '' || $rek === '' || $pemilik === '')) {
    json_error('Data rekening bank belum lengkap.', 400);
}

$stmt = $pdo->prepare(
    "UPDATE stores
     SET payment_online_enabled = ?,
         payment_bank_name = ?,
         payment_account_number = ?,
         payment_account_name = ?,
         payment_va_number = ?,
         payment_qris_image_url = ?,
         payment_instructions = ?
     WHERE store_id = ? AND deleted_at IS NULL"
);

$stmt->execute([
    $online,
    $bank !== '' ? $bank : null,
    $rek !== '' ? $rek : null,
    $pemilik !== '' ? $pemilik : null,
    $va !== '' ? $va : null,
    $qris !== '' ? $qris : null,
    $catatan !== '' ? $catatan : null,
    $storeId,
]);

json_success(['store_id' => $storeId], 'Pengaturan pembayaran disimpan.');