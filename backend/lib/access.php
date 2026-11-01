<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function store_exists(PDO $pdo, string $storeId): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM stores WHERE store_id = ? AND deleted_at IS NULL LIMIT 1'
    );
    $stmt->execute([$storeId]);

    return (bool) $stmt->fetchColumn();
}

function user_can_access_store(PDO $pdo, string $storeId, array $user): bool
{
    if (($user['role'] ?? null) === 'admin') {
        return true;
    }

    if (($user['role'] ?? null) !== 'seller') {
        return false;
    }

    $userId = $user['user_id'] ?? null;

    if (!is_string($userId) || $userId === '') {
        return false;
    }

    $stmt = $pdo->prepare(
        'SELECT 1 FROM stores
         WHERE store_id = ? AND owner_user_id = ? AND deleted_at IS NULL
         LIMIT 1'
    );
    $stmt->execute([$storeId, $userId]);

    if ($stmt->fetchColumn()) {
        return true;
    }

    $stmt = $pdo->prepare(
        "SELECT 1 FROM store_members
         WHERE store_id = ? AND user_id = ? AND status = 'active'
         LIMIT 1"
    );
    $stmt->execute([$storeId, $userId]);

    return (bool) $stmt->fetchColumn();
}
