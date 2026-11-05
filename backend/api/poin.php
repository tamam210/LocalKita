<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/access.php';
require_once __DIR__ . '/../lib/validate.php';
require_once __DIR__ . '/../lib/poin.php';

handle_preflight();

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET') {
        $action = validate_enum(
            $_GET['action'] ?? null,
            'action',
            ['balance', 'history', 'rewards', 'stores']
        );

        if ($action === 'stores') {
            if ($user['role'] !== 'buyer') {
                json_error(
                    'Hanya pembeli yang dapat melihat daftar toko poin.',
                    403,
                    null,
                    'FORBIDDEN'
                );
            }

            $stmt = db()->prepare(
                "SELECT s.store_id, s.name AS store_name,
                        COALESCE(pa.balance, 0) AS balance,
                        COALESCE(pa.reserved_balance, 0) AS reserved_balance
                 FROM stores s
                 INNER JOIN point_settings ps
                    ON ps.store_id = s.store_id AND ps.is_active = 1
                 LEFT JOIN point_accounts pa
                    ON pa.store_id = s.store_id AND pa.buyer_user_id = ?
                 WHERE s.status = 'active' AND s.deleted_at IS NULL
                 ORDER BY s.name ASC"
            );
            $stmt->execute([$user['user_id']]);

            $items = [];

            foreach ($stmt->fetchAll() as $row) {
                $balance = (int) $row['balance'];
                $reserved = (int) $row['reserved_balance'];
                $items[] = [
                    'store_id' => $row['store_id'],
                    'store_name' => $row['store_name'],
                    'balance' => $balance,
                    'reserved_balance' => $reserved,
                    'available_balance' => $balance - $reserved,
                ];
            }

            json_success(['items' => $items], 'Daftar toko poin berhasil diambil.');
        }

        $storeId = validate_uuid($_GET['store_id'] ?? null, 'store_id');

        if ($action === 'balance') {
            if ($user['role'] !== 'buyer') {
                json_error(
                    'Hanya pembeli yang dapat melihat saldo poin.',
                    403,
                    null,
                    'FORBIDDEN'
                );
            }

            $data = saldoPoin(db(), $storeId, $user['user_id']);

            json_success($data, 'Saldo poin berhasil diambil.');
        }

        if ($action === 'history') {
            if ($user['role'] !== 'buyer') {
                json_error(
                    'Hanya pembeli yang dapat melihat riwayat poin.',
                    403,
                    null,
                    'FORBIDDEN'
                );
            }

            $page = isset($_GET['page'])
                ? validate_int($_GET['page'], 'page', 1)
                : 1;
            $perPage = isset($_GET['per_page'])
                ? validate_int($_GET['per_page'], 'per_page', 1, 100)
                : 20;

            $data = poin_history(
                db(),
                $storeId,
                $user['user_id'],
                $page,
                $perPage
            );

            json_success($data, 'Riwayat poin berhasil diambil.');
        }

        if ($user['role'] !== 'buyer') {
            json_error(
                'Hanya pembeli yang dapat melihat daftar reward.',
                403,
                null,
                'FORBIDDEN'
            );
        }

        if (!store_exists(db(), $storeId)) {
            json_error('Toko tidak ditemukan.', 404, null, 'NOT_FOUND');
        }

        json_success(
            ['items' => poin_rewards(db(), $storeId)],
            'Daftar reward berhasil diambil.'
        );
    }

    if ($method === 'POST') {
        $input = read_json_body();
        require_fields($input, ['action', 'store_id']);
        $action = validate_enum($input['action'], 'action', ['earn', 'redeem']);
        $storeId = validate_uuid($input['store_id'], 'store_id');

        if ($action === 'earn') {
            if (!in_array($user['role'], ['seller', 'admin'], true)) {
                json_error(
                    'Hanya penjual atau admin yang dapat memberikan poin.',
                    403,
                    null,
                    'FORBIDDEN'
                );
            }

            require_store_access(db(), $storeId);
            $orderId = validate_uuid($input['order_id'] ?? null, 'order_id');
            $data = poin_earn_order(db(), $storeId, $orderId);

            json_success($data, 'Poin berhasil ditambahkan.', 201);
        }

        if ($user['role'] !== 'buyer') {
            json_error(
                'Hanya pembeli yang dapat menukar poin.',
                403,
                null,
                'FORBIDDEN'
            );
        }

        $rewardId = validate_uuid($input['reward_id'] ?? null, 'reward_id');
        $quantity = isset($input['quantity'])
            ? validate_int($input['quantity'], 'quantity', 1, 100)
            : 1;
        $data = poin_redeem(
            db(),
            $storeId,
            $rewardId,
            $user['user_id'],
            $quantity
        );

        json_success($data, 'Penukaran poin berhasil diajukan.', 201);
    }

    json_error('Metode tidak diizinkan.', 405);
} catch (PoinException $exception) {
    json_error(
        $exception->getMessage(),
        $exception->httpStatus,
        null,
        $exception->errorCode
    );
} catch (Throwable $exception) {
    json_error('Terjadi kesalahan server.', 500, null, 'SERVER_ERROR');
}
