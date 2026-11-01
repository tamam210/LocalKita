#!/usr/bin/env bash
echo "Menghentikan semua service LokalKita..."
pkill -f "hitung.py" 2>/dev/null
pkill -f "php -S 127.0.0.1:8000" 2>/dev/null
pkill -f "php -S 127.0.0.1:5500" 2>/dev/null
echo "Selesai. Semua service dihentikan."
