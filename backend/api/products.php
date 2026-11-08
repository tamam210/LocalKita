<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/image.php';
require_once __DIR__ . '/../lib/validate.php';
require_once __DIR__ . '/../lib/etalase.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

handle_preflight();

session_start_secure();

try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('[products] db failed: ' . $e->getMessage());
    json_error('Gagal terhubung ke database.', 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function slugify_produk(string $teks): string
{
    $slug = strtolower(trim($teks));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    $slug = trim($slug, '-');
    if ($slug === '') {
        $slug = 'produk';
    }
    return substr($slug, 0, 160);
}

if ($method === 'POST') {
    $user = require_role(['seller', 'admin']);
    $input = read_json_body();

    require_fields($input, ['name', 'price', 'stock']);

    $name = validate_string($input['name'], 'name', 2, 180);
    $price = validate_int($input['price'], 'price', 0, 1000000000);
    $stock = validate_int($input['stock'], 'stock', 0, 1000000);
    $hppUnit = array_key_exists('hpp_unit', $input) && $input['hpp_unit'] !== ''
        ? validate_number($input['hpp_unit'], 'hpp_unit', 0, 1000000000)
        : 0.0;
    $description = array_key_exists('description', $input) && $input['description'] !== null
        ? validate_string($input['description'], 'description', null, 5000)
        : null;
    $status = validate_enum($input['status'] ?? 'active', 'status', ['draft', 'active', 'inactive']);
    $earnsPoints = validate_boolean($input['earns_points'] ?? true, 'earns_points');
    $pointMultiplier = array_key_exists('point_multiplier', $input) && $input['point_multiplier'] !== ''
        ? validate_number($input['point_multiplier'], 'point_multiplier', 0.1, 100)
        : 1.0;

    $storeId = trim((string) ($input['store_id'] ?? ''));
    if ($storeId === '') {
        $storeId = trim((string) ($user['store_id'] ?? ''));
    }
    if ($storeId === '' && ($user['role'] ?? null) === 'seller') {
        $st = $pdo->prepare('SELECT store_id FROM stores WHERE owner_user_id = ? AND deleted_at IS NULL LIMIT 1');
        $st->execute([$user['user_id']]);
        $storeId = trim((string) ($st->fetchColumn() ?: ''));
    }
    if ($storeId === '') {
        validation_error('store_id', 'Toko wajib dipilih.');
    }
    $storeId = validate_uuid($storeId, 'store_id');
    require_store_access($pdo, $storeId);

    $categoryId = is_string($input['category_id'] ?? null) ? trim($input['category_id']) : '';
    if ($categoryId !== '') {
        $categoryId = validate_uuid($categoryId, 'category_id');
        $cat = $pdo->prepare("SELECT category_id FROM categories WHERE category_id = ? AND type = 'product' LIMIT 1");
        $cat->execute([$categoryId]);
        if (!$cat->fetch()) {
            validation_error('category_id', 'Kategori tidak ditemukan.');
        }
    } else {
        $categoryId = null;
    }

    $slugInput = is_string($input['slug'] ?? null) ? trim($input['slug']) : '';
    $slug = slugify_produk($slugInput !== '' ? $slugInput : $name);
    $slugBase = $slug;
    $slugSuffix = 2;
    $cekSlug = $pdo->prepare('SELECT product_id FROM products WHERE store_id = ? AND slug = ? LIMIT 1');
    while (true) {
        $cekSlug->execute([$storeId, $slug]);
        if (!$cekSlug->fetch()) {
            break;
        }
        $suffix = '-' . $slugSuffix++;
        $slug = substr($slugBase, 0, 160 - strlen($suffix)) . $suffix;
    }

    $productId = $pdo->query('SELECT UUID()')->fetchColumn();
    $variantId = $pdo->query('SELECT UUID()')->fetchColumn();

    $skuInput = is_string($input['sku'] ?? null) ? trim($input['sku']) : '';
    if ($skuInput !== '') {
        $sku = strtoupper(preg_replace('/[^A-Za-z0-9._-]+/', '-', $skuInput) ?? '');
        $sku = substr(trim($sku, '-'), 0, 80);
        if ($sku === '') {
            validation_error('sku', 'SKU tidak valid.');
        }
        $cekSku = $pdo->prepare('SELECT variant_id FROM product_variants WHERE store_id = ? AND sku = ? LIMIT 1');
        $cekSku->execute([$storeId, $sku]);
        if ($cekSku->fetch()) {
            json_error('SKU sudah dipakai produk lain.', 409, ['sku' => 'Gunakan SKU lain.'], 'CONFLICT');
        }
    } else {
        $skuBase = 'PRD-' . strtoupper(substr(str_replace('-', '', $productId), 0, 8));
        $sku = $skuBase;
        $skuSuffix = 2;
        $cekSku = $pdo->prepare('SELECT variant_id FROM product_variants WHERE store_id = ? AND sku = ? LIMIT 1');
        while (true) {
            $cekSku->execute([$storeId, $sku]);
            if (!$cekSku->fetch()) {
                break;
            }
            $sku = $skuBase . '-' . $skuSuffix++;
        }
    }

    $variantName = isset($input['variant_name']) && $input['variant_name'] !== ''
        ? validate_string($input['variant_name'], 'variant_name', 1, 120)
        : 'Default';

    try {
        $pdo->beginTransaction();

        $ins = $pdo->prepare(
            'INSERT INTO products (product_id, store_id, category_id, slug, name, description, earns_points, point_multiplier, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $ins->execute([
            $productId,
            $storeId,
            $categoryId,
            $slug,
            $name,
            $description,
            $earnsPoints ? 1 : 0,
            $pointMultiplier,
            $status,
        ]);

        $insVariant = $pdo->prepare(
            "INSERT INTO product_variants (variant_id, product_id, store_id, sku, name, price, hpp_unit, stock, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')"
        );
        $insVariant->execute([
            $variantId,
            $productId,
            $storeId,
            $sku,
            $variantName,
            $price,
            $hppUnit,
            $stock,
        ]);

        if ($stock > 0) {
            $insMovement = $pdo->prepare(
                "INSERT INTO stock_movements (movement_id, store_id, variant_id, type, quantity, note)
                 VALUES (UUID(), ?, ?, 'in', ?, 'Stok awal produk')"
            );
            $insMovement->execute([$storeId, $variantId, $stock]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e instanceof PDOException && $e->getCode() === '23000') {
            json_error('Slug atau SKU sudah dipakai produk lain.', 409, null, 'CONFLICT');
        }
        error_log('[products] create failed: ' . $e->getMessage());
        json_error('Gagal menyimpan produk.', 500);
    }

    audit_log($pdo, 'product.create', 'product', $productId, [
        'store_id' => $storeId,
        'name' => $name,
        'status' => $status,
    ]);

    json_success([
        'product_id' => $productId,
        'store_id' => $storeId,
        'category_id' => $categoryId,
        'slug' => $slug,
        'name' => $name,
        'status' => $status,
        'variant_id' => $variantId,
        'sku' => $sku,
        'price' => $price,
        'stock' => $stock,
    ], 'Produk berhasil ditambahkan.', 201);
}

if ($method !== 'GET') {
    json_error('Method tidak diizinkan.', 405, null);
}

$user = auth_user();
$canSeeHpp = false;
$ownerStoreIds = [];

if ($user) {
    $role = $user['role'] ?? null;
    if ($role === 'admin') {
        $canSeeHpp = true;
    } elseif ($role === 'seller') {
        $canSeeHpp = true;
        if (!empty($user['user_id'])) {
            $st = $pdo->prepare('SELECT store_id FROM stores WHERE owner_user_id = ?');
            $st->execute([$user['user_id']]);
            while ($r = $st->fetch()) {
                if (!empty($r['store_id'])) {
                    $ownerStoreIds[$r['store_id']] = true;
                }
            }
            $sm = $pdo->prepare("SELECT store_id FROM store_members WHERE user_id = ? AND status = 'active'");
            $sm->execute([$user['user_id']]);
            while ($r = $sm->fetch()) {
                if (!empty($r['store_id'])) {
                    $ownerStoreIds[$r['store_id']] = true;
                }
            }
        }
        if (!empty($user['store_id'])) {
            $ownerStoreIds[$user['store_id']] = true;
        }
    }
}

$productId = $_GET['product_id'] ?? null;
if ($productId !== null && $productId !== '') {
    $stmt = $pdo->prepare(
        "SELECT p.product_id, p.store_id, p.category_id, p.slug, p.name, p.description, p.status, p.earns_points, p.point_multiplier, p.created_at, p.updated_at,
                s.name AS store_name, c.name AS category_name
         FROM products p
         LEFT JOIN stores s ON s.store_id = p.store_id
         LEFT JOIN categories c ON c.category_id = p.category_id
         WHERE p.product_id = ?
         LIMIT 1"
    );
    $stmt->execute([$productId]);
    $product = $stmt->fetch();

    if (!$product) {
        json_error('Produk tidak ditemukan.', 404, null);
    }

    $isOwner = !empty($ownerStoreIds[$product['store_id']]);
    if (!$isOwner && ($product['status'] ?? '') !== 'active') {
        json_error('Produk tidak ditemukan.', 404, null);
    }

    $vstmt = $pdo->prepare(
        'SELECT variant_id, sku, name, price, hpp_unit, stock, status
         FROM product_variants
         WHERE product_id = ?
         ORDER BY created_at ASC, variant_id ASC'
    );
    $vstmt->execute([$productId]);
    $variants = [];

    while ($v = $vstmt->fetch()) {
        $row = [
            'variant_id' => $v['variant_id'],
            'sku' => $v['sku'],
            'name' => $v['name'],
            'price' => (int)($v['price'] ?? 0),
            'stock' => (int)($v['stock'] ?? 0),
            'status' => $v['status'],
        ];
        if ($canSeeHpp && $isOwner) {
            $row['hpp_unit'] = $v['hpp_unit'] === null ? null : (int)$v['hpp_unit'];
        } else {
            $row['hpp_unit'] = null;
        }
        $variants[] = $row;
    }

    $data = [
        'product_id' => $product['product_id'],
        'store_id' => $product['store_id'],
        'store_name' => $product['store_name'],
        'category_id' => $product['category_id'],
        'category_name' => $product['category_name'],
        'slug' => $product['slug'],
        'name' => $product['name'],
        'description' => $product['description'],
        'status' => $product['status'],
        'earns_points' => (bool)($product['earns_points'] ?? false),
        'point_multiplier' => $product['point_multiplier'] !== null ? (float)$product['point_multiplier'] : 1.0,
        'primary_image_url' => product_primary_image_url($pdo, $product['product_id']),
        'variants' => $variants,
        'created_at' => $product['created_at'],
        'updated_at' => $product['updated_at'],
    ];

    json_success($data, 'Detail produk berhasil diambil.');
}

$isEtalase = isset($_GET['etalase']) && $_GET['etalase'] === '1';

if ($isEtalase) {
    ensure_etalase_minimum($pdo, 35);
}

$q = trim($_GET['q'] ?? '');
$categoryId = $_GET['category_id'] ?? null;
$storeId = $_GET['store_id'] ?? null;
$status = $_GET['status'] ?? 'active';
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 12;
if ($perPage < 1) {
    $perPage = 12;
}
if ($perPage > 50) {
    $perPage = 50;
}
$sort = $_GET['sort'] ?? 'newest';
$seed = isset($_GET['seed'])
    ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $_GET['seed'])
    : '';
