#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE=(docker compose -f tests/docker-compose.yml)
BASE_URL="http://127.0.0.1:18000"
STORE_ID="20000000-0000-4000-8000-000000000001"
CONVERSATION_ID="98000000-0000-4000-8000-000000000001"
ARYA_ID="00000000-0000-4000-8000-000000000004"
TAMAM_ID="00000000-0000-4000-8000-000000000002"
SARI_ID="00000000-0000-4000-8000-000000000005"
STORE2_ID="20000000-0000-4000-8000-000000000002"
POIN_ORDER_ID="9c000000-0000-4000-8000-000000000001"
POIN_REWARD_HIGH_ID="8c000000-0000-4000-8000-000000000001"
POIN_REWARD_QUOTA_ID="8c000000-0000-4000-8000-000000000002"
PRODUCT_ID="40000000-0000-4000-8000-000000000001"
VARIANT_ID="50000000-0000-4000-8000-000000000001"
PRODUCT_STORE2_ID="40000000-0000-4000-8000-000000000003"

login_user() {
    local user_id="$1"
    local cookie_file="$2"

    curl -fsS -c "$cookie_file" \
        -H 'Content-Type: application/json' \
        -d "{\"user_id\":\"$user_id\"}" \
        "$BASE_URL/tests/login.php" >/dev/null
}

"${COMPOSE[@]}" up -d --build

echo "Menunggu database siap..."
for _ in $(seq 1 60); do
    if "${COMPOSE[@]}" exec -T db mysqladmin ping -h 127.0.0.1 -uroot -proot --silent >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

"${COMPOSE[@]}" exec -T db mysql -uroot -proot < sql/schema.sql
"${COMPOSE[@]}" exec -T db mysql -uroot -proot < sql/seed.sql
"${COMPOSE[@]}" exec -T db mysql -uroot -proot < sql/migration_favorit.sql

echo "Memastikan tabel favorites tersedia..."
"${COMPOSE[@]}" exec -T db mysql -uroot -proot -N lokalkita \
    -e "SHOW TABLES LIKE 'favorites'" | grep -qx favorites

echo "Menunggu PHP siap..."
for _ in $(seq 1 30); do
    if curl -fsS "$BASE_URL/api/ping.php" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo "Menunggu Python siap..."
for _ in $(seq 1 30); do
    if "${COMPOSE[@]}" exec -T python python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5001/health')" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo "Tes ping..."
curl -fsS "$BASE_URL/api/ping.php" | grep -q '"ok":true'

echo "Tes C1 lib/poin.php..."
"${COMPOSE[@]}" exec -T php php tests/poin_test.php

echo "Tes C2 lib/laporan.php..."
"${COMPOSE[@]}" exec -T php php tests/laporan_test.php

echo "Tes C8 lib/hpp.php + lib/diskon.php..."
"${COMPOSE[@]}" exec -T php php tests/hitung_test.php

echo "Tes tanpa session harus 401..."
STATUS="$(curl -s -o /tmp/lokalkita-whoami.json -w '%{http_code}' "$BASE_URL/tests/whoami.php")"
test "$STATUS" = "401"
grep -q '"error_code":"UNAUTHORIZED"' /tmp/lokalkita-whoami.json

for endpoint in chat poin laporan; do
    STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' "$BASE_URL/api/$endpoint.php")"
    test "$STATUS" = "401"
    grep -Fq '"error_code":"UNAUTHORIZED"' /tmp/lokalkita-chat.json
done

for endpoint in hpp diskon; do
    STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
        -H 'Content-Type: application/json' \
        -d "{\"store_id\":\"$STORE_ID\"}" \
        "$BASE_URL/api/$endpoint.php")"
    test "$STATUS" = "401"
    grep -Fq '"error_code":"UNAUTHORIZED"' /tmp/lokalkita-c8.json
done

COOKIE_FILE="$(mktemp)"
COOKIE_TAMAM="$(mktemp)"
COOKIE_SARI="$(mktemp)"
trap 'rm -f "$COOKIE_FILE" "$COOKIE_TAMAM" "$COOKIE_SARI" /tmp/lokalkita-whoami.json /tmp/lokalkita-chat.json /tmp/lokalkita-c8.json' EXIT

echo "Tes login sebagai Arya..."
login_user "$ARYA_ID" "$COOKIE_FILE"
curl -fsS -b "$COOKIE_FILE" "$BASE_URL/tests/whoami.php" | grep -q '"role":"buyer"'

