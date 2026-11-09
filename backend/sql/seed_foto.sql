USE lokalkita;
SET NAMES utf8mb4;

-- Kategori Jasa
INSERT INTO categories (category_id, name, slug, type, parent_id)
VALUES ('10000000-0000-4000-8000-000000000006', 'Jasa', 'jasa', 'product', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type);

-- Produk baru
INSERT INTO products (product_id, store_id, category_id, slug, name, description, earns_points, point_multiplier, status) VALUES
('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'keripik-singkong', 'Keripik Singkong', 'Keripik singkong renyah produksi rumahan.', 1, 1.00, 'active'),
('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'kopi-lokal', 'Kopi Lokal', 'Kopi lokal dalam kemasan.', 1, 1.00, 'active'),
('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'kain-batik-tulis', 'Kain Batik Tulis', 'Kain batik tulis buatan pengrajin lokal.', 1, 1.00, 'active'),
('40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 'laundry-kiloan', 'Laundry Kiloan', 'Jasa cuci dan lipat per kilogram.', 0, 1.00, 'active'),
('40000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'sambal-roa', 'Sambal Roa', 'Sambal roa khas Manado.', 1, 1.00, 'active')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  category_id = VALUES(category_id),
  earns_points = VALUES(earns_points),
  point_multiplier = VALUES(point_multiplier),
  status = VALUES(status);

-- Varian
INSERT INTO product_variants (variant_id, product_id, store_id, sku, name, price, hpp_unit, stock, status) VALUES
('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'KERIPIK-ORI', 'Original', 15000, 8000.00, 40, 'active'),
('50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'KOPI-250', 'Botol 250 ml', 45000, 25000.00, 25, 'active'),
('50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'BATIK-TULIS', 'Kain 2 meter', 185000, 120000.00, 5, 'active'),
('50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000001', 'LAUNDRY-KG', 'Per kilogram', 7000, 3000.00, 999, 'active'),
('50000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000001', 'SAMBAL-ROA', 'Toples 200 gram', 35000, 20000.00, 10, 'active')
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  hpp_unit = VALUES(hpp_unit),
  stock = VALUES(stock),
  status = VALUES(status);

-- File foto (pakai gambar yang sudah ada di frontend/img/produk)
INSERT INTO files (file_id, store_id, uploader_id, storage_path, mime_type, visibility) VALUES
('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'img/produk/keripik-singkong.jpg?v=2', 'image/jpeg', 'public'),
('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'img/produk/kopi-lokal.jpg?v=2', 'image/jpeg', 'public'),
('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'img/produk/kain-batik-tulis.jpg?v=2', 'image/jpeg', 'public'),
('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'img/produk/laundry-kiloan.jpg?v=2', 'image/jpeg', 'public'),
('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'img/produk/sambal-roa.jpg?v=2', 'image/jpeg', 'public')
ON DUPLICATE KEY UPDATE
  storage_path = VALUES(storage_path),
  mime_type = VALUES(mime_type),
  visibility = VALUES(visibility),
  deleted_at = NULL;

-- Foto utama produk
INSERT INTO product_images (image_id, product_id, file_id, alt_text, sort_order, is_primary) VALUES
('a5000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000010', 'Keripik Singkong', 0, 1),
('a5000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000011', 'Kopi Lokal', 0, 1),
('a5000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000012', 'Kain Batik Tulis', 0, 1),
('a5000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000013', 'Laundry Kiloan', 0, 1),
('a5000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000014', 'Sambal Roa', 0, 1)
ON DUPLICATE KEY UPDATE
  file_id = VALUES(file_id),
  alt_text = VALUES(alt_text),
  sort_order = VALUES(sort_order),
  is_primary = VALUES(is_primary);

-- Tas Anyaman yang sudah ada: arahkan ke foto yang benar
UPDATE files
SET storage_path = 'img/produk/tas-anyaman.jpg?v=2',
    deleted_at = NULL
WHERE file_id = '30000000-0000-4000-8000-000000000007';

-- Risoles & Teh Melati belum ada foto yang cocok.
-- Sembunyikan dari API biar nggak muncul gambar rusak.
UPDATE files
SET deleted_at = NOW()
WHERE file_id IN (
  '30000000-0000-4000-8000-000000000005',
  '30000000-0000-4000-8000-000000000006'
);