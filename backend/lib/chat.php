<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/access.php';

final class ChatException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $httpStatus = 400
    ) {
        parent::__construct($message);
    }
}

function chat_transaction(PDO $pdo, callable $callback): mixed
{
    $owned = !$pdo->inTransaction();

    if ($owned) {
        $pdo->beginTransaction();
    }

    try {
        $result = $callback();

        if ($owned) {
            $pdo->commit();
        }

        return $result;
    } catch (Throwable $exception) {
        if ($owned && $pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $exception;
    }
}

function chat_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
}

function chat_iso(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }

    $timezone = new DateTimeZone('Asia/Jakarta');
    $date = DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $value, $timezone);

    if (!$date) {
        return $value;
    }

    return $date->format(DateTimeInterface::ATOM);
}

function chat_conversation(PDO $pdo, string $conversationId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT c.conversation_id, c.store_id, c.buyer_user_id, c.order_id,
                c.status, c.last_message_at, c.created_at,
                s.name AS store_name, u.full_name AS buyer_name
         FROM conversations c
         INNER JOIN stores s ON s.store_id = c.store_id
         INNER JOIN users u ON u.user_id = c.buyer_user_id
         WHERE c.conversation_id = ?
         LIMIT 1'
    );
    $stmt->execute([$conversationId]);
    $row = $stmt->fetch();

    return $row ?: null;
}

function chat_can_access(PDO $pdo, array $conversation, array $user): bool
{
    if (($user['role'] ?? null) === 'admin') {
        return true;
    }

    if ($conversation['buyer_user_id'] === $user['user_id']) {
        return true;
    }

    return user_can_access_store($pdo, $conversation['store_id'], $user);
}

function chat_require_access(
    PDO $pdo,
    string $conversationId,
    array $user
): array {
    $conversation = chat_conversation($pdo, $conversationId);

    if ($conversation === null) {
        throw new ChatException('NOT_FOUND', 'Percakapan tidak ditemukan.', 404);
    }

    if (!chat_can_access($pdo, $conversation, $user)) {
        throw new ChatException(
            'FORBIDDEN',
            'Anda tidak memiliki akses ke percakapan ini.',
            403
        );
    }

    return $conversation;
}

function chat_require_attachment(
    PDO $pdo,
    array $conversation,
    array $user,
    string $fileId,
    string $type
): array {
    $stmt = $pdo->prepare(
        'SELECT file_id, store_id, uploader_id, mime_type, visibility
         FROM files
         WHERE file_id = ? AND deleted_at IS NULL
         LIMIT 1'
    );
    $stmt->execute([$fileId]);
    $file = $stmt->fetch();

    if (!$file) {
        throw new ChatException('NOT_FOUND', 'File tidak ditemukan.', 404);
    }

    $conversationStoreId = (string) $conversation['store_id'];
    $fileStoreId = $file['store_id'] !== null ? (string) $file['store_id'] : null;
    $isUploader = (string) ($file['uploader_id'] ?? '') === (string) $user['user_id'];
    $isStoreStaff = in_array($user['role'] ?? null, ['seller', 'admin'], true)
        && user_can_access_store($pdo, $conversationStoreId, $user);

    if ($fileStoreId !== null && $fileStoreId !== $conversationStoreId) {
        throw new ChatException(
            'FORBIDDEN',
            'File tidak dapat dilampirkan pada percakapan ini.',
            403
        );
    }

    if (!$isUploader && !($isStoreStaff && $fileStoreId === $conversationStoreId)) {
        throw new ChatException(
            'FORBIDDEN',
            'Anda tidak memiliki akses ke file ini.',
            403
        );
    }

    if ($type === 'image' && !str_starts_with((string) ($file['mime_type'] ?? ''), 'image/')) {
        throw new ChatException(
            'VALIDATION_ERROR',
            'File yang dilampirkan bukan gambar.',
            400
        );
    }

    return $file;
}

