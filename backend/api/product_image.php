<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/auth.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_error('Method tidak diizinkan.', 405);
}

try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('[product_image] db failed: ' . $e->getMessage());
    json_error('Gagal terhubung ke database.', 500);
}

$user = require_role(['seller', 'admin']);

$productId = trim((string) ($_POST['product_id'] ?? ''));
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $productId)) {
    json_error('product_id tidak valid.', 400);
}

$stmt = $pdo->prepare(
    'SELECT product_id, store_id, name
     FROM products
     WHERE product_id = ? AND deleted_at IS NULL
     LIMIT 1'
);
$stmt->execute([$productId]);
$product = $stmt->fetch();

if (!$product) {
    json_error('Produk tidak ditemukan.', 404);
}

// Pastikan produk ini milik toko penjual yang login.
require_store_access($pdo, $product['store_id']);

$file = $_FILES['image'] ?? null;
$err = is_array($file) ? (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) : UPLOAD_ERR_NO_FILE;

if ($err !== UPLOAD_ERR_OK) {
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        json_error('Ukuran foto terlalu besar. Maksimal 3 MB.', 400);
    }
    if ($err === UPLOAD_ERR_NO_FILE) {
        json_error('Pilih file foto terlebih dahulu.', 400);
    }
    json_error('Gagal upload foto. Kode error: ' . $err, 400);
}

if (($file['size'] ?? 0) <= 0 || $file['size'] > 3 * 1024 * 1024) {
    json_error('Ukuran foto maksimal 3 MB.', 400);
}

if (!is_uploaded_file($file['tmp_name'])) {
    json_error('File upload tidak valid.', 400);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);

$allowed = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
];

if (!isset($allowed[$mime])) {
    json_error('Format foto harus JPG, PNG, atau WebP.', 400);
}

$ext = $allowed[$mime];

$root = dirname(__DIR__, 2);
$dir = $root . '/uploads/products';

if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    error_log('[product_image] gagal buat folder: ' . $dir);
    json_error('Folder upload tidak bisa dibuat.', 500);
}

$filename = $productId . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
$target = $dir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $target)) {
    error_log('[product_image] gagal pindah file ke: ' . $target);
    json_error('Gagal menyimpan file.', 500);
}

$relativePath = 'uploads/products/' . $filename;

try {
    $pdo->beginTransaction();

    $fileId = $pdo->query('SELECT UUID()')->fetchColumn();
    $imageId = $pdo->query('SELECT UUID()')->fetchColumn();

    $insFile = $pdo->prepare(
        "INSERT INTO files (file_id, store_id, uploader_id, storage_path, mime_type, visibility)
         VALUES (?, ?, ?, ?, ?, 'public')"
    );
    $insFile->execute([
        $fileId,
        $product['store_id'],
        $user['user_id'],
        $relativePath,
        $mime,
    ]);

    // Satu foto utama per produk.
    $pdo->prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?')
        ->execute([$productId]);

    $insImage = $pdo->prepare(
        'INSERT INTO product_images (image_id, product_id, file_id, alt_text, sort_order, is_primary)
         VALUES (?, ?, ?, ?, 0, 1)'
    );
    $insImage->execute([
        $imageId,
        $productId,
        $fileId,
        $product['name'],
    ]);

    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    @unlink($target);
    error_log('[product_image] db failed: ' . $e->getMessage());
    json_error('Gagal menyimpan foto ke database.', 500);
}

json_success([
    'image_url'  => '/' . $relativePath,
    'product_id' => $productId,
], 'Foto produk berhasil diunggah.');