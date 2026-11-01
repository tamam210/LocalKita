<?php
declare(strict_types=1);

require_once __DIR__ . '/../lib/httpx.php';
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/validate.php';
require_once __DIR__ . '/../lib/chat.php';

handle_preflight();

$user = require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET') {
        $action = validate_enum(
            $_GET['action'] ?? null,
            'action',
            ['conversations', 'messages']
        );

        if ($action === 'conversations') {
            $storeId = validate_uuid($_GET['store_id'] ?? null, 'store_id');
            $items = chat_daftar(db(), $storeId, $user);

            json_success(
                ['items' => $items],
                'Daftar percakapan berhasil diambil.'
            );
        }

        $conversationId = validate_uuid(
            $_GET['conversation_id'] ?? null,
            'conversation_id'
        );
        $page = isset($_GET['page'])
            ? validate_int($_GET['page'], 'page', 1)
            : 1;
        $perPage = isset($_GET['per_page'])
            ? validate_int($_GET['per_page'], 'per_page', 1, 100)
            : 30;

        $data = chat_pesan(db(), $conversationId, $user, $page, $perPage);

        json_success($data, 'Pesan berhasil diambil.');
    }

    if ($method === 'POST') {
        $input = read_json_body();
        require_fields($input, ['action']);
        $action = validate_enum(
            $input['action'],
            'action',
            ['create', 'send', 'read']
        );

        if ($action === 'create') {
            if ($user['role'] !== 'buyer') {
                json_error(
                    'Hanya pembeli yang dapat membuat percakapan.',
                    403,
                    null,
                    'FORBIDDEN'
                );
            }

            $storeId = validate_uuid($input['store_id'] ?? null, 'store_id');
            $orderId = null;

            if (array_key_exists('order_id', $input) && $input['order_id'] !== null) {
                $orderId = validate_uuid($input['order_id'], 'order_id');
            }

            $data = chat_buat(db(), $storeId, $user['user_id'], $orderId);

            json_success($data, 'Percakapan berhasil dibuat.', 201);
        }

        if ($action === 'send') {
            $conversationId = validate_uuid(
                $input['conversation_id'] ?? null,
                'conversation_id'
            );
            $type = validate_enum(
                $input['type'] ?? 'text',
                'type',
                ['text', 'image', 'file']
            );
            $body = null;

            if (array_key_exists('body', $input) && $input['body'] !== null) {
                $body = validate_string($input['body'], 'body', null, 5000);
            }

            if ($type === 'text' && ($body === null || $body === '')) {
                validation_error('body', 'Field wajib diisi untuk pesan teks.');
            }

            $fileId = null;

            if (array_key_exists('file_id', $input) && $input['file_id'] !== null) {
                $fileId = validate_uuid($input['file_id'], 'file_id');
            }

            $data = chat_kirim(
                db(),
                $conversationId,
                $user,
                $type,
                $body,
                $fileId
            );

            json_success($data, 'Pesan berhasil dikirim.', 201);
        }

        $conversationId = validate_uuid(
            $input['conversation_id'] ?? null,
            'conversation_id'
        );
        $data = chat_tandai_dibaca(db(), $conversationId, $user);

        json_success($data, 'Pesan ditandai sudah dibaca.');
    }

    json_error('Metode tidak diizinkan.', 405);
} catch (ChatException $exception) {
    json_error(
        $exception->getMessage(),
        $exception->httpStatus,
        null,
        $exception->errorCode
    );
} catch (Throwable $exception) {
    json_error('Terjadi kesalahan server.', 500, null, 'SERVER_ERROR');
}
