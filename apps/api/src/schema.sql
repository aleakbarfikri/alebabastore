CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
  delivery_credentials text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
  paid_at timestamptz,
  fulfilled_at timestamptz,
  delivery_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_account_idx ON orders(game_account_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS reviews_account_idx ON reviews(game_account_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_checked_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'temanqris';

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