echo "Tes whoami..."
curl -fsS -b "$COOKIE_FILE" "$BASE_URL/tests/whoami.php" | grep -q '"name":"Arya Wira"'

echo "Tes C3 chat: daftar percakapan..."
CHAT_LIST="$(curl -fsS -b "$COOKIE_FILE" \
    "$BASE_URL/api/chat.php?action=conversations&store_id=$STORE_ID")"
printf '%s' "$CHAT_LIST" | grep -Fq '"conversation_id":"'"$CONVERSATION_ID"'"'
printf '%s' "$CHAT_LIST" | grep -Fq '"unread_count":0'
printf '%s' "$CHAT_LIST" | grep -Fq '"last_message":"Oke, sudah saya order. Makasih!"'

echo "Tes C3 chat: daftar pesan..."
CHAT_MESSAGES="$(curl -fsS -b "$COOKIE_FILE" \
    "$BASE_URL/api/chat.php?action=messages&conversation_id=$CONVERSATION_ID")"
printf '%s' "$CHAT_MESSAGES" | grep -Fq '"total":3'
printf '%s' "$CHAT_MESSAGES" | grep -Fq '"body":"Halo Kak, risolesnya masih ready?"'

echo "Tes C3 chat: kirim pesan pembeli..."
CHAT_SEND_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"send\",\"conversation_id\":\"$CONVERSATION_ID\",\"type\":\"text\",\"body\":\"Tes chat C3\"}" \
    "$BASE_URL/api/chat.php")"
test "$CHAT_SEND_STATUS" = "201"
grep -Fq '"body":"Tes chat C3"' /tmp/lokalkita-chat.json

echo "Tes C3 chat: pesan image tanpa file_id ditolak..."
CHAT_FILE_MISSING_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"send\",\"conversation_id\":\"$CONVERSATION_ID\",\"type\":\"image\"}" \
    "$BASE_URL/api/chat.php")"
test "$CHAT_FILE_MISSING_STATUS" = "400"
grep -Fq '"error_code":"VALIDATION_ERROR"' /tmp/lokalkita-chat.json

echo "Tes C3 chat: file_id tidak ditemukan ditolak..."
CHAT_FILE_NOT_FOUND_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"send\",\"conversation_id\":\"$CONVERSATION_ID\",\"type\":\"file\",\"file_id\":\"00000000-0000-4000-8000-000000000099\"}" \
    "$BASE_URL/api/chat.php")"
test "$CHAT_FILE_NOT_FOUND_STATUS" = "404"
grep -Fq '"error_code":"NOT_FOUND"' /tmp/lokalkita-chat.json

echo "Tes C3 chat: file toko lain ditolak..."
CHAT_FILE_FORBIDDEN_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"send\",\"conversation_id\":\"$CONVERSATION_ID\",\"type\":\"image\",\"file_id\":\"30000000-0000-4000-8000-000000000009\"}" \
    "$BASE_URL/api/chat.php")"
test "$CHAT_FILE_FORBIDDEN_STATUS" = "403"
grep -Fq '"error_code":"FORBIDDEN"' /tmp/lokalkita-chat.json

echo "Tes C3 chat: unread penjual..."
login_user "$TAMAM_ID" "$COOKIE_TAMAM"
TAMAM_LIST="$(curl -fsS -b "$COOKIE_TAMAM" \
    "$BASE_URL/api/chat.php?action=conversations&store_id=$STORE_ID")"
printf '%s' "$TAMAM_LIST" | grep -Fq '"unread_count":2'
printf '%s' "$TAMAM_LIST" | grep -Fq '"last_message":"Tes chat C3"'

echo "Tes C3 chat: tandai dibaca penjual..."
CHAT_READ_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"read\",\"conversation_id\":\"$CONVERSATION_ID\"}" \
    "$BASE_URL/api/chat.php")"
test "$CHAT_READ_STATUS" = "200"
grep -Fq '"unread_count":0' /tmp/lokalkita-chat.json

echo "Tes C3 chat: balas dari penjual..."
CHAT_REPLY_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"send\",\"conversation_id\":\"$CONVERSATION_ID\",\"type\":\"text\",\"body\":\"Balasan Tamam C3\"}" \
    "$BASE_URL/api/chat.php")"
test "$CHAT_REPLY_STATUS" = "201"
grep -Fq '"body":"Balasan Tamam C3"' /tmp/lokalkita-chat.json

