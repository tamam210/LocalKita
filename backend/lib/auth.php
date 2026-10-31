<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session.php';
require_once __DIR__ . '/response.php';

function client_ip(): string
{
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($parts[0]);
    }
    if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        return trim($_SERVER['HTTP_X_REAL_IP']);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function audit_log(PDO $pdo, string $action, ?string $resourceType = null, ?string $resourceId = null, array $meta = []): void
{
    session_start_secure();
    $userId = $_SESSION['user_id'] ?? null;
    $storeId = $_SESSION['store_id'] ?? null;
    $ip = client_ip();
    $metaJson = !empty($meta) ? json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;

    try {
        $stmt = $pdo->prepare('INSERT INTO audit_logs (audit_id, actor_user_id, store_id, action, entity_type, entity_id, ip_address, metadata, created_at) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW())');
        $stmt->execute([$userId, $storeId, $action, $resourceType, $resourceId, $ip, $metaJson]);
    } catch (Throwable $e) {
        error_log('[audit_log] ' . $e->getMessage());
    }
}

function auth_user(): ?array
{
    session_start_secure();
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    return [
        'user_id' => $_SESSION['user_id'],
        'name' => $_SESSION['user_name'] ?? null,
        'email' => $_SESSION['user_email'] ?? null,
        'phone' => $_SESSION['user_phone'] ?? null,
        'role' => $_SESSION['user_role'] ?? null,
        'store_id' => $_SESSION['store_id'] ?? null,
    ];
}

function require_auth(): array
{
    $user = auth_user();
    if ($user === null) {
        json_error('Belum login.', 401, null);
    }
    return $user;
}

function require_role(array $roles): array
{
    $user = require_auth();
    if (!in_array($user['role'], $roles, true)) {
        json_error('Tidak memiliki akses.', 403, null);
    }
    return $user;
}

function require_store_access(PDO $pdo, string $storeId): array
{
    $user = require_auth();
    $role = $user['role'] ?? null;

    if ($role === 'admin') {
        $stmt = $pdo->prepare('SELECT store_id FROM stores WHERE store_id = ? LIMIT 1');
        $stmt->execute([$storeId]);
        if (!$stmt->fetch()) {
            json_error('Data tidak ditemukan.', 404, null);
        }
        return $user;
    }

    if ($role === 'seller') {
        $stmt = $pdo->prepare('SELECT s.store_id FROM stores s LEFT JOIN store_members sm ON sm.store_id = s.store_id WHERE s.store_id = ? AND (s.owner_user_id = ? OR sm.user_id = ? AND sm.status = "active") LIMIT 1');
        $stmt->execute([$storeId, $user['user_id'], $user['user_id']]);
        if (!$stmt->fetch()) {
            json_error('Data tidak ditemukan.', 404, null);
        }
        $_SESSION['store_id'] = $storeId;
        return $user;
    }

    json_error('Tidak memiliki akses.', 403, null);
}