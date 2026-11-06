<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/validate.php';
require_once __DIR__ . '/../lib/image.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

handle_preflight();
session_start_secure();

try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('[favorites] db failed: ' . $e->getMessage());
    json_error('Gagal terhubung ke database.', 500);
}

$user = require_auth();
$action = $_GET['action'] ?? 'list';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($action === 'list') {
    if ($method !== 'GET') {
        json_error('Method tidak diizinkan.', 405);
    }

    $stmt = $pdo->prepare(
        "SELECT p.product_id, p.name, s.name AS store_name,
                COALESCE(MIN(pv.price), 0) AS price,
                MIN(f.created_at) AS created_at
         FROM favorites f
         JOIN products p ON p.product_id = f.product_id
         LEFT JOIN stores s ON s.store_id = p.store_id
         LEFT JOIN product_variants pv
                ON pv.product_id = p.product_id AND pv.status = 'active'
         WHERE f.user_id = ?
           AND p.deleted_at IS NULL
           AND p.status = 'active'
         GROUP BY p.product_id, p.name, s.name
         ORDER BY created_at DESC"
    );
    $stmt->execute([$user['user_id']]);

    $items = [];
    while ($row = $stmt->fetch()) {
        $row['price'] = (int) $row['price'];
        $row['primary_image_url'] = product_primary_image_url($pdo, $row['product_id']);
        $items[] = $row;
    }

    json_success([
        'items' => $items,
        'ids' => array_column($items, 'product_id'),
    ], 'Daftar favorit berhasil diambil.');
}

if ($method !== 'POST') {
    json_error('Method tidak diizinkan.', 405);
}

$input = read_json_body();
$productId = validate_uuid($input['product_id'] ?? '', 'product_id');

$stmt = $pdo->prepare(
    "SELECT product_id
     FROM products
     WHERE product_id = ? AND status = 'active' AND deleted_at IS NULL
     LIMIT 1"
);
$stmt->execute([$productId]);

if (!$stmt->fetch()) {
    json_error('Produk tidak ditemukan.', 404);
}

if ($action === 'remove') {
    $del = $pdo->prepare(
        'DELETE FROM favorites WHERE user_id = ? AND product_id = ?'
    );
    $del->execute([$user['user_id'], $productId]);

    json_success([
        'favorited' => false,
        'product_id' => $productId,
    ], 'Favorit dihapus.');
}

if ($action === 'toggle') {
    $stmt = $pdo->prepare(
        'SELECT favorite_id FROM favorites WHERE user_id = ? AND product_id = ? LIMIT 1'
    );
    $stmt->execute([$user['user_id'], $productId]);
    $exists = $stmt->fetchColumn();

    if ($exists) {
        $del = $pdo->prepare(
            'DELETE FROM favorites WHERE user_id = ? AND product_id = ?'
        );
        $del->execute([$user['user_id'], $productId]);

        json_success([
            'favorited' => false,
            'product_id' => $productId,
        ], 'Favorit dihapus.');
    }

    $ins = $pdo->prepare(
        'INSERT INTO favorites (favorite_id, user_id, product_id)
         VALUES (UUID(), ?, ?)'
    );
    $ins->execute([$user['user_id'], $productId]);

    json_success([
        'favorited' => true,
        'product_id' => $productId,
    ], 'Produk ditambahkan ke favorit.');
}

json_error('Action tidak valid.', 400);