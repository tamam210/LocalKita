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

final class OrderException extends RuntimeException {}

handle_preflight();
session_start_secure();

try {
    $pdo = db();
} catch (Throwable $e) {
    error_log('[orders] db failed: ' . $e->getMessage());
    json_error('Gagal terhubung ke database.', 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? 'create';

if ($method !== 'POST') {
    json_error('Metode tidak diizinkan. Gunakan POST.', 405);
}

if ($action !== 'create') {
    json_error('Action tidak valid.', 400);
}

$user = require_auth();
$input = read_json_body();
$rawItems = $input['items'] ?? null;

if (!is_array($rawItems) || $rawItems === []) {
    validation_error('items', 'Pesanan minimal berisi satu produk.');
}

$items = [];

foreach ($rawItems as $index => $raw) {
    if (!is_array($raw)) {
        validation_error('items.' . $index, 'Item tidak valid.');
    }

    $productId = validate_uuid(
        $raw['product_id'] ?? '',
        'items.' . $index . '.product_id'
    );

    $quantity = validate_int(
        $raw['quantity'] ?? $raw['qty'] ?? 1,
        'items.' . $index . '.quantity',
        1,
        1000
    );

    $variantId = '';
    if (
        array_key_exists('variant_id', $raw)
        && $raw['variant_id'] !== null
        && $raw['variant_id'] !== ''
    ) {
        $variantId = validate_uuid(
            $raw['variant_id'],
            'items.' . $index . '.variant_id'
        );
    }

    $key = $productId . '|' . $variantId;

    if (isset($items[$key])) {
        $items[$key]['quantity'] += $quantity;
    } else {
        $items[$key] = [
            'product_id' => $productId,
            'variant_id' => $variantId,
            'quantity' => $quantity,
        ];
    }
}

$pdo->beginTransaction();

try {
    $lines = [];

    foreach ($items as $item) {
        $sql = "SELECT p.product_id,
                       p.store_id,
                       p.name AS product_name,
                       pv.variant_id,
                       pv.name AS variant_name,
                       pv.price,
                       pv.stock,
                       pv.hpp_unit
                FROM products p
                JOIN product_variants pv ON pv.product_id = p.product_id
                WHERE p.product_id = ?
                  AND p.status = 'active'
                  AND p.deleted_at IS NULL
                  AND pv.status = 'active'";

        $params = [$item['product_id']];

        if ($item['variant_id'] !== '') {
            $sql .= ' AND pv.variant_id = ?';
            $params[] = $item['variant_id'];
        }

        $sql .= ' ORDER BY pv.created_at ASC, pv.variant_id ASC LIMIT 1 FOR UPDATE';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();

        if (!$row) {
            throw new OrderException('Produk tidak ditemukan atau sudah tidak aktif.');
        }

        $stock = (int) ($row['stock'] ?? 0);
        if ($stock < $item['quantity']) {
            throw new OrderException(
                'Stok ' . $row['product_name'] . ' tidak cukup.'
            );
        }

        $price = (int) ($row['price'] ?? 0);
        if ($price < 0) {
            throw new OrderException('Harga produk tidak valid.');
        }

        $lineTotal = $price * $item['quantity'];

        $lines[] = [
            'product_id' => $row['product_id'],
            'store_id' => $row['store_id'],
            'variant_id' => $row['variant_id'],
            'product_name' => $row['product_name'],
            'variant_name' => $row['variant_name'],
            'price' => $price,
            'quantity' => $item['quantity'],
            'hpp_unit' => (float) ($row['hpp_unit'] ?? 0),
            'line_total' => $lineTotal,
        ];
    }

    $groups = [];

    foreach ($lines as $line) {
        $groups[$line['store_id']][] = $line;
    }

    $hasil = [];

    foreach ($groups as $storeId => $storeLines) {
        $orderId = (string) $pdo->query('SELECT UUID()')->fetchColumn();
        $orderNumber = 'ORD-' . date('YmdHis') . '-' . strtoupper(
            substr(bin2hex(random_bytes(4)), 0, 6)
        );

        $subtotal = 0;
        foreach ($storeLines as $line) {
            $subtotal += $line['line_total'];
        }

        $insOrder = $pdo->prepare(
            "INSERT INTO orders
                (order_id, order_number, store_id, buyer_user_id, status,
                 fulfillment_method, subtotal, discount_total, shipping_cost, total_amount)
             VALUES (?, ?, ?, ?, 'pending', 'pickup', ?, 0, 0, ?)"
        );

        $insOrder->execute([
            $orderId,
            $orderNumber,
            $storeId,
            $user['user_id'],
            $subtotal,
            $subtotal,
        ]);

        $insItem = $pdo->prepare(
            "INSERT INTO order_items
                (order_item_id, order_id, variant_id, product_name_snapshot,
                 variant_name_snapshot, quantity, unit_price, hpp_unit_snapshot, line_total)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)"
        );

        $updateStock = $pdo->prepare(
            'UPDATE product_variants
             SET stock = stock - ?
             WHERE variant_id = ? AND stock >= ?'
        );

        $insMovement = $pdo->prepare(
            "INSERT INTO stock_movements
                (movement_id, store_id, variant_id, type, quantity, reference_id, note)
             VALUES (UUID(), ?, ?, 'sale', ?, ?, ?)"
        );

        foreach ($storeLines as $line) {
            $insItem->execute([
                $orderId,
                $line['variant_id'],
                $line['product_name'],
                $line['variant_name'],
                $line['quantity'],
                $line['price'],
                $line['hpp_unit'],
                $line['line_total'],
            ]);

            $updateStock->execute([
                $line['quantity'],
                $line['variant_id'],
                $line['quantity'],
            ]);

            if ($updateStock->rowCount() < 1) {
                throw new OrderException(
                    'Stok berubah saat pesanan dibuat. Coba lagi.'
                );
            }

            $insMovement->execute([
                $storeId,
                $line['variant_id'],
                $line['quantity'],
                $orderId,
                'Pesanan ' . $orderNumber,
            ]);
        }

        $hasil[] = [
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'store_id' => $storeId,
            'subtotal' => $subtotal,
            'total_amount' => $subtotal,
            'items' => count($storeLines),
        ];
    }

    $pdo->commit();

    foreach ($hasil as $order) {
        audit_log($pdo, 'order.create', 'order', $order['order_id'], [
            'store_id' => $order['store_id'],
            'total_amount' => $order['total_amount'],
        ]);
    }

    json_success([
        'orders' => $hasil,
    ], 'Pesanan berhasil dibuat.', 201);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof OrderException) {
        json_error($e->getMessage(), 400, null, 'ORDER_FAILED');
    }

    error_log('[orders] create failed: ' . $e->getMessage());
    json_error('Gagal membuat pesanan.', 500);
}