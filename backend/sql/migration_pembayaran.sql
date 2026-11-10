ALTER TABLE stores
  ADD COLUMN payment_online_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER operational_hours,
  ADD COLUMN payment_bank_name VARCHAR(80) NULL AFTER payment_online_enabled,
  ADD COLUMN payment_account_number VARCHAR(60) NULL AFTER payment_bank_name,
  ADD COLUMN payment_account_name VARCHAR(120) NULL AFTER payment_account_number,
  ADD COLUMN payment_va_number VARCHAR(60) NULL AFTER payment_account_name,
  ADD COLUMN payment_qris_image_url VARCHAR(500) NULL AFTER payment_va_number,
  ADD COLUMN payment_instructions TEXT NULL AFTER payment_qris_image_url;

ALTER TABLE payments
  MODIFY COLUMN method ENUM(
    'manual_transfer',
    'cash',
    'qris',
    'ewallet',
    'other',
    'virtual_account',
    'credit_card'
  ) NOT NULL DEFAULT 'manual_transfer';