echo "Tes C3 chat: unread pembeli..."
ARYA_LIST="$(curl -fsS -b "$COOKIE_FILE" \
    "$BASE_URL/api/chat.php?action=conversations&store_id=$STORE_ID")"
printf '%s' "$ARYA_LIST" | grep -Fq '"unread_count":1'

echo "Tes C3 chat: tandai dibaca pembeli..."
CHAT_READ_ARYA_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"read\",\"conversation_id\":\"$CONVERSATION_ID\"}" \
    "$BASE_URL/api/chat.php")"
test "$CHAT_READ_ARYA_STATUS" = "200"

echo "Tes C3 chat: akses peserta lain ditolak..."
login_user "$SARI_ID" "$COOKIE_SARI"
CHAT_FORBIDDEN_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    "$BASE_URL/api/chat.php?action=messages&conversation_id=$CONVERSATION_ID")"
test "$CHAT_FORBIDDEN_STATUS" = "403"
grep -Fq '"error_code":"FORBIDDEN"' /tmp/lokalkita-chat.json

echo "Tes C3 chat: buat percakapan baru..."
CHAT_CREATE_RESPONSE="$(curl -fsS -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"create\",\"store_id\":\"$STORE_ID\"}" \
    "$BASE_URL/api/chat.php")"
printf '%s' "$CHAT_CREATE_RESPONSE" | grep -Fq '"status":"open"'
SARI_CONVERSATION_ID="$(printf '%s' "$CHAT_CREATE_RESPONSE" \
    | sed -n 's/.*"conversation_id":"\([^"]*\)".*/\1/p')"
test -n "$SARI_CONVERSATION_ID"

echo "Tes C3 chat: kirim pesan percakapan baru..."
SARI_SEND_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"send\",\"conversation_id\":\"$SARI_CONVERSATION_ID\",\"type\":\"text\",\"body\":\"Halo dari Sari\"}" \
    "$BASE_URL/api/chat.php")"
test "$SARI_SEND_STATUS" = "201"
grep -Fq '"body":"Halo dari Sari"' /tmp/lokalkita-chat.json

SARI_MESSAGES="$(curl -fsS -b "$COOKIE_SARI" \
    "$BASE_URL/api/chat.php?action=messages&conversation_id=$SARI_CONVERSATION_ID")"
printf '%s' "$SARI_MESSAGES" | grep -Fq '"total":1'

echo "Tes C3 chat: penjual tidak boleh membuat percakapan..."
SELLER_CREATE_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"create\",\"store_id\":\"$STORE_ID\"}" \
    "$BASE_URL/api/chat.php")"
test "$SELLER_CREATE_STATUS" = "403"

echo "Tes C9 isolasi chat antar toko..."
CHAT_WRONG_STORE_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    "$BASE_URL/api/chat.php?action=conversations&store_id=$STORE2_ID")"
test "$CHAT_WRONG_STORE_STATUS" = "403"
grep -Fq '"error_code":"FORBIDDEN"' /tmp/lokalkita-chat.json

echo "Tes C3 chat: body kosong ditolak..."
CHAT_VALIDATION_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"send\",\"conversation_id\":\"$CONVERSATION_ID\",\"type\":\"text\",\"body\":\"\"}" \
    "$BASE_URL/api/chat.php")"
test "$CHAT_VALIDATION_STATUS" = "400"
grep -Fq '"error_code":"VALIDATION_ERROR"' /tmp/lokalkita-chat.json

echo "Tes order: penjual tidak boleh pesan dari toko sendiri..."
ORDER_OWN_STORE_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"create\",\"items\":[{\"product_id\":\"$PRODUCT_ID\",\"variant_id\":\"$VARIANT_ID\",\"quantity\":1}]}" \
    "$BASE_URL/api/orders.php")"
test "$ORDER_OWN_STORE_STATUS" = "400"
grep -Fq '"error_code":"ORDER_FAILED"' /tmp/lokalkita-chat.json

echo "Tes C4 api/poin.php: siapkan data..."
"${COMPOSE[@]}" exec -T db mysql -uroot -proot lokalkita <<'SQL'
INSERT INTO orders
    (order_id, order_number, store_id, buyer_user_id, status, fulfillment_method,
     subtotal, discount_total, shipping_cost, shipping_address, total_amount,
     points_earned, completed_at, created_at)
VALUES
    ('9c000000-0000-4000-8000-000000000001', 'LK-C4-0001',
     '20000000-0000-4000-8000-000000000001',
     '00000000-0000-4000-8000-000000000005',
     'completed', 'pickup', 80000, 0, 0, NULL, 80000, 0,
     '2026-02-01 10:00:00', '2026-02-01 09:00:00');

