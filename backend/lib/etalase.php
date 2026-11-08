<?php
declare(strict_types=1);

function etalase_uuid(string $prefix, int $index): string
{
    return $prefix . str_pad((string) $index, 12, '0', STR_PAD_LEFT);
}

function etalase_max_index(PDO $pdo, string $table, string $column, string $prefix): int
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(MAX(CAST(SUBSTRING($column, -12) AS UNSIGNED)), 0)
         FROM $table
         WHERE $column LIKE ?"
    );
    $stmt->execute([$prefix . '%']);

    return (int) $stmt->fetchColumn();
}

function ensure_etalase_minimum(PDO $pdo, int $minimum = 35): void
{
    $stmt = $pdo->query(
        "SELECT COUNT(*)
         FROM products
         WHERE status = 'active' AND deleted_at IS NULL"
    );
    $total = (int) $stmt->fetchColumn();

    if ($total >= $minimum) {
        return;
    }

    $need = $minimum - $total;
    $perSeller = 5;
    $sellerNeed = max(1, (int) ceil($need / $perSeller));

    $userPrefix = '90000000-0000-4000-8000-';
    $storePrefix = '91000000-0000-4000-8000-';
    $productPrefix = '92000000-0000-4000-8000-';
    $variantPrefix = '93000000-0000-4000-8000-';
    $memberPrefix = '94000000-0000-4000-8000-';

    $userStart = etalase_max_index($pdo, 'users', 'user_id', $userPrefix) + 1;
    $storeStart = etalase_max_index($pdo, 'stores', 'store_id', $storePrefix) + 1;
    $productStart = etalase_max_index($pdo, 'products', 'product_id', $productPrefix) + 1;
    $variantStart = etalase_max_index($pdo, 'product_variants', 'variant_id', $variantPrefix) + 1;
    $memberStart = etalase_max_index($pdo, 'store_members', 'store_member_id', $memberPrefix) + 1;

    $categories = $pdo->query(
        "SELECT category_id FROM categories WHERE type = 'product' ORDER BY name ASC"
    )->fetchAll(PDO::FETCH_COLUMN);

    $names = [
        'Keripik Singkong Pedas', 'Tas Anyaman Pandan', 'Kopi Robusta Lokal',
        'Batik Tulis Klasik', 'Sambal Roa Asli', 'Laundry Kiloan Cepat',
        'Risoles Frozen Homemade', 'Teh Melati Botol', 'Brownies Kukus Cokelat',
        'Kerajinan Bambu Mini', 'Madu Hutan Murni', 'Sabun Herbal Sereh',
        'Kaos Sablon Lokal', 'Dompet Kulit Handmade', 'Tempe Mendoan Frozen',
        'Peyek Kacang Renyah', 'Kopi Susu Gula Aren', 'Kue Lumpur Pandan',
        'Anyaman Rotan Bulat', 'Syal Tenun Ikat', 'Minyak Kelapa Asli',
        'Kerupuk Udang Mentah', 'Rengginang Pulut', 'Keripik Pisang Manis',
        'Es Cincau Botol', 'Sirup Markisa', 'Abon Ayam Pedas',
        'Sambal Bawang Kemasan', 'Gelang Manik Handmade', 'Topi Rajut Lokal',
        'Sepatu Kanvas Custom', 'Madu Kaliandra', 'Kopi Arabika Gayo',
        'Teh Herbal Jahe', 'Roti Sobek Cokelat', 'Bolu Pandan Mini',
        'Keranjang Rotan', 'Vas Bunga Keramik', 'Lilin Aromaterapi',
        'Tas Kanvas Sablon',
    ];

    $hash = '$2y$12$z6C5hm2R77DAye0eVFBpdOWPuViNeSlh0lIzaq7YnNaivoiZIZj4O';

    $insUser = $pdo->prepare(
        "INSERT IGNORE INTO users
         (user_id, email, phone, full_name, password_hash, role, status, email_verified_at, two_factor_enabled)
         VALUES (?, ?, ?, ?, ?, 'seller', 'active', NOW(), 0)"
    );
    $insStore = $pdo->prepare(
        "INSERT IGNORE INTO stores
         (store_id, owner_user_id, category_id, slug, name, description, address, city, province, operational_hours, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')"
    );
    $insMember = $pdo->prepare(
        "INSERT IGNORE INTO store_members
         (store_member_id, store_id, user_id, role, status)
         VALUES (?, ?, ?, 'owner', 'active')"
    );
    $insProduct = $pdo->prepare(
        "INSERT IGNORE INTO products
         (product_id, store_id, category_id, slug, name, description, earns_points, point_multiplier, status)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1.00, 'active')"
    );
    $insVariant = $pdo->prepare(
        "INSERT IGNORE INTO product_variants
         (variant_id, product_id, store_id, sku, name, price, hpp_unit, stock, status)
         VALUES (?, ?, ?, ?, 'Default', ?, ?, ?, 'active')"
    );

    try {
        $pdo->beginTransaction();

        for ($i = 0; $i < $sellerNeed; $i++) {
            $sellerIndex = $userStart + $i;
            $storeIndex = $storeStart + $i;
            $userId = etalase_uuid($userPrefix, $sellerIndex);
            $storeId = etalase_uuid($storePrefix, $storeIndex);
            $memberId = etalase_uuid($memberPrefix, $memberStart + $i);
            $nomor = str_pad((string) $sellerIndex, 2, '0', STR_PAD_LEFT);

            $insUser->execute([
                $userId,
                'dummy.seller' . $nomor . '@lokalkita.test',
                '08129999' . str_pad((string) $sellerIndex, 4, '0', STR_PAD_LEFT),
                'Penjual Demo ' . $nomor,
                $hash,
            ]);

            $insStore->execute([
                $storeId,
                $userId,
                $categories ? $categories[0] : null,
                'warung-demo-' . $sellerIndex,
                'Warung Lokal ' . $nomor,
                'Toko contoh untuk melengkapi etalase LokalKita.',
                'Jl. Contoh No. ' . $sellerIndex,
                'Bandung',
                'Jawa Barat',
                '08.00-20.00',
            ]);

            $insMember->execute([$memberId, $storeId, $userId]);
        }

        for ($i = 0; $i < $need; $i++) {
            $sellerOffset = $i % $sellerNeed;
            $storeId = etalase_uuid($storePrefix, $storeStart + $sellerOffset);
            $productIndex = $productStart + $i;
            $variantIndex = $variantStart + $i;
            $productId = etalase_uuid($productPrefix, $productIndex);
            $variantId = etalase_uuid($variantPrefix, $variantIndex);
            $name = $names[$i % count($names)];
            $price = 7000 + (($productIndex * 3500) % 90000);
            $stock = 5 + ($productIndex % 20);
            $categoryId = $categories ? $categories[$i % count($categories)] : null;

            $insProduct->execute([
                $productId,
                $storeId,
                $categoryId,
                'produk-demo-' . $productIndex,
                $name,
                'Produk contoh untuk melengkapi etalase LokalKita.',
            ]);

            $insVariant->execute([
                $variantId,
                $productId,
                $storeId,
                'DUMMY-' . $productIndex,
                $price,
                (int) round($price * 0.6),
                $stock,
            ]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[etalase] dummy gagal dibuat: ' . $e->getMessage());
    }
}