function chat_daftar(PDO $pdo, string $storeId, array $user): array
{
    if (!store_exists($pdo, $storeId)) {
        throw new ChatException('NOT_FOUND', 'Toko tidak ditemukan.', 404);
    }

    $canSeeStore = ($user['role'] ?? null) === 'admin' || user_can_access_store($pdo, $storeId, $user);

    if (!$canSeeStore && $user['role'] !== 'buyer') {
        throw new ChatException(
            'FORBIDDEN',
            'Anda tidak memiliki akses ke toko ini.',
            403
        );
    }

    $sql = 'SELECT c.conversation_id, c.store_id, s.name AS store_name,
                   c.buyer_user_id, u.full_name AS buyer_name, c.order_id,
                   c.status, c.last_message_at,
                   (
                       SELECT COUNT(*)
                       FROM messages m
                       WHERE m.conversation_id = c.conversation_id
                         AND m.deleted_at IS NULL
                         AND m.sender_user_id <> ?
                         AND m.read_at IS NULL
                   ) AS unread_count,
                   (
                       SELECT m.body
                       FROM messages m
                       WHERE m.conversation_id = c.conversation_id
                         AND m.deleted_at IS NULL
                       ORDER BY m.created_at DESC, m.message_id DESC
                       LIMIT 1
                   ) AS last_message
            FROM conversations c
            INNER JOIN stores s ON s.store_id = c.store_id
            INNER JOIN users u ON u.user_id = c.buyer_user_id
            WHERE c.store_id = ?';

    $params = [$user['user_id'], $storeId];

    if (!$canSeeStore) {
        $sql .= ' AND c.buyer_user_id = ?';
        $params[] = $user['user_id'];
    }

    $sql .= ' ORDER BY c.last_message_at DESC, c.created_at DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $items = [];

    foreach ($stmt->fetchAll() as $row) {
        $items[] = [
            'conversation_id' => $row['conversation_id'],
            'store_id'        => $row['store_id'],
            'store_name'      => $row['store_name'],
            'buyer_user_id'   => $row['buyer_user_id'],
            'buyer_name'      => $row['buyer_name'],
            'order_id'        => $row['order_id'],
            'status'          => $row['status'],
            'last_message_at' => chat_iso($row['last_message_at']),
            'unread_count'    => (int) $row['unread_count'],
            'last_message'    => $row['last_message'],
        ];
    }

    return $items;
}

function chat_pesan(
    PDO $pdo,
    string $conversationId,
    array $user,
    int $page = 1,
    int $perPage = 30
): array {
    $conversation = chat_require_access($pdo, $conversationId, $user);

    if ($page < 1) {
        $page = 1;
    }

    if ($perPage < 1) {
        $perPage = 30;
    }

    if ($perPage > 100) {
        $perPage = 100;
    }

    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM messages
         WHERE conversation_id = ? AND deleted_at IS NULL'
    );
    $stmt->execute([$conversationId]);
    $total = (int) $stmt->fetchColumn();

    $offset = ($page - 1) * $perPage;

    $stmt = $pdo->prepare(
        'SELECT m.message_id, m.conversation_id, m.sender_user_id,
                u.full_name AS sender_name, m.type, m.body, m.file_id,
                f.storage_path AS file_path, f.store_id AS file_store_id,
                m.read_at, m.created_at
         FROM messages m
         LEFT JOIN users u ON u.user_id = m.sender_user_id
         LEFT JOIN files f ON f.file_id = m.file_id AND f.deleted_at IS NULL
         WHERE m.conversation_id = ?
           AND m.deleted_at IS NULL
         ORDER BY m.created_at ASC, m.message_id ASC
         LIMIT ? OFFSET ?'
    );
    $stmt->bindValue(1, $conversationId);
    $stmt->bindValue(2, $perPage, PDO::PARAM_INT);
    $stmt->bindValue(3, $offset, PDO::PARAM_INT);
    $stmt->execute();

    $items = [];

    foreach ($stmt->fetchAll() as $row) {
        $filePath = $row['file_path'];
        if (
            $filePath !== null
            && $row['file_store_id'] !== null
            && (string) $row['file_store_id'] !== (string) $conversation['store_id']
        ) {
            $filePath = null;
        }

        $items[] = [
            'message_id'      => $row['message_id'],
            'conversation_id' => $row['conversation_id'],
            'sender_user_id'  => $row['sender_user_id'],
            'sender_name'     => $row['sender_name'],
            'type'            => $row['type'],
            'body'            => $row['body'],
            'file_url'        => $filePath,
            'read_at'         => chat_iso($row['read_at']),
            'created_at'      => chat_iso($row['created_at']),
        ];
    }

    return [
        'items'      => $items,
        'pagination' => [
            'page'        => $page,
            'per_page'    => $perPage,
            'total'       => $total,
            'total_pages' => (int) ceil($total / $perPage),
        ],
    ];
}