INSERT INTO reward_products
    (reward_id, store_id, product_id, variant_id, name, points_required,
     cash_addon, quota, per_buyer_limit, starts_at, ends_at, status)
VALUES
    ('8c000000-0000-4000-8000-000000000001',
     '20000000-0000-4000-8000-000000000001',
     '40000000-0000-4000-8000-000000000001',
     '50000000-0000-4000-8000-000000000001',
     'Reward Tes Mahal', 1000, 0, 10, 0,
     '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'active'),
    ('8c000000-0000-4000-8000-000000000002',
     '20000000-0000-4000-8000-000000000001',
     '40000000-0000-4000-8000-000000000001',
     '50000000-0000-4000-8000-000000000001',
     'Reward Tes Kuota', 1, 0, 1, 0,
     '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'active');
SQL

echo "Tes C4 poin: saldo pembeli..."
POIN_BALANCE="$(curl -fsS -b "$COOKIE_FILE" \
    "$BASE_URL/api/poin.php?action=balance&store_id=$STORE_ID")"
printf '%s' "$POIN_BALANCE" | grep -Fq '"balance":20'
printf '%s' "$POIN_BALANCE" | grep -Fq '"reserved_balance":15'
printf '%s' "$POIN_BALANCE" | grep -Fq '"available_balance":5'

echo "Tes C4 poin: riwayat pembeli..."
POIN_HISTORY="$(curl -fsS -b "$COOKIE_FILE" \
    "$BASE_URL/api/poin.php?action=history&store_id=$STORE_ID")"
printf '%s' "$POIN_HISTORY" | grep -Fq '"total":2'
printf '%s' "$POIN_HISTORY" | grep -Fq '"type":"reserve"'
printf '%s' "$POIN_HISTORY" | grep -Fq '"points":-15'
printf '%s' "$POIN_HISTORY" | grep -Fq '"balance_after":20'

echo "Tes C4 poin: daftar reward..."
POIN_REWARDS="$(curl -fsS -b "$COOKIE_FILE" \
    "$BASE_URL/api/poin.php?action=rewards&store_id=$STORE_ID")"
printf '%s' "$POIN_REWARDS" | grep -Fq '"reward_id":"80000000-0000-4000-8000-000000000001"'
printf '%s' "$POIN_REWARDS" | grep -Fq '"points_required":15'
printf '%s' "$POIN_REWARDS" | grep -Fq '"cash_addon":2000'

echo "Tes C4 poin: penjual tidak boleh lihat saldo..."
POIN_SELLER_BALANCE_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    "$BASE_URL/api/poin.php?action=balance&store_id=$STORE_ID")"
test "$POIN_SELLER_BALANCE_STATUS" = "403"
grep -Fq '"error_code":"FORBIDDEN"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: pembeli tidak boleh earn..."
POIN_BUYER_EARN_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"earn\",\"store_id\":\"$STORE_ID\",\"order_id\":\"$POIN_ORDER_ID\"}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_BUYER_EARN_STATUS" = "403"

echo "Tes C4 poin: earn dari penjual..."
POIN_EARN_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"earn\",\"store_id\":\"$STORE_ID\",\"order_id\":\"$POIN_ORDER_ID\"}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_EARN_STATUS" = "201"
grep -Fq '"points_earned":40' /tmp/lokalkita-chat.json
grep -Fq '"balance_after":40' /tmp/lokalkita-chat.json

echo "Tes C4 poin: earn ganda ditolak..."
POIN_DUP_EARN_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"earn\",\"store_id\":\"$STORE_ID\",\"order_id\":\"$POIN_ORDER_ID\"}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_DUP_EARN_STATUS" = "409"
grep -Fq '"error_code":"CONFLICT"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: earn pesanan belum selesai ditolak..."
POIN_PENDING_EARN_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"earn\",\"store_id\":\"$STORE_ID\",\"order_id\":\"90000000-0000-4000-8000-000000000003\"}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_PENDING_EARN_STATUS" = "409"
grep -Fq '"error_code":"CONFLICT"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: penjual toko lain ditolak..."
POIN_WRONG_STORE_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"earn\",\"store_id\":\"$STORE2_ID\",\"order_id\":\"$POIN_ORDER_ID\"}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_WRONG_STORE_STATUS" = "404"
grep -Fq '"error_code":"NOT_FOUND"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: pesanan tidak ditemukan..."
POIN_ORDER_NOT_FOUND_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"earn\",\"store_id\":\"$STORE_ID\",\"order_id\":\"9c000000-0000-4000-8000-000000000099\"}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_ORDER_NOT_FOUND_STATUS" = "404"
grep -Fq '"error_code":"NOT_FOUND"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: saldo Sari setelah earn..."
SARI_POIN_BALANCE="$(curl -fsS -b "$COOKIE_SARI" \
    "$BASE_URL/api/poin.php?action=balance&store_id=$STORE_ID")"
printf '%s' "$SARI_POIN_BALANCE" | grep -Fq '"balance":40'
printf '%s' "$SARI_POIN_BALANCE" | grep -Fq '"available_balance":40'

echo "Tes C4 poin: redeem poin penuh..."
POIN_REDEEM_1_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"redeem\",\"store_id\":\"$STORE_ID\",\"reward_id\":\"80000000-0000-4000-8000-000000000001\",\"quantity\":1}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_REDEEM_1_STATUS" = "201"
grep -Fq '"points_used":15' /tmp/lokalkita-chat.json
grep -Fq '"cash_addon":0' /tmp/lokalkita-chat.json
grep -Fq '"status":"pending"' /tmp/lokalkita-chat.json
grep -Fq '"balance_after":25' /tmp/lokalkita-chat.json

echo "Tes C4 poin: redeem poin plus uang..."
POIN_REDEEM_2_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"redeem\",\"store_id\":\"$STORE_ID\",\"reward_id\":\"80000000-0000-4000-8000-000000000002\",\"quantity\":1}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_REDEEM_2_STATUS" = "201"
grep -Fq '"points_used":8' /tmp/lokalkita-chat.json
grep -Fq '"cash_addon":2000' /tmp/lokalkita-chat.json
grep -Fq '"balance_after":17' /tmp/lokalkita-chat.json

echo "Tes C4 poin: batas pembeli ditolak..."
POIN_LIMIT_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"redeem\",\"store_id\":\"$STORE_ID\",\"reward_id\":\"80000000-0000-4000-8000-000000000001\",\"quantity\":1}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_LIMIT_STATUS" = "409"
grep -Fq '"error_code":"CONFLICT"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: redeem kuota..."
POIN_QUOTA_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"redeem\",\"store_id\":\"$STORE_ID\",\"reward_id\":\"$POIN_REWARD_QUOTA_ID\",\"quantity\":1}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_QUOTA_STATUS" = "201"
grep -Fq '"points_used":1' /tmp/lokalkita-chat.json
grep -Fq '"balance_after":16' /tmp/lokalkita-chat.json

echo "Tes C4 poin: kuota habis ditolak..."
POIN_QUOTA_FULL_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"redeem\",\"store_id\":\"$STORE_ID\",\"reward_id\":\"$POIN_REWARD_QUOTA_ID\",\"quantity\":1}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_QUOTA_FULL_STATUS" = "409"
grep -Fq '"error_code":"CONFLICT"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: saldo tidak cukup..."
POIN_INSUFFICIENT_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"redeem\",\"store_id\":\"$STORE_ID\",\"reward_id\":\"$POIN_REWARD_HIGH_ID\",\"quantity\":1}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_INSUFFICIENT_STATUS" = "409"
grep -Fq '"error_code":"INSUFFICIENT_POINTS"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: reward toko lain ditolak..."
POIN_WRONG_REWARD_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"redeem\",\"store_id\":\"$STORE_ID\",\"reward_id\":\"80000000-0000-4000-8000-000000000003\",\"quantity\":1}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_WRONG_REWARD_STATUS" = "404"
grep -Fq '"error_code":"NOT_FOUND"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: quantity nol ditolak..."
POIN_QUANTITY_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_SARI" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"redeem\",\"store_id\":\"$STORE_ID\",\"reward_id\":\"80000000-0000-4000-8000-000000000002\",\"quantity\":0}" \
    "$BASE_URL/api/poin.php")"
