<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/auth.php';

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

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');

session_start_secure();

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    $input = $_POST;
}

try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('[auth] db failed: ' . $e->getMessage());
    json_error('Gagal terhubung ke database.', 500);
}

if ($method === 'POST' && $action === 'login') {
    $identifier = trim($input['email'] ?? $input['username'] ?? $input['phone'] ?? '');
    $password = $input['password'] ?? '';

    if ($identifier === '' || $password === '') {
        json_error('Email/username dan password wajib diisi.', 400, null);
    }

    try {
        $stmt = $pdo->prepare('SELECT user_id, full_name as name, email, phone, password_hash, role, status FROM users WHERE email = ? OR phone = ? OR full_name = ? LIMIT 1');
        $stmt->execute([$identifier, $identifier, $identifier]);
        $user = $stmt->fetch();
    } catch (Throwable $e) {
        error_log('[auth] login query failed: ' . $e->getMessage());
        json_error('Gagal melakukan login.', 500);
    }

    if (!$user || ($user['status'] ?? 'inactive') !== 'active') {
        audit_log($pdo, 'auth.login_failed', 'user', null, ['identifier' => $identifier]);
        json_error('Email/username atau password salah.', 401, null);
    }

    if (!password_verify($password, $user['password_hash'])) {
        audit_log($pdo, 'auth.login_failed', 'user', $user['user_id'], ['identifier' => $identifier]);
        json_error('Email/username atau password salah.', 401, null);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_phone'] = $user['phone'];
    $_SESSION['user_role'] = $user['role'];

    if ($user['role'] === 'seller') {
        $s = $pdo->prepare('SELECT store_id FROM stores WHERE owner_user_id = ? LIMIT 1');
        $s->execute([$user['user_id']]);
        $st = $s->fetch();
        if ($st && !empty($st['store_id'])) {
            $_SESSION['store_id'] = $st['store_id'];
        }
    }

    audit_log($pdo, 'auth.login_success', 'user', $user['user_id'], []);

    unset($user['password_hash']);
    json_success($user, 'Login berhasil.');
}

if ($method === 'POST' && $action === 'logout') {
    $u = auth_user();
    if ($u) {
        audit_log($pdo, 'auth.logout', 'user', $u['user_id'], []);
    }
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_success(null, 'Logout berhasil.');
}

if (($method === 'GET' || $method === 'POST') && $action === 'me') {
    $user = auth_user();
    if (!$user) {
        json_error('Belum login.', 401, null);
    }
    json_success($user, 'OK');
}

json_error('Action tidak valid.', 400, null);