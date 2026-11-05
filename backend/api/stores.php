<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/auth.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

handle_preflight();

require_role(['admin']);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_error('Metode tidak diizinkan. Gunakan GET.', 405);
}

try {
    $stmt = db()->query(
        "SELECT store_id, name, status
         FROM stores
         WHERE deleted_at IS NULL
         ORDER BY name ASC"
    );

    json_success(['items' => $stmt->fetchAll()], 'Daftar toko berhasil diambil.');
} catch (Throwable $e) {
    error_log('[stores] ' . $e->getMessage());
    json_error('Terjadi kesalahan server.', 500, null, 'SERVER_ERROR');
}