test "$POIN_QUANTITY_STATUS" = "400"
grep -Fq '"error_code":"VALIDATION_ERROR"' /tmp/lokalkita-chat.json

echo "Tes C4 poin: riwayat Sari..."
SARI_POIN_HISTORY="$(curl -fsS -b "$COOKIE_SARI" \
    "$BASE_URL/api/poin.php?action=history&store_id=$STORE_ID")"
printf '%s' "$SARI_POIN_HISTORY" | grep -Fq '"total":4'
printf '%s' "$SARI_POIN_HISTORY" | grep -Fq '"type":"earn"'
printf '%s' "$SARI_POIN_HISTORY" | grep -Fq '"type":"reserve"'

echo "Tes C4 poin: saldo terpisah per toko..."
SARI_POIN_STORE2="$(curl -fsS -b "$COOKIE_SARI" \
    "$BASE_URL/api/poin.php?action=balance&store_id=$STORE2_ID")"
printf '%s' "$SARI_POIN_STORE2" | grep -Fq '"balance":42'

echo "Tes C5 laporan: ringkasan bulanan..."
LAPORAN_STORE1="$(curl -fsS -b "$COOKIE_TAMAM" \
    "$BASE_URL/api/laporan.php?store_id=$STORE_ID&year=2026&month=1")"
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"label":"Januari 2026"'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"gross_revenue":45000'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"discounts":5000'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"net_revenue":40000'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"hpp":26500'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"gross_profit":13500'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"operating_expenses":2000000'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"promo_costs":2000'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"net_profit":-1988500'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"net_margin":-4971.25'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"product_name":"Teh Melati Botol"'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"qty_sold":3'
printf '%s' "$LAPORAN_STORE1" | grep -Fq '"amount":500000'

