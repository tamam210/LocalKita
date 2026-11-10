<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/response.php';
require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/session.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/access.php';
require_once __DIR__ . '/../lib/validate.php';
require_once __DIR__ . '/../lib/image.php';

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

function order_ui_status(string $status, string $paymentStatus = 'pending'): string
{
    if (in_array($status, ['cancelled', 'refunded'], true)) {
        return 'batal';
    }

    if ($status === 'completed') {
        return $paymentStatus === 'verified' ? 'lunas' : 'selesai';
    }

    if (in_array($status, ['processing', 'confirmed', 'shipped'], true)) {
        return 'dikerjakan';
    }

    return 'antrian';
}

function order_db_status(string $uiStatus): string
{
    return match ($uiStatus) {
        'dikerjakan' => 'processing',
        'selesai', 'lunas' => 'completed',
        'batal' => 'cancelled',
        default => 'pending',
    };
}

function order_can_change(string $current, string $next): bool
{
    $allowed = [
        'antrian' => ['dikerjakan', 'batal'],
        'dikerjakan' => ['selesai', 'batal'],
        'selesai' => ['lunas'],
        'lunas' => [],
        'batal' => [],
    ];

    return in_array($next, $allowed[$current] ?? [], true);
}

function order_items_by_order(PDO $pdo, array $orderIds): array
{
    $orderIds = array_values(array_unique(array_filter($orderIds)));
    if ($orderIds === []) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT oi.order_id, oi.order_item_id, oi.variant_id,
                oi.product_name_snapshot, oi.variant_name_snapshot,
                oi.quantity, oi.unit_price, oi.line_total,
                pv.product_id
         FROM order_items oi
         LEFT JOIN product_variants pv ON pv.variant_id = oi.variant_id
         WHERE oi.order_id IN ($placeholders)
         ORDER BY oi.created_at ASC, oi.order_item_id ASC"
    );
    $stmt->execute($orderIds);

    $hasil = [];
    while ($row = $stmt->fetch()) {
        $row['quantity'] = (int) $row['quantity'];
        $row['unit_price'] = (int) $row['unit_price'];
        $row['line_total'] = (int) $row['line_total'];
        $row['product_name'] = (string) ($row['product_name_snapshot'] ?? 'Produk');
        $row['variant_name'] = $row['variant_name_snapshot'];
        $row['image_url'] = !empty($row['product_id'])
            ? product_primary_image_url($pdo, (string) $row['product_id'])
            : null;
        $hasil[(string) $row['order_id']][] = $row;
    }

    return $hasil;
}

function order_rows_response(PDO $pdo, array $rows): array
{
    $items = order_items_by_order($pdo, array_column($rows, 'order_id'));
    $hasil = [];

    foreach ($rows as $row) {
        $orderId = (string) $row['order_id'];
        $paymentStatus = (string) ($row['payment_status'] ?? 'pending');
        $dbStatus = (string) ($row['db_status'] ?? 'pending');
        $orderItems = $items[$orderId] ?? [];

        $row['order_id'] = $orderId;
        $row['status'] = order_ui_status($dbStatus, $paymentStatus);
        $row['db_status'] = $dbStatus;
        $row['payment_status'] = $paymentStatus;
        $row['subtotal'] = (int) ($row['subtotal'] ?? 0);
        $row['total_amount'] = (int) ($row['total_amount'] ?? 0);
        $row['items'] = $orderItems;
        $row['item_count'] = count($orderItems);
        $row['total_qty'] = array_sum(array_column($orderItems, 'quantity'));
        unset($row['owner_user_id']);
        $hasil[] = $row;
    }
    
        $row['payment'] = [
        'method' => ($row['payment_method'] ?? '') !== ''
            ? $row['payment_method']
            : null,
        'status' => $paymentStatus,
        'online_enabled' => (bool) ($row['payment_online_enabled'] ?? false),
        'bank_name' => $row['payment_bank_name'] ?? null,
        'account_number' => $row['payment_account_number'] ?? null,
        'account_name' => $row['payment_account_name'] ?? null,
        'va_number' => $row['payment_va_number'] ?? null,
        'qris_image_url' => $row['payment_qris_image_url'] ?? null,
        'instructions' => $row['payment_instructions'] ?? null,
    ];

    return $hasil;
}

function order_fetch_order(PDO $pdo, string $orderId): array
{
    $stmt = $pdo->prepare(
        "SELECT o.*, s.owner_user_id,
                COALESCE((
                    SELECT p.status
                    FROM payments p
                    WHERE p.order_id = o.order_id
                    ORDER BY p.created_at DESC, p.payment_id DESC
                    LIMIT 1
                ), 'pending') AS payment_status
         FROM orders o
         JOIN stores s ON s.store_id = o.store_id
         WHERE o.order_id = ?
         LIMIT 1"
    );
    $stmt->execute([$orderId]);
    $row = $stmt->fetch();

    if (!$row) {
        json_error('Pesanan tidak ditemukan.', 404);
    }

    return $row;
}

