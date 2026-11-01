<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/validate.php';

handle_preflight();

if (!in_array(getenv('APP_ENV') ?: '', ['local', 'test'], true)) {
    json_error('Not found.', 404, null, 'NOT_FOUND');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_error('Metode tidak diizinkan. Gunakan POST.', 405);
}

$input = read_json_body();
require_fields($input, ['user_id']);
$userId = validate_uuid($input['user_id'], 'user_id');

$pdo = db();
$stmt = $pdo->prepare(
    'SELECT user_id, full_name, email, phone, role
     FROM users
     WHERE user_id = ? AND status = ? AND deleted_at IS NULL
     LIMIT 1'
);
$stmt->execute([$userId, 'active']);
$user = $stmt->fetch();

if (!$user) {
    json_error('User tidak ditemukan atau tidak aktif.', 404, null, 'NOT_FOUND');
}

session_start_secure();
session_regenerate_id(true);
$_SESSION['user_id'] = $user['user_id'];
$_SESSION['user_name'] = $user['full_name'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_phone'] = $user['phone'];
$_SESSION['user_role'] = $user['role'];

if ($user['role'] === 'seller') {
    $stmt = $pdo->prepare('SELECT store_id FROM stores WHERE owner_user_id = ? LIMIT 1');
    $stmt->execute([$user['user_id']]);
    $store = $stmt->fetch();

    if ($store && !empty($store['store_id'])) {
        $_SESSION['store_id'] = $store['store_id'];
    }
}

json_success($user, 'Session test dibuat.');