echo "Tes C5 laporan: snapshot tanpa refresh..."
LAPORAN_SNAPSHOT="$(curl -fsS -b "$COOKIE_TAMAM" \
    "$BASE_URL/api/laporan.php?store_id=$STORE_ID&year=2026&month=1&refresh=0")"
printf '%s' "$LAPORAN_SNAPSHOT" | grep -Fq '"net_profit":-1988500'

echo "Tes C5 laporan: penjual toko lain ditolak..."
LAPORAN_WRONG_STORE_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    "$BASE_URL/api/laporan.php?store_id=$STORE2_ID&year=2026&month=1")"
test "$LAPORAN_WRONG_STORE_STATUS" = "404"
grep -Fq '"error_code":"NOT_FOUND"' /tmp/lokalkita-chat.json

echo "Tes C5 laporan: pembeli ditolak..."
LAPORAN_BUYER_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    "$BASE_URL/api/laporan.php?store_id=$STORE_ID&year=2026&month=1")"
test "$LAPORAN_BUYER_STATUS" = "403"
grep -Fq '"error_code":"FORBIDDEN"' /tmp/lokalkita-chat.json

echo "Tes C5 laporan: bulan tidak valid..."
LAPORAN_MONTH_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    "$BASE_URL/api/laporan.php?store_id=$STORE_ID&year=2026&month=13")"
test "$LAPORAN_MONTH_STATUS" = "400"
grep -Fq '"error_code":"VALIDATION_ERROR"' /tmp/lokalkita-chat.json

echo "Tes C5 laporan: tahun wajib diisi..."
LAPORAN_YEAR_STATUS="$(curl -s -o /tmp/lokalkita-chat.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    "$BASE_URL/api/laporan.php?store_id=$STORE_ID&month=1")"
test "$LAPORAN_YEAR_STATUS" = "400"
grep -Fq '"error_code":"VALIDATION_ERROR"' /tmp/lokalkita-chat.json

echo "Tes C8 HPP: hitung valid..."
HPP_RESPONSE="$(curl -fsS -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"units_produced\":50,\"material_cost\":300000,\"labor_cost\":100000,\"packaging_cost\":50000,\"overhead_cost\":25000,\"target_margin_percent\":30}" \
    "$BASE_URL/api/hpp.php")"
printf '%s' "$HPP_RESPONSE" | grep -Fq '"total_cost":475000'
printf '%s' "$HPP_RESPONSE" | grep -Fq '"units_produced":50'
printf '%s' "$HPP_RESPONSE" | grep -Fq '"hpp_per_unit":9500'
printf '%s' "$HPP_RESPONSE" | grep -Fq '"suggested_price":13600'
printf '%s' "$HPP_RESPONSE" | grep -Fq '"target_margin_percent":30'
printf '%s' "$HPP_RESPONSE" | grep -Fq '"margin_percent":30.15'
printf '%s' "$HPP_RESPONSE" | grep -Fq '"markup_percent":43.16'
printf '%s' "$HPP_RESPONSE" | grep -Fq '"engine":"python"'
printf '%s' "$HPP_RESPONSE" | grep -Fq '"saved":false'