if ($seed === '') {
    $seed = bin2hex(random_bytes(8));
}
$userId = (string) ($user['user_id'] ?? '');

$where = [];
$params = [];

if ($q !== '') {
    $where[] = '(p.name LIKE ? OR p.slug LIKE ? OR c.name LIKE ? OR s.name LIKE ?)';
    $like = '%' . $q . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}
if ($categoryId !== null && $categoryId !== '') {
    $where[] = 'p.category_id = ?';
    $params[] = $categoryId;
}
if ($storeId !== null && $storeId !== '') {
    $where[] = 'p.store_id = ?';
    $params[] = $storeId;
}

if (!$isEtalase && $user && ($user['role'] ?? null) === 'seller') {
    if ($storeId !== null && $storeId !== '') {
        if (empty($ownerStoreIds[$storeId])) {
            json_error('Data tidak ditemukan.', 404, null);
        }
        if (isset($_GET['status']) && $_GET['status'] !== '') {
            $where[] = 'p.status = ?';
            $params[] = $_GET['status'];
        }
    } else {
        if (!empty($ownerStoreIds)) {
            $placeholders = implode(',', array_fill(0, count($ownerStoreIds), '?'));
            $where[] = "p.store_id IN ($placeholders)";
            foreach (array_keys($ownerStoreIds) as $sid) {
                $params[] = $sid;
            }
            if (isset($_GET['status']) && $_GET['status'] !== '') {
                $where[] = 'p.status = ?';
                $params[] = $_GET['status'];
            } else {
                $where[] = "p.status IN ('active','draft','inactive')";
            }
        } else {
            $where[] = "p.status = 'active'";
        }
    }
} else {
    $where[] = "p.status = 'active'";
}

$sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$countSql = "SELECT COUNT(DISTINCT p.product_id) AS total
             FROM products p
             LEFT JOIN stores s ON s.store_id = p.store_id
             LEFT JOIN categories c ON c.category_id = p.category_id
             $sqlWhere";
$cstmt = $pdo->prepare($countSql);
$cstmt->execute($params);
$total = (int)($cstmt->fetch()['total'] ?? 0);

$fromRekomendasi = '';
$listParams = $params;

if ($sort === 'rekomendasi') {
    $fromRekomendasi = "
           LEFT JOIN (
               SELECT pv.product_id,
                      SUM(oi.quantity) AS qty,
                      MAX(o.created_at) AS terakhir
               FROM orders o
               JOIN order_items oi ON oi.order_id = o.order_id
               JOIN product_variants pv ON pv.variant_id = oi.variant_id
               WHERE o.buyer_user_id = ?
                 AND o.status NOT IN ('cancelled', 'refunded')
               GROUP BY pv.product_id
           ) r ON r.product_id = p.product_id
           LEFT JOIN (
               SELECT f.product_id,
                      MAX(f.created_at) AS favorit_at
               FROM favorites f
               WHERE f.user_id = ?
               GROUP BY f.product_id
           ) fv ON fv.product_id = p.product_id";

    $listParams = array_merge(
        [$userId, $userId],
        $params,
        [$userId . ':' . $seed]
    );
}

