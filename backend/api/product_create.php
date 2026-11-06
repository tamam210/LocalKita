<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/validate.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

handle_preflight();
session_start_secure();

try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('[product_create] db failed: ' . $e->getMessage());
    json_error('Gagal terhubung ke database.', 500);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_error('Method tidak diizinkan.', 405);
}

$user = require_role(['seller']);
$input = read_json_body();

$name = validate_string($input['name'] ?? '', 'name', 3, 180);

$description = trim((string) ($input['description'] ?? ''));
if (strlen($description) > 5000) {
    validation_error('description', 'Maksimal 5000 karakter.');
}

$price = validate_int($input['price'] ?? 0, 'price', 0, 1000000000);
$stock = validate_int($input['stock'] ?? 0, 'stock', 0, 1000000);

$categoryId = trim((string) ($input['category_id'] ?? ''));
if ($categoryId !== '') {
    $categoryId = validate_uuid($categoryId, 'category_id');

    $cekCat = $pdo->prepare(
        "SELECT 1 FROM categories WHERE category_id = ? AND type = 'product' LIMIT 1"
    );
    $cekCat->execute([$categoryId]);
    if (!$cekCat->fetchColumn()) {
        validation_error('category_id', 'Kategori tidak ditemukan.');
    }
} else {
    $categoryId = null;
}

$storeId = (string) ($user['store_id'] ?? '');

if ($storeId === '') {
    $stmt = $pdo->prepare(
        'SELECT store_id FROM stores WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1'
    );
    $stmt->execute([$user['user_id']]);
    $storeId = (string) $stmt->fetchColumn();
}

if ($storeId === '') {
    json_error('Toko tidak ditemukan. Hubungi admin.', 400);
}

$slugBase = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name), '-'));
if ($slugBase === '') { $slugBase = 'produk'; }
$slug = $slugBase . '-' . substr(bin2hex(random_bytes(3)), 0, 6);

$sku = trim((string) ($input['sku'] ?? ''));
if ($sku === '') {
    $skuBase = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 10));
    if ($skuBase === '') { $skuBase = 'PRODUK'; }
    $sku = $skuBase . '-' . strtoupper(bin2hex(random_bytes(2)));
}

$cekSku = $pdo->prepare(
    'SELECT 1 FROM product_variants WHERE store_id = ? AND sku = ? LIMIT 1'
);
$cekSku->execute([$storeId, $sku]);
if ($cekSku->fetchColumn()) {
    $sku .= '-' . strtoupper(bin2hex(random_bytes(2)));
}

try {
    $pdo->beginTransaction();

    $productId = $pdo->query('SELECT UUID()')->fetchColumn();

    $ins = $pdo->prepare(
        "INSERT INTO products
         (product_id, store_id, category_id, slug, name, description,
          earns_points, point_multiplier, status)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1.00, 'active')"
    );
    $ins->execute([
        $productId,
        $storeId,
        $categoryId,
        $slug,
        $name,
        $description !== '' ? $description : null,
    ]);

    $variantId = $pdo->query('SELECT UUID()')->fetchColumn();
    $variantStatus = $stock > 0 ? 'active' : 'out_of_stock';

    $insVariant = $pdo->prepare(
        "INSERT INTO product_variants
         (variant_id, product_id, store_id, sku, name, price, hpp_unit, stock, status)
         VALUES (?, ?, ?, ?, 'Default', ?, 0, ?, ?)"
    );
    $insVariant->execute([
        $variantId,
        $productId,
        $storeId,
        $sku,
        $price,
        $stock,
        $variantStatus,
    ]);

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[product_create] failed: ' . $e->getMessage());
    json_error('Gagal menambah produk.', 500);
}

json_success([
    'product_id' => $productId,
    'variant_id' => $variantId,
    'name' => $name,
    'price' => $price,
    'stock' => $stock,
    'slug' => $slug,
], 'Produk berhasil ditambahkan.');