echo "Tes C8 HPP: simpan kalkulasi..."
HPP_SAVE_RESPONSE="$(curl -fsS -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"product_id\":\"$PRODUCT_ID\",\"variant_id\":\"$VARIANT_ID\",\"units_produced\":50,\"material_cost\":300000,\"labor_cost\":100000,\"packaging_cost\":50000,\"overhead_cost\":25000,\"target_margin_percent\":30,\"save\":true}" \
    "$BASE_URL/api/hpp.php")"
printf '%s' "$HPP_SAVE_RESPONSE" | grep -Fq '"saved":true'
HPP_CALC_ID="$(printf '%s' "$HPP_SAVE_RESPONSE" | sed -n 's/.*"calculation_id":"\([^"]*\)".*/\1/p')"
test -n "$HPP_CALC_ID"
HPP_COMPONENT_COUNT="$("${COMPOSE[@]}" exec -T db mysql -N -B -uroot -proot lokalkita -e "SELECT COUNT(*) FROM hpp_components WHERE calculation_id='$HPP_CALC_ID'" 2>/dev/null)"
test "$HPP_COMPONENT_COUNT" = "4"

echo "Tes C8 HPP: pembeli ditolak..."
HPP_BUYER_STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"units_produced\":50,\"target_margin_percent\":30}" \
    "$BASE_URL/api/hpp.php")"
test "$HPP_BUYER_STATUS" = "403"
grep -Fq '"error_code":"FORBIDDEN"' /tmp/lokalkita-c8.json

echo "Tes C8 HPP: penjual toko lain ditolak..."
HPP_WRONG_STORE_STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE2_ID\",\"units_produced\":50,\"target_margin_percent\":30}" \
    "$BASE_URL/api/hpp.php")"
test "$HPP_WRONG_STORE_STATUS" = "404"
grep -Fq '"error_code":"NOT_FOUND"' /tmp/lokalkita-c8.json

echo "Tes C8 HPP: unit nol ditolak..."
HPP_UNIT_STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"units_produced\":0,\"target_margin_percent\":30}" \
    "$BASE_URL/api/hpp.php")"
test "$HPP_UNIT_STATUS" = "400"
grep -Fq '"error_code":"VALIDATION_ERROR"' /tmp/lokalkita-c8.json

echo "Tes C8 HPP: margin 100 ditolak..."
HPP_MARGIN_STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"units_produced\":50,\"target_margin_percent\":100}" \
    "$BASE_URL/api/hpp.php")"
test "$HPP_MARGIN_STATUS" = "400"
grep -Fq '"error_code":"VALIDATION_ERROR"' /tmp/lokalkita-c8.json

echo "Tes C8 HPP: produk toko lain ditolak..."
HPP_PRODUCT_STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"product_id\":\"$PRODUCT_STORE2_ID\",\"units_produced\":1,\"target_margin_percent\":0,\"save\":true}" \
    "$BASE_URL/api/hpp.php")"
test "$HPP_PRODUCT_STATUS" = "404"
grep -Fq '"error_code":"NOT_FOUND"' /tmp/lokalkita-c8.json

echo "Tes C8 diskon: hitung valid..."
DISKON_RESPONSE="$(curl -fsS -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"normal_price\":15000,\"discount_percent\":20,\"quantity\":3,\"additional_cost\":0,\"hpp_per_unit\":9500,\"target_margin_percent\":30}" \
    "$BASE_URL/api/diskon.php")"
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"discount_amount_per_unit":3000'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"final_price_per_unit":12000'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"total_revenue":36000'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"profit_per_unit":2500'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"total_profit":7500'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"margin_percent":20.83'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"max_discount_percent_safe":36.67'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"max_discount_percent_target":9.52'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"status":"below_target"'
printf '%s' "$DISKON_RESPONSE" | grep -Fq '"engine":"python"'

echo "Tes C8 diskon: status rugi..."
DISKON_LOSS_RESPONSE="$(curl -fsS -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"normal_price\":15000,\"discount_percent\":40,\"quantity\":3,\"hpp_per_unit\":9500,\"target_margin_percent\":30}" \
    "$BASE_URL/api/diskon.php")"
printf '%s' "$DISKON_LOSS_RESPONSE" | grep -Fq '"profit_per_unit":-500'
printf '%s' "$DISKON_LOSS_RESPONSE" | grep -Fq '"total_profit":-1500'
printf '%s' "$DISKON_LOSS_RESPONSE" | grep -Fq '"status":"loss"'