$orderBy = 'p.created_at DESC';
if ($sort === 'price_asc') {
    $orderBy = 'min_price ASC';
} elseif ($sort === 'price_desc') {
    $orderBy = 'min_price DESC';
} elseif ($sort === 'name_asc') {
    $orderBy = 'p.name ASC';
} elseif ($sort === 'newest') {
    $orderBy = 'p.created_at DESC';
} elseif ($sort === 'rekomendasi') {
    $orderBy = "CASE
                    WHEN r.product_id IS NOT NULL THEN 0
                    WHEN fv.product_id IS NOT NULL THEN 1
                    ELSE 2
                END,
                r.qty DESC,
                r.terakhir DESC,
                fv.favorit_at DESC,
                MD5(CONCAT(p.product_id, ?))";
} elseif ($sort === 'random') {
    $orderBy = 'RAND(' . crc32($seed) . ')';
}

$offset = ($page - 1) * $perPage;
$listSql = "SELECT p.product_id, p.store_id, p.category_id, p.slug, p.name, p.description, p.status, p.earns_points, p.point_multiplier, p.created_at, p.updated_at,
                  s.name AS store_name, c.name AS category_name,
                  (SELECT MIN(price) FROM product_variants pv WHERE pv.product_id = p.product_id AND pv.status = 'active') AS min_price,
                  (SELECT MAX(price) FROM product_variants pv WHERE pv.product_id = p.product_id AND pv.status = 'active') AS max_price,
                  (SELECT COALESCE(SUM(stock),0) FROM product_variants pv WHERE pv.product_id = p.product_id AND pv.status = 'active') AS total_stock
           FROM products p
           LEFT JOIN stores s ON s.store_id = p.store_id
           LEFT JOIN categories c ON c.category_id = p.category_id
           $fromRekomendasi
           $sqlWhere
           ORDER BY $orderBy
           LIMIT $perPage OFFSET $offset";
$lstmt = $pdo->prepare($listSql);
$lstmt->execute($listParams);

$items = [];
while ($row = $lstmt->fetch()) {
    $pid = $row['product_id'];
    $isOwner = !empty($ownerStoreIds[$row['store_id']]);
    $vstmt = $pdo->prepare("SELECT variant_id, sku, name, price, hpp_unit, stock, status FROM product_variants WHERE product_id = ? AND status = 'active' ORDER BY created_at ASC, variant_id ASC");
    $vstmt->execute([$pid]);
    $variants = [];
    while ($v = $vstmt->fetch()) {
        $vr = [
            'variant_id' => $v['variant_id'],
            'sku' => $v['sku'],
            'name' => $v['name'],
            'price' => (int)($v['price'] ?? 0),
            'stock' => (int)($v['stock'] ?? 0),
            'status' => $v['status'],
        ];
        if ($canSeeHpp && $isOwner) {
            $vr['hpp_unit'] = $v['hpp_unit'] === null ? null : (int)$v['hpp_unit'];
        } else {
            $vr['hpp_unit'] = null;
        }
        $variants[] = $vr;
    }

    $items[] = [
        'product_id' => $row['product_id'],
        'store_id' => $row['store_id'],
        'store_name' => $row['store_name'],
        'category_id' => $row['category_id'],
        'category_name' => $row['category_name'],
        'slug' => $row['slug'],
        'name' => $row['name'],
        'description' => $row['description'],
        'status' => $row['status'],
        'earns_points' => (bool)($row['earns_points'] ?? false),
        'point_multiplier' => $row['point_multiplier'] !== null ? (float)$row['point_multiplier'] : 1.0,
        'primary_image_url' => product_primary_image_url($pdo, $row['product_id']),
        'min_price' => $row['min_price'] !== null ? (int)$row['min_price'] : null,
        'max_price' => $row['max_price'] !== null ? (int)$row['max_price'] : null,
        'total_stock' => (int)($row['total_stock'] ?? 0),
        'variants' => $variants,
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

$totalPages = $perPage > 0 ? (int)ceil($total / $perPage) : 1;

json_success([
    'items' => $items,
    'pagination' => [
        'page' => $page,
        'per_page' => $perPage,
        'total' => $total,
        'total_pages' => $totalPages,
    ],
], 'Daftar produk berhasil diambil.');
