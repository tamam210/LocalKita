SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS lokalkita
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lokalkita;

-- Drop dari tabel anak ke induk
DROP TABLE IF EXISTS monthly_reports;
DROP TABLE IF EXISTS operational_expenses;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS point_liabilities;
DROP TABLE IF EXISTS point_redemptions;
DROP TABLE IF EXISTS reward_products;
DROP TABLE IF EXISTS point_transactions;
DROP TABLE IF EXISTS point_accounts;
DROP TABLE IF EXISTS point_settings;
DROP TABLE IF EXISTS order_promotions;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_status_histories;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS hpp_components;
DROP TABLE IF EXISTS hpp_calculations;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS store_members;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 1. users
CREATE TABLE users (
  user_id CHAR(36) NOT NULL DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  full_name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','seller','buyer') NOT NULL DEFAULT 'buyer',
  status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  email_verified_at TIMESTAMP NULL DEFAULT NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. categories
CREATE TABLE categories (
  category_id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  type ENUM('store','product') NOT NULL DEFAULT 'product',
  parent_id CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_type_parent (type, parent_id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. files
CREATE TABLE files (
  file_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) DEFAULT NULL,
  uploader_id CHAR(36) DEFAULT NULL,
  storage_path TEXT NOT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  visibility ENUM('private','public') NOT NULL DEFAULT 'private',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (file_id),
  KEY idx_files_store_created (store_id, created_at),
  KEY idx_files_uploader (uploader_id),
  CONSTRAINT fk_files_uploader FOREIGN KEY (uploader_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. stores
CREATE TABLE stores (
  store_id CHAR(36) NOT NULL DEFAULT (UUID()),
  owner_user_id CHAR(36) NOT NULL,
  category_id CHAR(36) DEFAULT NULL,
  slug VARCHAR(160) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100) DEFAULT NULL,
  province VARCHAR(100) DEFAULT NULL,
  operational_hours VARCHAR(120) DEFAULT NULL,
  logo_file_id CHAR(36) DEFAULT NULL,
  cover_file_id CHAR(36) DEFAULT NULL,
  status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (store_id),
  UNIQUE KEY uq_stores_slug (slug),
  KEY idx_stores_owner (owner_user_id),
  KEY idx_stores_category_status (category_id, status),
  KEY idx_stores_city (city),
  CONSTRAINT fk_stores_owner FOREIGN KEY (owner_user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_stores_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE SET NULL,
  CONSTRAINT fk_stores_logo FOREIGN KEY (logo_file_id) REFERENCES files (file_id) ON DELETE SET NULL,
  CONSTRAINT fk_stores_cover FOREIGN KEY (cover_file_id) REFERENCES files (file_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- stores <-> files saling merujuk, FK files.store_id ditambahkan setelah stores ada
ALTER TABLE files
  ADD CONSTRAINT fk_files_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE SET NULL;

-- 5. store_members
CREATE TABLE store_members (
  store_member_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner','admin','staff') NOT NULL DEFAULT 'staff',
  status ENUM('active','invited','inactive') NOT NULL DEFAULT 'active',
  invited_by CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_member_id),
  UNIQUE KEY uq_store_members_store_user (store_id, user_id),
  KEY idx_store_members_user_status (user_id, status),
  KEY idx_store_members_invited_by (invited_by),
  CONSTRAINT fk_store_members_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_store_members_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_store_members_invited_by FOREIGN KEY (invited_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. audit_logs
CREATE TABLE audit_logs (
  audit_id CHAR(36) NOT NULL DEFAULT (UUID()),
  actor_user_id CHAR(36) DEFAULT NULL,
  store_id CHAR(36) DEFAULT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) DEFAULT NULL,
  entity_id CHAR(36) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  KEY idx_audit_store_created (store_id, created_at),
  KEY idx_audit_actor_created (actor_user_id, created_at),
  KEY idx_audit_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. products
CREATE TABLE products (
  product_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  category_id CHAR(36) DEFAULT NULL,
  slug VARCHAR(160) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  earns_points TINYINT(1) NOT NULL DEFAULT 1,
  point_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  status ENUM('draft','active','inactive','archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (product_id),
  UNIQUE KEY uq_products_store_slug (store_id, slug),
  KEY idx_products_store_status (store_id, status),
  KEY idx_products_category (category_id),
  KEY idx_products_name (name),
  CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. product_variants
CREATE TABLE product_variants (
  variant_id CHAR(36) NOT NULL DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  store_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  price INT NOT NULL DEFAULT 0,
  hpp_unit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  stock INT NOT NULL DEFAULT 0,
  status ENUM('active','inactive','out_of_stock') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (variant_id),
  UNIQUE KEY uq_product_variants_store_sku (store_id, sku),
  KEY idx_variants_product_status (product_id, status),
  KEY idx_variants_store_stock (store_id, stock),
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE,
  CONSTRAINT fk_variants_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT chk_variants_price CHECK (price >= 0),
  CONSTRAINT chk_variants_stock CHECK (stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. product_images
CREATE TABLE product_images (
  image_id CHAR(36) NOT NULL DEFAULT (UUID()),
  product_id CHAR(36) NOT NULL,
  file_id CHAR(36) NOT NULL,
  alt_text VARCHAR(180) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (image_id),
  KEY idx_product_images_product_sort (product_id, sort_order),
  KEY idx_product_images_file (file_id),
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE,
  CONSTRAINT fk_product_images_file FOREIGN KEY (file_id) REFERENCES files (file_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. stock_movements
CREATE TABLE stock_movements (
  movement_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  variant_id CHAR(36) NOT NULL,
  type ENUM('in','out','sale','return','adjustment') NOT NULL,
  quantity INT NOT NULL,
  reference_id CHAR(36) DEFAULT NULL,
  note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (movement_id),
  KEY idx_stock_movements_store_created (store_id, created_at),
  KEY idx_stock_movements_variant_created (variant_id, created_at),
  CONSTRAINT fk_stock_movements_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_movements_variant FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. hpp_calculations
CREATE TABLE hpp_calculations (
  calculation_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  product_id CHAR(36) DEFAULT NULL,
  variant_id CHAR(36) DEFAULT NULL,
  total_cost INT NOT NULL DEFAULT 0,
  unit_count INT NOT NULL DEFAULT 1,
  hpp_per_unit DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  target_margin DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  suggested_price DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (calculation_id),
  KEY idx_hpp_calcs_store_created (store_id, created_at),
  KEY idx_hpp_calcs_product (product_id),
  KEY idx_hpp_calcs_variant (variant_id),
  CONSTRAINT fk_hpp_calcs_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_hpp_calcs_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE SET NULL,
  CONSTRAINT fk_hpp_calcs_variant FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id) ON DELETE SET NULL,
  CONSTRAINT chk_hpp_unit_count CHECK (unit_count > 0),
  CONSTRAINT chk_hpp_margin CHECK (target_margin >= 0 AND target_margin <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. hpp_components
CREATE TABLE hpp_components (
  component_id CHAR(36) NOT NULL DEFAULT (UUID()),
  calculation_id CHAR(36) NOT NULL,
  component_type ENUM('material','labor','packaging','overhead') NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (component_id),
  KEY idx_hpp_components_calc (calculation_id),
  CONSTRAINT fk_hpp_components_calc FOREIGN KEY (calculation_id) REFERENCES hpp_calculations (calculation_id) ON DELETE CASCADE,
  CONSTRAINT chk_hpp_components_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. orders
CREATE TABLE orders (
  order_id CHAR(36) NOT NULL DEFAULT (UUID()),
  order_number VARCHAR(40) NOT NULL,
  store_id CHAR(36) NOT NULL,
  buyer_user_id CHAR(36) NOT NULL,
  status ENUM('pending','confirmed','processing','shipped','completed','cancelled','refunded') NOT NULL DEFAULT 'pending',
  fulfillment_method ENUM('pickup','delivery','shipping') NOT NULL DEFAULT 'pickup',
  subtotal INT NOT NULL DEFAULT 0,
  discount_total INT NOT NULL DEFAULT 0,
  shipping_cost INT NOT NULL DEFAULT 0,
  shipping_address TEXT,
  total_amount INT NOT NULL DEFAULT 0,
  points_earned INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  UNIQUE KEY uq_orders_order_number (order_number),
  KEY idx_orders_store_status (store_id, status),
  KEY idx_orders_store_created (store_id, created_at),
  KEY idx_orders_buyer_created (buyer_user_id, created_at),
  CONSTRAINT fk_orders_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_user_id) REFERENCES users (user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. order_items
CREATE TABLE order_items (
  order_item_id CHAR(36) NOT NULL DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  variant_id CHAR(36) DEFAULT NULL,
  product_name_snapshot VARCHAR(180) NOT NULL,
  variant_name_snapshot VARCHAR(120) DEFAULT NULL,
  quantity INT NOT NULL,
  unit_price INT NOT NULL,
  hpp_unit_snapshot DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  line_total INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_item_id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_variant (variant_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id) ON DELETE SET NULL,
  CONSTRAINT chk_order_items_qty CHECK (quantity > 0),
  CONSTRAINT chk_order_items_price CHECK (unit_price >= 0 AND line_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. order_status_histories
CREATE TABLE order_status_histories (
  status_history_id CHAR(36) NOT NULL DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  status ENUM('pending','confirmed','processing','shipped','completed','cancelled','refunded') NOT NULL,
  changed_by CHAR(36) DEFAULT NULL,
  note VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (status_history_id),
  KEY idx_order_status_order_created (order_id, created_at),
  KEY idx_order_status_changed_by (changed_by),
  CONSTRAINT fk_order_status_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_status_changed_by FOREIGN KEY (changed_by) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. payments
CREATE TABLE payments (
  payment_id CHAR(36) NOT NULL DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  store_id CHAR(36) NOT NULL,
  method ENUM('manual_transfer','cash','qris','ewallet','other') NOT NULL DEFAULT 'manual_transfer',
  amount INT NOT NULL DEFAULT 0,
  status ENUM('pending','verified','rejected','refunded') NOT NULL DEFAULT 'pending',
  proof_file_id CHAR(36) DEFAULT NULL,
  verified_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  KEY idx_payments_order (order_id),
  KEY idx_payments_store_status (store_id, status),
  KEY idx_payments_store_created (store_id, created_at),
  KEY idx_payments_proof (proof_file_id),
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_proof FOREIGN KEY (proof_file_id) REFERENCES files (file_id) ON DELETE SET NULL,
  CONSTRAINT chk_payments_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. promotions
CREATE TABLE promotions (
  promotion_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  discount_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_purchase INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMP NULL DEFAULT NULL,
  ends_at TIMESTAMP NULL DEFAULT NULL,
  quota INT DEFAULT NULL,
  status ENUM('draft','active','ended','inactive') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (promotion_id),
  KEY idx_promotions_store_status (store_id, status),
  KEY idx_promotions_store_dates (store_id, starts_at, ends_at),
  CONSTRAINT fk_promotions_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT chk_promotions_value CHECK (discount_value >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. order_promotions
CREATE TABLE order_promotions (
  order_promotion_id CHAR(36) NOT NULL DEFAULT (UUID()),
  order_id CHAR(36) NOT NULL,
  promotion_id CHAR(36) NOT NULL,
  discount_amount INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_promotion_id),
  UNIQUE KEY uq_order_promotions_order_promo (order_id, promotion_id),
  KEY idx_order_promotions_promotion (promotion_id),
  CONSTRAINT fk_order_promotions_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_promotions_promotion FOREIGN KEY (promotion_id) REFERENCES promotions (promotion_id) ON DELETE CASCADE,
  CONSTRAINT chk_order_promotions_discount CHECK (discount_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. point_settings
CREATE TABLE point_settings (
  store_id CHAR(36) NOT NULL,
  point_value_rp INT NOT NULL DEFAULT 100,
  earn_rate_rp INT NOT NULL DEFAULT 2000,
  expiry_days INT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id),
  CONSTRAINT fk_point_settings_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT chk_point_settings_values CHECK (point_value_rp > 0 AND earn_rate_rp > 0),
  CONSTRAINT chk_point_settings_expiry CHECK (expiry_days IS NULL OR expiry_days > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. point_accounts
CREATE TABLE point_accounts (
  point_account_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  buyer_user_id CHAR(36) NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  reserved_balance INT NOT NULL DEFAULT 0,
  lifetime_earned INT NOT NULL DEFAULT 0,
  lifetime_redeemed INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (point_account_id),
  UNIQUE KEY uq_point_accounts_store_buyer (store_id, buyer_user_id),
  KEY idx_point_accounts_buyer (buyer_user_id),
  CONSTRAINT fk_point_accounts_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_point_accounts_buyer FOREIGN KEY (buyer_user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. point_transactions
CREATE TABLE point_transactions (
  point_tx_id CHAR(36) NOT NULL DEFAULT (UUID()),
  point_account_id CHAR(36) NOT NULL,
  store_id CHAR(36) NOT NULL,
  order_id CHAR(36) DEFAULT NULL,
  type ENUM('earn','reserve','release','redeem','expire','adjustment') NOT NULL,
  points INT NOT NULL,
  balance_after INT NOT NULL,
  reference_id CHAR(36) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (point_tx_id),
  KEY idx_point_tx_account_created (point_account_id, created_at),
  KEY idx_point_tx_store_created (store_id, created_at),
  KEY idx_point_tx_order (order_id),
  CONSTRAINT fk_point_tx_account FOREIGN KEY (point_account_id) REFERENCES point_accounts (point_account_id) ON DELETE CASCADE,
  CONSTRAINT fk_point_tx_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_point_tx_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. reward_products
CREATE TABLE reward_products (
  reward_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  variant_id CHAR(36) DEFAULT NULL,
  name VARCHAR(160) NOT NULL,
  points_required INT NOT NULL,
  cash_addon INT NOT NULL DEFAULT 0,
  quota INT NOT NULL DEFAULT 0,
  per_buyer_limit INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMP NULL DEFAULT NULL,
  ends_at TIMESTAMP NULL DEFAULT NULL,
  status ENUM('draft','active','ended','inactive') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (reward_id),
  KEY idx_reward_products_store_status (store_id, status),
  KEY idx_reward_products_product (product_id),
  KEY idx_reward_products_variant (variant_id),
  CONSTRAINT fk_reward_products_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_reward_products_product FOREIGN KEY (product_id) REFERENCES products (product_id) ON DELETE CASCADE,
  CONSTRAINT fk_reward_products_variant FOREIGN KEY (variant_id) REFERENCES product_variants (variant_id) ON DELETE SET NULL,
  CONSTRAINT chk_reward_products_values CHECK (points_required > 0 AND cash_addon >= 0 AND quota >= 0 AND per_buyer_limit >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. point_redemptions
CREATE TABLE point_redemptions (
  redemption_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  reward_id CHAR(36) NOT NULL,
  buyer_user_id CHAR(36) NOT NULL,
  point_account_id CHAR(36) NOT NULL,
  points_used INT NOT NULL,
  cash_addon INT NOT NULL DEFAULT 0,
  status ENUM('pending','approved','rejected','completed','cancelled') NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (redemption_id),
  KEY idx_point_redemptions_store_status (store_id, status),
  KEY idx_point_redemptions_buyer_created (buyer_user_id, created_at),
  KEY idx_point_redemptions_account_created (point_account_id, created_at),
  KEY idx_point_redemptions_reward (reward_id),
  CONSTRAINT fk_point_redemptions_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_point_redemptions_reward FOREIGN KEY (reward_id) REFERENCES reward_products (reward_id) ON DELETE CASCADE,
  CONSTRAINT fk_point_redemptions_buyer FOREIGN KEY (buyer_user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_point_redemptions_account FOREIGN KEY (point_account_id) REFERENCES point_accounts (point_account_id) ON DELETE CASCADE,
  CONSTRAINT chk_point_redemptions_values CHECK (points_used > 0 AND cash_addon >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. point_liabilities
CREATE TABLE point_liabilities (
  liability_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  point_tx_id CHAR(36) NOT NULL,
  points INT NOT NULL,
  point_value_rp INT NOT NULL,
  reserved_amount INT NOT NULL,
  remaining_amount INT NOT NULL,
  status ENUM('reserved','partially_used','released','expired') NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (liability_id),
  UNIQUE KEY uq_point_liabilities_tx (point_tx_id),
  KEY idx_point_liabilities_store_status (store_id, status),
  CONSTRAINT fk_point_liabilities_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_point_liabilities_tx FOREIGN KEY (point_tx_id) REFERENCES point_transactions (point_tx_id) ON DELETE CASCADE,
  CONSTRAINT chk_point_liabilities_values CHECK (points > 0 AND reserved_amount >= 0 AND remaining_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. conversations
CREATE TABLE conversations (
  conversation_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  buyer_user_id CHAR(36) NOT NULL,
  order_id CHAR(36) DEFAULT NULL,
  status ENUM('open','closed') NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id),
  KEY idx_conversations_store_last (store_id, last_message_at),
  KEY idx_conversations_buyer_last (buyer_user_id, last_message_at),
  KEY idx_conversations_order (order_id),
  CONSTRAINT fk_conversations_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_conversations_buyer FOREIGN KEY (buyer_user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_conversations_order FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. messages
CREATE TABLE messages (
  message_id CHAR(36) NOT NULL DEFAULT (UUID()),
  conversation_id CHAR(36) NOT NULL,
  sender_user_id CHAR(36) DEFAULT NULL,
  file_id CHAR(36) DEFAULT NULL,
  type ENUM('text','image','file','system') NOT NULL DEFAULT 'text',
  body TEXT,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (message_id),
  KEY idx_messages_conversation_created (conversation_id, created_at),
  KEY idx_messages_sender (sender_user_id),
  KEY idx_messages_file (file_id),
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (conversation_id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_messages_file FOREIGN KEY (file_id) REFERENCES files (file_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. operational_expenses
CREATE TABLE operational_expenses (
  expense_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT,
  amount INT NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (expense_id),
  KEY idx_operational_expenses_store_date (store_id, expense_date),
  CONSTRAINT fk_operational_expenses_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT chk_operational_expenses_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. monthly_reports
CREATE TABLE monthly_reports (
  report_id CHAR(36) NOT NULL DEFAULT (UUID()),
  store_id CHAR(36) NOT NULL,
  period_year SMALLINT UNSIGNED NOT NULL,
  period_month TINYINT UNSIGNED NOT NULL,
  gross_revenue INT NOT NULL DEFAULT 0,
  discounts INT NOT NULL DEFAULT 0,
  net_revenue INT NOT NULL DEFAULT 0,
  hpp INT NOT NULL DEFAULT 0,
  gross_profit INT NOT NULL DEFAULT 0,
  operating_expenses INT NOT NULL DEFAULT 0,
  promo_costs INT NOT NULL DEFAULT 0,
  net_profit INT NOT NULL DEFAULT 0,
  net_margin DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  detail_json JSON DEFAULT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id),
  UNIQUE KEY uq_monthly_reports_store_period (store_id, period_year, period_month),
  KEY idx_monthly_reports_period (store_id, period_year, period_month),
  CONSTRAINT fk_monthly_reports_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT chk_monthly_reports_month CHECK (period_month BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