echo "Tes C8 diskon: status aman..."
DISKON_SAFE_RESPONSE="$(curl -fsS -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"normal_price\":15000,\"discount_percent\":20,\"quantity\":1,\"hpp_per_unit\":9500,\"target_margin_percent\":0}" \
    "$BASE_URL/api/diskon.php")"
printf '%s' "$DISKON_SAFE_RESPONSE" | grep -Fq '"status":"safe"'

echo "Tes C8 diskon: quantity nol ditolak..."
DISKON_QUANTITY_STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"normal_price\":15000,\"discount_percent\":20,\"quantity\":0,\"hpp_per_unit\":9500,\"target_margin_percent\":30}" \
    "$BASE_URL/api/diskon.php")"
test "$DISKON_QUANTITY_STATUS" = "400"
grep -Fq '"error_code":"VALIDATION_ERROR"' /tmp/lokalkita-c8.json

echo "Tes C8 diskon: pembeli ditolak..."
DISKON_BUYER_STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
    -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"normal_price\":15000,\"discount_percent\":20,\"quantity\":1,\"hpp_per_unit\":9500,\"target_margin_percent\":30}" \
    "$BASE_URL/api/diskon.php")"
test "$DISKON_BUYER_STATUS" = "403"
grep -Fq '"error_code":"FORBIDDEN"' /tmp/lokalkita-c8.json

echo "Tes C8 diskon: penjual toko lain ditolak..."
DISKON_WRONG_STORE_STATUS="$(curl -s -o /tmp/lokalkita-c8.json -w '%{http_code}' \
    -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE2_ID\",\"normal_price\":15000,\"discount_percent\":20,\"quantity\":1,\"hpp_per_unit\":9500,\"target_margin_percent\":30}" \
    "$BASE_URL/api/diskon.php")"
test "$DISKON_WRONG_STORE_STATUS" = "404"
grep -Fq '"error_code":"NOT_FOUND"' /tmp/lokalkita-c8.json

echo "Tes C8 fallback: hentikan Python..."
"${COMPOSE[@]}" stop python >/dev/null

HPP_FALLBACK_RESPONSE="$(curl -fsS -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"units_produced\":50,\"material_cost\":300000,\"labor_cost\":100000,\"packaging_cost\":50000,\"overhead_cost\":25000,\"target_margin_percent\":30}" \
    "$BASE_URL/api/hpp.php")"
printf '%s' "$HPP_FALLBACK_RESPONSE" | grep -Fq '"engine":"php"'
printf '%s' "$HPP_FALLBACK_RESPONSE" | grep -Fq '"suggested_price":13600'

DISKON_FALLBACK_RESPONSE="$(curl -fsS -b "$COOKIE_TAMAM" \
    -H 'Content-Type: application/json' \
    -d "{\"store_id\":\"$STORE_ID\",\"normal_price\":15000,\"discount_percent\":20,\"quantity\":3,\"hpp_per_unit\":9500,\"target_margin_percent\":30}" \
    "$BASE_URL/api/diskon.php")"
printf '%s' "$DISKON_FALLBACK_RESPONSE" | grep -Fq '"engine":"php"'
printf '%s' "$DISKON_FALLBACK_RESPONSE" | grep -Fq '"status":"below_target"'

"${COMPOSE[@]}" start python >/dev/null
for _ in $(seq 1 30); do
    if "${COMPOSE[@]}" exec -T python python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5001/health')" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo "Tes C7 rollback transaksi..."
"${COMPOSE[@]}" exec -T php php tests/rollback_test.php

echo "Tes CORS preflight..."
curl -fsS -o /dev/null -w '%{http_code}' \
    -X OPTIONS \
    -H 'Origin: http://localhost:5500' \
    -H 'Access-Control-Request-Method: POST' \
    "$BASE_URL/api/ping.php" | grep -q '^204$'

echo "Tes CORS preflight upload gambar..."
CORS_UPLOAD_HEADERS="$(curl -fsS -D - -o /dev/null \
    -X OPTIONS \
    -H 'Origin: http://localhost:5500' \
    -H 'Access-Control-Request-Method: POST' \
    "$BASE_URL/api/product_image.php")"
printf '%s' "$CORS_UPLOAD_HEADERS" | grep -q '^HTTP/.* 204'
printf '%s' "$CORS_UPLOAD_HEADERS" | grep -qi '^Access-Control-Allow-Origin: http://localhost:5500'

echo "Fase 0 + C1-C9 OK."