function chat_buat(
    PDO $pdo,
    string $storeId,
    string $buyerUserId,
    ?string $orderId = null
): array {
    if (!store_exists($pdo, $storeId)) {
        throw new ChatException('NOT_FOUND', 'Toko tidak ditemukan.', 404);
    }

    if ($orderId !== null) {
        $stmt = $pdo->prepare(
            'SELECT 1
             FROM orders
             WHERE order_id = ? AND store_id = ? AND buyer_user_id = ?
             LIMIT 1'
        );
        $stmt->execute([$orderId, $storeId, $buyerUserId]);

        if (!$stmt->fetchColumn()) {
            throw new ChatException('NOT_FOUND', 'Pesanan tidak ditemukan.', 404);
        }
    }

    return chat_transaction(
        $pdo,
        static function () use ($pdo, $storeId, $buyerUserId, $orderId): array {
            if ($orderId === null) {
                $stmt = $pdo->prepare(
                    "SELECT conversation_id, status, created_at
                     FROM conversations
                     WHERE store_id = ?
                       AND buyer_user_id = ?
                       AND order_id IS NULL
                       AND status = 'open'
                     ORDER BY created_at DESC
                     LIMIT 1
                     FOR UPDATE"
                );
                $stmt->execute([$storeId, $buyerUserId]);
            } else {
                $stmt = $pdo->prepare(
                    "SELECT conversation_id, status, created_at
                     FROM conversations
                     WHERE store_id = ?
                       AND buyer_user_id = ?
                       AND order_id = ?
                       AND status = 'open'
                     ORDER BY created_at DESC
                     LIMIT 1
                     FOR UPDATE"
                );
                $stmt->execute([$storeId, $buyerUserId, $orderId]);
            }

            $existing = $stmt->fetch();

            if ($existing) {
                return [
                    'conversation_id' => $existing['conversation_id'],
                    'status'          => $existing['status'],
                    'created_at'      => chat_iso($existing['created_at']),
                ];
            }

            $conversationId = chat_uuid();

            $stmt = $pdo->prepare(
                "INSERT INTO conversations
                    (conversation_id, store_id, buyer_user_id, order_id, status)
                 VALUES (?, ?, ?, ?, 'open')"
            );
            $stmt->execute([
                $conversationId,
                $storeId,
                $buyerUserId,
                $orderId,
            ]);

            $stmt = $pdo->prepare(
                'SELECT created_at
                 FROM conversations
                 WHERE conversation_id = ?
                 LIMIT 1'
            );
            $stmt->execute([$conversationId]);
            $createdAt = $stmt->fetchColumn();

            return [
                'conversation_id' => $conversationId,
                'status'          => 'open',
                'created_at'      => chat_iso(is_string($createdAt) ? $createdAt : null),
            ];
        }
    );
}

function chat_kirim(
    PDO $pdo,
    string $conversationId,
    array $user,
    string $type,
    ?string $body = null,
    ?string $fileId = null
): array {
    if (!in_array($type, ['text', 'image', 'file'], true)) {
        throw new ChatException('VALIDATION_ERROR', 'Tipe pesan tidak valid.', 400);
    }

    if ($type === 'text' && ($body === null || trim($body) === '')) {
        throw new ChatException(
            'VALIDATION_ERROR',
            'Isi pesan teks wajib diisi.',
            400
        );
    }

    return chat_transaction(
        $pdo,
        static function () use (
            $pdo,
            $conversationId,
            $user,
            $type,
            $body,
            $fileId
        ): array {
            $conversation = chat_require_access($pdo, $conversationId, $user);

            if (in_array($type, ['image', 'file'], true) && $fileId === null) {
                throw new ChatException(
                    'VALIDATION_ERROR',
                    'File wajib dilampirkan untuk tipe pesan ini.',
                    400
                );
            }

            if ($fileId !== null) {
                chat_require_attachment($pdo, $conversation, $user, $fileId, $type);
            }

            $messageId = chat_uuid();

            $stmt = $pdo->prepare(
                'INSERT INTO messages
                    (message_id, conversation_id, sender_user_id, file_id, type, body)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $messageId,
                $conversationId,
                $user['user_id'],
                $fileId,
                $type,
                $body,
            ]);

            $stmt = $pdo->prepare(
                'UPDATE conversations
                 SET last_message_at = CURRENT_TIMESTAMP
                 WHERE conversation_id = ?'
            );
            $stmt->execute([$conversationId]);

            $stmt = $pdo->prepare(
                'SELECT created_at
                 FROM messages
                 WHERE message_id = ?
                 LIMIT 1'
            );
            $stmt->execute([$messageId]);
            $createdAt = $stmt->fetchColumn();

            return [
                'message_id'      => $messageId,
                'conversation_id' => $conversationId,
                'type'            => $type,
                'body'            => $body,
                'created_at'      => chat_iso(is_string($createdAt) ? $createdAt : null),
            ];
        }
    );
}

function chat_tandai_dibaca(
    PDO $pdo,
    string $conversationId,
    array $user
): array {
    return chat_transaction(
        $pdo,
        static function () use ($pdo, $conversationId, $user): array {
            chat_require_access($pdo, $conversationId, $user);

            $stmt = $pdo->prepare(
                'UPDATE messages
                 SET read_at = CURRENT_TIMESTAMP
                 WHERE conversation_id = ?
                   AND sender_user_id <> ?
                   AND read_at IS NULL
                   AND deleted_at IS NULL'
            );
            $stmt->execute([$conversationId, $user['user_id']]);

            return [
                'conversation_id' => $conversationId,
                'unread_count'    => 0,
            ];
        }
    );
}
