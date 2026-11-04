#!/usr/bin/env bash

PROJECT_DIR="/home/kurakura/Developer/proyek/LocalKita"
PYTHON_DIR="$PROJECT_DIR/backend/python"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "=================================="
echo "   Menjalankan LokalKita (All-in-One)"
echo "=================================="
echo ""

# Cek docker container lokalkita-db
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -q '^lokalkita-db$'; then
    echo "[OK] lokalkita-db sudah berjalan"
  else
    echo "[INFO] Menjalankan lokalkita-db..."
    docker start lokalkita-db >/dev/null 2>&1 && echo "[OK] lokalkita-db berhasil dijalankan" || echo "[WARN] Gagal menjalankan lokalkita-db (bisa jadi container belum ada)"
  fi
else
  echo "[INFO] Docker tidak ditemukan, pastikan MySQL lokal sudah berjalan"
fi

# Kill proses yang mungkin masih nyangkut
pkill -f "php -S 127.0.0.1:8000" >/dev/null 2>&1
pkill -f "php -S 127.0.0.1:5500" >/dev/null 2>&1
pkill -f "hitung.py" >/dev/null 2>&1
sleep 2

echo ""
echo "[1/4] Menjalankan Flask Microservice (HPP & Diskon) di :5001..."
cd "$PYTHON_DIR"
source .venv/bin/activate
nohup python hitung.py > /tmp/lokalkita-flask.log 2>&1 &
FLASK_PID=$!
sleep 3

# Cek flask
if curl -s http://127.0.0.1:5001/health >/dev/null 2>&1; then
  echo "[OK] Flask berjalan di http://127.0.0.1:5001"
else
  echo "[WARN] Flask mungkin belum siap, cek log di /tmp/lokalkita-flask.log"
fi

echo ""
echo "[2/4] Menjalankan Backend PHP API di :8000..."
cd "$PROJECT_DIR"
nohup php -S 127.0.0.1:8000 -t . > /tmp/lokalkita-php-api.log 2>&1 &
PHP_PID=$!
sleep 2

if curl -s http://127.0.0.1:8000/backend/api/ping.php >/dev/null 2>&1; then
  echo "[OK] PHP API berjalan di http://127.0.0.1:8000"
else
  echo "[WARN] PHP API mungkin belum siap, cek log di /tmp/lokalkita-php-api.log"
fi

echo ""
echo "[3/4] Menjalankan Frontend di :5500..."
cd "$FRONTEND_DIR"
nohup php -S 127.0.0.1:5500 > /tmp/lokalkita-frontend.log 2>&1 &
FE_PID=$!
sleep 2

echo "[OK] Frontend berjalan di http://127.0.0.1:5500"
echo ""
echo "[4/4] Selesai!"
echo ""
echo "=================================="
echo "Semua service sudah dijalankan:"
echo " - Flask   : http://127.0.0.1:5001"
echo " - PHP API : http://127.0.0.1:8000/backend/api/"
echo " - Frontend: http://127.0.0.1:5500"
echo "=================================="
echo ""
echo "Buka browser: http://127.0.0.1:5500"
echo "Akun demo: tamam@lokalkita.test / password123"
echo ""
echo "Log tersedia di:"
echo "  /tmp/lokalkita-flask.log"
echo "  /tmp/lokalkita-php-api.log"
echo "  /tmp/lokalkita-frontend.log"
echo ""
echo "Untuk stop semua: ./stop-lokalkita.sh"