function order_set_payment_verified(
    PDO $pdo,
    string $orderId,
    string $storeId,
    int $amount,
    string $method = 'manual_transfer'
): void {
    $stmt = $pdo->prepare(
        'SELECT payment_id
         FROM payments
         WHERE order_id = ?
         ORDER BY created_at DESC, payment_id DESC
         LIMIT 1
         FOR UPDATE'
    );
    $stmt->execute([$orderId]);
    $paymentId = $stmt->fetchColumn();

    if ($paymentId) {
        $upd = $pdo->prepare(
            "UPDATE payments
             SET status = 'verified', amount = ?, verified_at = NOW()
             WHERE payment_id = ?"
        );
        $upd->execute([$amount, $paymentId]);
        return;
    }

    $ins = $pdo->prepare(
        "INSERT INTO payments
            (payment_id, order_id, store_id, method, amount, status, verified_at)
         VALUES (UUID(), ?, ?, ?, ?, 'verified', NOW())"
    );
    $ins->execute([$orderId, $storeId, $method, $amount]);
}

function order_restore_stock(PDO $pdo, string $orderId, string $storeId, string $orderNumber): void
{
    $stmt = $pdo->prepare(
        'SELECT variant_id, quantity
         FROM order_items
         WHERE order_id = ? AND variant_id IS NOT NULL'
    );
    $stmt->execute([$orderId]);
    $items = $stmt->fetchAll();

    if ($items === []) {
        return;
    }

    $upd = $pdo->prepare(
        'UPDATE product_variants SET stock = stock + ? WHERE variant_id = ?'
    );
    $mov = $pdo->prepare(
        "INSERT INTO stock_movements
            (movement_id, store_id, variant_id, type, quantity, reference_id, note)
         VALUES (UUID(), ?, ?, 'return', ?, ?, ?)"
    );

    foreach ($items as $item) {
        $qty = (int) $item['quantity'];
        $upd->execute([$qty, $item['variant_id']]);
        $mov->execute([
            $storeId,
            $item['variant_id'],
            $qty,
            $orderId,
            'Pembatalan ' . $orderNumber,
        ]);
    }
}

