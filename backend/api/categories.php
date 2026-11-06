<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

handle_preflight();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_error('Metode tidak diizinkan. Gunakan GET.', 405);
}

try {
    $stmt = db()->query(
        "SELECT c.category_id, c.name, c.slug
         FROM categories c
         WHERE c.type = 'product'
           AND EXISTS (
               SELECT 1 FROM products p
               WHERE p.category_id = c.category_id AND p.status = 'active'
           )
         ORDER BY c.name ASC"
    );

    json_success(['items' => $stmt->fetchAll()], 'Daftar kategori berhasil diambil.');
} catch (Throwable $e) {
    error_log('[categories] ' . $e->getMessage());
    json_error('Terjadi kesalahan server.', 500, null, 'SERVER_ERROR');
}
