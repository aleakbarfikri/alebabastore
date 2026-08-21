CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_reset_version text,
  totp_secret text,
  totp_enabled_at timestamptz,
  totp_recovery_codes text[] NOT NULL DEFAULT '{}',
  role text NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_reset_version text;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_enabled_at timestamptz;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_recovery_codes text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_part text NOT NULL CHECK (local_part ~ '^[a-z0-9]{4,6}$'),
  domain text NOT NULL,
  address text UNIQUE NOT NULL,
  password_hash text,
  pending_password text,
  buyer_email text,
  activated_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_mailboxes_address_lower_idx
  ON customer_mailboxes(lower(address));

CREATE TABLE IF NOT EXISTS customer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES customer_mailboxes(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_sessions_mailbox_idx
  ON customer_sessions(mailbox_id);

CREATE TABLE IF NOT EXISTS game_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code text UNIQUE NOT NULL,
  title text,
  game_name text NOT NULL,
  level integer NOT NULL CHECK (level > 0),
  rank text NOT NULL DEFAULT '',
  description text NOT NULL,
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  townhall_level integer,
  sold boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  delivery_credentials text,
  mailbox_id uuid UNIQUE REFERENCES customer_mailboxes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_accounts ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE game_accounts ADD COLUMN IF NOT EXISTS mailbox_id uuid UNIQUE
  REFERENCES customer_mailboxes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS account_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
  image_data bytea NOT NULL,
  thumbnail_data bytea NOT NULL,
  mime_type text NOT NULL DEFAULT 'image/webp',
  width integer NOT NULL,
  height integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_account_id uuid NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (char_length(comment) BETWEEN 10 AND 2000),
  customer_name text NOT NULL DEFAULT 'Anonymous',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  game_account_id uuid NOT NULL REFERENCES game_accounts(id),
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_provider text NOT NULL DEFAULT 'temanqris',
  payment_link_code text,
  payment_url text,
  provider_payload jsonb,
  provider_checked_at timestamptz,
  expires_at timestamptz,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  fulfillment_started_at timestamptz,
  delivery_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_account_idx ON orders(game_account_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS reviews_account_idx ON reviews(game_account_id);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_order_id_fkey'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_order_unique_idx
  ON reviews(order_id) WHERE order_id IS NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_checked_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'temanqris';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_started_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE orders
  SET expires_at=created_at + interval '30 minutes'
  WHERE expires_at IS NULL AND status IN ('pending','awaiting_confirmation');
CREATE INDEX IF NOT EXISTS orders_pending_expiry_idx
  ON orders(expires_at) WHERE status='pending';

CREATE TABLE IF NOT EXISTS email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  token_hash text UNIQUE,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_verifications_email_idx
  ON email_verifications(email, created_at DESC);
CREATE INDEX IF NOT EXISTS email_verifications_expires_idx
  ON email_verifications(expires_at);

CREATE TABLE IF NOT EXISTS inbound_email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid NOT NULL REFERENCES customer_mailboxes(id) ON DELETE CASCADE,
  resend_email_id text UNIQUE NOT NULL,
  webhook_id text UNIQUE NOT NULL,
  sender_encrypted text NOT NULL,
  subject_encrypted text NOT NULL,
  body_encrypted text NOT NULL,
  received_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inbound_email_messages_mailbox_idx
  ON inbound_email_messages(mailbox_id, received_at DESC);
CREATE INDEX IF NOT EXISTS inbound_email_messages_expiry_idx
  ON inbound_email_messages(expires_at);

CREATE TABLE IF NOT EXISTS processed_email_webhooks (
  webhook_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payment_provider text NOT NULL DEFAULT 'temanqris',
  temanqris_api_key text,
  temanqris_webhook_secret text,
  pakasir_project_slug text,
  pakasir_api_key text,
  resend_api_key text,
  email_from text,
  smtp_host text,
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_secure boolean NOT NULL DEFAULT false,
  smtp_user text,
  smtp_password text,
  smtp_from text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'temanqris';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS pakasir_project_slug text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS pakasir_api_key text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS resend_api_key text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS email_from text;