function order_create(PDO $pdo, array $user, array $input): array
{
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
            if (
                ($user['role'] ?? null) === 'seller'
                && user_can_access_store($pdo, (string) $storeId, $user)
            ) {
                throw new OrderException('Penjual tidak dapat membuat pesanan dari toko sendiri.');
            }

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

            $insHistory = $pdo->prepare(
                "INSERT INTO order_status_histories
                    (status_history_id, order_id, status, changed_by, note)
                 VALUES (UUID(), ?, 'pending', ?, 'Pesanan dibuat')"
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

            $insHistory->execute([$orderId, $user['user_id']]);

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

        return ['orders' => $hasil];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function order_list_seller(PDO $pdo, array $user): array
{
    $storeId = isset($_GET['store_id']) && $_GET['store_id'] !== ''
        ? validate_uuid($_GET['store_id'], 'store_id')
        : null;

    $where = [];
    $params = [];

    if ($user['role'] === 'admin') {
        if ($storeId !== null) {
            require_store_access($pdo, $storeId);
            $where[] = 'o.store_id = ?';
            $params[] = $storeId;
        }
    } elseif ($user['role'] === 'seller') {
        $stmt = $pdo->prepare(
            "SELECT DISTINCT s.store_id
             FROM stores s
             LEFT JOIN store_members sm ON sm.store_id = s.store_id
             WHERE s.deleted_at IS NULL
               AND (s.owner_user_id = ? OR (sm.user_id = ? AND sm.status = 'active'))"
        );
        $stmt->execute([$user['user_id'], $user['user_id']]);
        $storeIds = array_column($stmt->fetchAll(), 'store_id');

        if ($storeId !== null) {
            if (!in_array($storeId, $storeIds, true)) {
                json_error('Data tidak ditemukan.', 404);
            }
            $storeIds = [$storeId];
        }

        if ($storeIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($storeIds), '?'));
        $where[] = "o.store_id IN ($placeholders)";
        foreach ($storeIds as $sid) {
            $params[] = $sid;
        }
    } else {
        json_error('Tidak memiliki akses.', 403);
    }

    $sql = "SELECT o.order_id, o.order_number, o.store_id, s.name AS store_name,
                   o.buyer_user_id, u.full_name AS buyer_name, u.phone AS buyer_phone,
                   o.status AS db_status, o.subtotal, o.discount_total, o.shipping_cost,
                   o.total_amount, o.created_at, o.completed_at,
                    s.payment_online_enabled,
                    s.payment_bank_name,
                    s.payment_account_number,
                    s.payment_account_name,
                    s.payment_va_number,
                    s.payment_qris_image_url,
                    s.payment_instructions,
                    COALESCE(p.method, '') AS payment_method,
                   COALESCE(p.status, 'pending') AS payment_status
            FROM orders o
            JOIN stores s ON s.store_id = o.store_id
            JOIN users u ON u.user_id = o.buyer_user_id
            LEFT JOIN payments p ON p.payment_id = (
                SELECT p2.payment_id
                FROM payments p2
                WHERE p2.order_id = o.order_id
                ORDER BY p2.created_at DESC, p2.payment_id DESC
                LIMIT 1
            )";

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY o.created_at DESC LIMIT 200';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    return order_rows_response($pdo, $stmt->fetchAll());
}

function order_list_buyer(PDO $pdo, array $user): array
{
    $stmt = $pdo->prepare(
        "SELECT o.order_id, o.order_number, o.store_id, s.name AS store_name,
                o.buyer_user_id, u.full_name AS buyer_name, u.phone AS buyer_phone,
                o.status AS db_status, o.subtotal, o.discount_total, o.shipping_cost,
                o.total_amount, o.created_at, o.completed_at,
                s.payment_online_enabled,
                s.payment_bank_name,
                s.payment_account_number,
                s.payment_account_name,
                s.payment_va_number,
                s.payment_qris_image_url,
                s.payment_instructions,
                COALESCE(p.method, '') AS payment_method,
                COALESCE(p.status, 'pending') AS payment_status
         FROM orders o
         JOIN stores s ON s.store_id = o.store_id
         JOIN users u ON u.user_id = o.buyer_user_id
         LEFT JOIN payments p ON p.payment_id = (
             SELECT p2.payment_id
             FROM payments p2
             WHERE p2.order_id = o.order_id
             ORDER BY p2.created_at DESC, p2.payment_id DESC
             LIMIT 1
         )
         WHERE o.buyer_user_id = ?
         ORDER BY o.created_at DESC
         LIMIT 200"
    );
    $stmt->execute([$user['user_id']]);

    return order_rows_response($pdo, $stmt->fetchAll());
}

function order_update_status(PDO $pdo, array $user, array $input): array
{
    $orderId = validate_uuid($input['order_id'] ?? '', 'order_id');
    $nextUi = validate_enum(
        $input['status'] ?? null,
        'status',
        ['antrian', 'dikerjakan', 'selesai', 'lunas', 'batal']
    );

    $order = order_fetch_order($pdo, $orderId);

    if ($user['role'] === 'seller') {
        require_store_access($pdo, (string) $order['store_id']);
    } elseif ($user['role'] !== 'admin') {
        json_error('Tidak memiliki akses.', 403);
    }

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE order_id = ? FOR UPDATE');
        $stmt->execute([$orderId]);
        $locked = $stmt->fetch();

        if (!$locked) {
            throw new OrderException('Pesanan tidak ditemukan.');
        }

        $payStmt = $pdo->prepare(
            'SELECT status
             FROM payments
             WHERE order_id = ?
             ORDER BY created_at DESC, payment_id DESC
             LIMIT 1'
        );
        $payStmt->execute([$orderId]);
        $paymentStatus = (string) ($payStmt->fetchColumn() ?: 'pending');

        $currentUi = order_ui_status((string) $locked['status'], $paymentStatus);

        if ($currentUi === $nextUi) {
            $pdo->commit();
            return ['order_id' => $orderId, 'status' => $nextUi];
        }

        if (!order_can_change($currentUi, $nextUi)) {
            throw new OrderException(
                'Status tidak bisa diubah dari ' . $currentUi . ' ke ' . $nextUi . '.'
            );
        }

        $nextDb = order_db_status($nextUi);

        if ($nextUi === 'selesai' || $nextUi === 'lunas') {
            $upd = $pdo->prepare(
                'UPDATE orders
                 SET status = ?, completed_at = COALESCE(completed_at, NOW())
                 WHERE order_id = ?'
            );
        } else {
            $upd = $pdo->prepare('UPDATE orders SET status = ? WHERE order_id = ?');
        }
        $upd->execute([$nextDb, $orderId]);

        if ($nextUi === 'lunas') {
            order_set_payment_verified(
                $pdo,
                $orderId,
                (string) $locked['store_id'],
                (int) $locked['total_amount']
            );
        }

        if ($nextUi === 'batal') {
            order_restore_stock(
                $pdo,
                $orderId,
                (string) $locked['store_id'],
                (string) $locked['order_number']
            );
        }

        $hist = $pdo->prepare(
            "INSERT INTO order_status_histories
                (status_history_id, order_id, status, changed_by, note)
             VALUES (UUID(), ?, ?, ?, ?)"
        );
        $hist->execute([
            $orderId,
            $nextDb,
            $user['user_id'],
            'Status diubah menjadi ' . $nextUi,
        ]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    audit_log($pdo, 'order.update_status', 'order', $orderId, ['status' => $nextUi]);

    return ['order_id' => $orderId, 'status' => $nextUi];
}

function order_pay(PDO $pdo, array $user, array $input): array
{
    $orderId = validate_uuid($input['order_id'] ?? '', 'order_id');
    $methodInput = validate_enum(
        $input['method'] ?? 'manual_transfer',
        'method',
        ['manual_transfer', 'cash', 'qris', 'ewallet', 'other', 'tf', 'kasir']
    );
    $method = $methodInput === 'tf'
        ? 'manual_transfer'
        : ($methodInput === 'kasir' ? 'cash' : $methodInput);

    $order = order_fetch_order($pdo, $orderId);
    $isBuyer = (string) $order['buyer_user_id'] === (string) $user['user_id'];

    if (!$isBuyer) {
        if ($user['role'] === 'seller') {
            require_store_access($pdo, (string) $order['store_id']);
        } elseif ($user['role'] !== 'admin') {
            json_error('Tidak memiliki akses.', 403);
        }
    }

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare('SELECT * FROM orders WHERE order_id = ? FOR UPDATE');
        $stmt->execute([$orderId]);
        $locked = $stmt->fetch();

        if (!$locked) {
            throw new OrderException('Pesanan tidak ditemukan.');
        }

        $payStmt = $pdo->prepare(
            'SELECT status
             FROM payments
             WHERE order_id = ?
             ORDER BY created_at DESC, payment_id DESC
             LIMIT 1'
        );
        $payStmt->execute([$orderId]);
        $paymentStatus = (string) ($payStmt->fetchColumn() ?: 'pending');
        $currentUi = order_ui_status((string) $locked['status'], $paymentStatus);

        if ($currentUi === 'batal') {
            throw new OrderException('Pesanan sudah dibatalkan.');
        }

        if ($currentUi === 'lunas') {
            $pdo->commit();
            return [
                'order_id' => $orderId,
                'status' => 'lunas',
                'payment_status' => 'verified',
            ];
        }

        if ($currentUi === 'antrian' || $currentUi === 'dikerjakan') {
            throw new OrderException('Pesanan belum selesai dikerjakan.');
        }

        order_set_payment_verified(
            $pdo,
            $orderId,
            (string) $locked['store_id'],
            (int) $locked['total_amount'],
            $method
        );

        $upd = $pdo->prepare(
            "UPDATE orders
             SET status = 'completed', completed_at = COALESCE(completed_at, NOW())
             WHERE order_id = ?"
        );
        $upd->execute([$orderId]);

        $hist = $pdo->prepare(
            "INSERT INTO order_status_histories
                (status_history_id, order_id, status, changed_by, note)
             VALUES (UUID(), ?, 'completed', ?, ?)"
        );
        $hist->execute([
            $orderId,
            $user['user_id'],
            'Pembayaran dikonfirmasi (' . $method . ')',
        ]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    audit_log($pdo, 'order.pay', 'order', $orderId, ['method' => $method]);

    return [
        'order_id' => $orderId,
        'status' => 'lunas',
        'payment_status' => 'verified',
    ];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? ($method === 'POST' ? 'create' : 'list_buyer');
$user = require_auth();

try {
    if ($method === 'GET') {
        if ($action === 'list_seller') {
            json_success(
                ['items' => order_list_seller($pdo, $user)],
                'Daftar pesanan penjual berhasil diambil.'
            );
        }

        if ($action === 'list_buyer') {
            json_success(
                ['items' => order_list_buyer($pdo, $user)],
                'Daftar pesanan pembeli berhasil diambil.'
            );
        }

        json_error('Action tidak valid.', 400);
    }

    if ($method !== 'POST') {
        json_error('Metode tidak diizinkan.', 405);
    }

    $input = read_json_body();

    if ($action === 'create') {
        json_success(
            order_create($pdo, $user, $input),
            'Pesanan berhasil dibuat.',
            201
        );
    }

    if ($action === 'update_status') {
        json_success(
            order_update_status($pdo, $user, $input),
            'Status pesanan berhasil diubah.'
        );
    }

    if ($action === 'pay') {
        json_success(
            order_pay($pdo, $user, $input),
            'Pembayaran berhasil dicatat.'
        );
    }

    json_error('Action tidak valid.', 400);
} catch (OrderException $e) {
    json_error($e->getMessage(), 400, null, 'ORDER_FAILED');
} catch (Throwable $e) {
    error_log('[orders] ' . $e->getMessage());
    json_error('Terjadi kesalahan server.', 500);
}