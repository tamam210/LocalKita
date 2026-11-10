<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/auth.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

handle_preflight();

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

if ($method === 'POST' && $action === 'register') {
    $name = trim((string) ($input['full_name'] ?? $input['username'] ?? $input['name'] ?? ''));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    $role = (string) ($input['role'] ?? 'buyer');

    if ($role === 'pembeli') { $role = 'buyer'; }
    if ($role === 'penjual') { $role = 'seller'; }

    if (!in_array($role, ['buyer', 'seller'], true)) {
        json_error('Peran tidak valid.', 400);
    }

    $storeName = trim((string) ($input['store_name'] ?? $input['nama_toko'] ?? ''));

    $paymentOnline = filter_var($input['payment_online'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    $bankName = trim((string) ($input['payment_bank_name'] ?? ''));
    $accountNumber = trim((string) ($input['payment_account_number'] ?? ''));
    $accountName = trim((string) ($input['payment_account_name'] ?? ''));
    $vaNumber = trim((string) ($input['payment_va_number'] ?? ''));
    $qrisUrl = trim((string) ($input['payment_qris_image_url'] ?? ''));
    $instructions = trim((string) ($input['payment_instructions'] ?? ''));

    if ($role === 'seller' && $paymentOnline === 1 && $bankName === '' && $vaNumber === '' && $qrisUrl === '') {
        json_error('Isi minimal satu metode pembayaran non-tunai.', 400);
    }

    if (
        $role === 'seller'
        && ($bankName !== '' || $accountNumber !== '' || $accountName !== '')
        && ($bankName === '' || $accountNumber === '' || $accountName === '')
    ) {
        json_error('Data rekening bank belum lengkap.', 400);
    }

    if (strlen($name) < 3) {
        json_error('Nama minimal 3 karakter.', 400);
    }
    if (strlen($name) > 120) {
        json_error('Nama maksimal 120 karakter.', 400);
    }
    if (strlen($email) > 255) {
        json_error('Email maksimal 255 karakter.', 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_error('Email tidak valid.', 400);
    }
    if (strlen($password) < 8) {
        json_error('Password minimal 8 karakter.', 400);
    }
    if ($role === 'seller' && $storeName === '') {
        json_error('Nama toko wajib diisi.', 400);
    }
    if ($role === 'seller' && strlen($storeName) > 180) {
        json_error('Nama toko maksimal 180 karakter.', 400);
    }

    $cek = $pdo->prepare('SELECT user_id FROM users WHERE email = ? LIMIT 1');
    $cek->execute([$email]);
    if ($cek->fetch()) {
        json_error('Email sudah terdaftar.', 409);
    }

    try {
        $pdo->beginTransaction();

        $userId = $pdo->query('SELECT UUID()')->fetchColumn();
        $hash = password_hash($password, PASSWORD_DEFAULT);

        $insUser = $pdo->prepare(
            "INSERT INTO users (user_id, email, full_name, password_hash, role, status)
             VALUES (?, ?, ?, ?, ?, 'active')"
        );
        $insUser->execute([$userId, $email, $name, $hash, $role]);

        $storeId = null;

        if ($role === 'seller') {
            $storeId = $pdo->query('SELECT UUID()')->fetchColumn();

            $slugBase = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $storeName), '-'));
            if ($slugBase === '') {
                $slugBase = 'toko';
            }
            $slug = $slugBase;
            $cekSlug = $pdo->prepare('SELECT 1 FROM stores WHERE slug = ? LIMIT 1');
            $cekSlug->execute([$slug]);
            if ($cekSlug->fetchColumn()) {
                $slug = $slugBase . '-' . substr(bin2hex(random_bytes(3)), 0, 6);
            }

            $insStore = $pdo->prepare(
                "INSERT INTO stores
                    (store_id, owner_user_id, category_id, slug, name, status,
                     payment_online_enabled, payment_bank_name, payment_account_number,
                     payment_account_name, payment_va_number, payment_qris_image_url,
                     payment_instructions)
                 VALUES (?, ?, NULL, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)"
            );
            $insStore->execute([
                $storeId,
                $userId,
                $slug,
                $storeName,
                $paymentOnline,
                $bankName !== '' ? $bankName : null,
                $accountNumber !== '' ? $accountNumber : null,
                $accountName !== '' ? $accountName : null,
                $vaNumber !== '' ? $vaNumber : null,
                $qrisUrl !== '' ? $qrisUrl : null,
                $instructions !== '' ? $instructions : null,
            ]);

            $memberId = $pdo->query('SELECT UUID()')->fetchColumn();
            $insMember = $pdo->prepare(
                "INSERT INTO store_members
                 (store_member_id, store_id, user_id, role, status)
                 VALUES (?, ?, ?, 'owner', 'active')"
            );
            $insMember->execute([$memberId, $storeId, $userId]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[auth] register failed: ' . $e->getMessage());
        json_error('Gagal mendaftar. Coba lagi.', 500);
    }

    audit_log($pdo, 'auth.register', 'user', $userId, ['role' => $role]);

    json_success([
        'user_id' => $userId,
        'name' => $name,
        'email' => $email,
        'role' => $role,
        'store_id' => $storeId,
    ], 'Pendaftaran berhasil.');
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
    unset($_SESSION['store_id'], $_SESSION['store_name']);

    if ($user['role'] === 'seller') {
        $s = $pdo->prepare('SELECT store_id, name FROM stores WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1');
        $s->execute([$user['user_id']]);
        $st = $s->fetch();
        if ($st && !empty($st['store_id'])) {
            $_SESSION['store_id'] = $st['store_id'];
            $_SESSION['store_name'] = $st['name'];
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