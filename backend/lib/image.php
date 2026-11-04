<?php
declare(strict_types=1);

function product_primary_image_url(PDO $pdo, string $productId): ?string
{
    $stmt = $pdo->prepare(
        "SELECT f.storage_path
         FROM product_images pi
         JOIN files f ON f.file_id = pi.file_id
         WHERE pi.product_id = ?
           AND f.deleted_at IS NULL
           AND f.visibility = 'public'
         ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.created_at ASC
         LIMIT 1"
    );
    $stmt->execute([$productId]);
    $path = $stmt->fetchColumn();

    if ($path === false || $path === null || $path === '') {
        return null;
    }

    $path = (string) $path;
    if (preg_match('#^https?://#i', $path)) {
        return $path;
    }

    return '/' . ltrim($path, '/');
}