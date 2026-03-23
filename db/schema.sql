-- ============================================================
-- SAAS CRM — Schema PostgreSQL (multi-tenant)
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANIES (uma linha por empresa cliente do SaaS)
-- ============================================================
CREATE TABLE companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  domain        VARCHAR(100) UNIQUE NOT NULL,  -- ex: "empresa-abc"
  logo_url      TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1',  -- hex
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (admin ou funcionário, sempre vinculado a uma empresa)
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  email         VARCHAR(200) NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'employee')),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, company_id)
);

-- ============================================================
-- PERMISSIONS (controle granular opcional por usuário)
-- ============================================================
CREATE TABLE permissions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_view_reports    BOOLEAN DEFAULT false,
  can_edit_stock      BOOLEAN DEFAULT false,
  can_manage_users    BOOLEAN DEFAULT false,
  UNIQUE(user_id)
);

-- ============================================================
-- CUSTOMERS (clientes finais de cada empresa)
-- ============================================================
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200),
  phone       VARCHAR(30),
  email       VARCHAR(200),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone, company_id)
);

-- ============================================================
-- CONVERSATIONS (cada atendimento = uma conversa)
-- ============================================================
CREATE TABLE conversations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES customers(id),
  company_id   UUID NOT NULL REFERENCES companies(id),
  assigned_to  UUID REFERENCES users(id),        -- vendedor responsável
  channel      VARCHAR(20) DEFAULT 'whatsapp'    -- whatsapp, instagram, web
               CHECK (channel IN ('whatsapp', 'instagram', 'web')),
  status       VARCHAR(20) DEFAULT 'open'
               CHECK (status IN ('open', 'closed', 'pending')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MESSAGES (cada mensagem dentro de uma conversa)
-- ============================================================
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender          VARCHAR(20) NOT NULL CHECK (sender IN ('client', 'user', 'bot')),
  content         TEXT NOT NULL,
  read            BOOLEAN DEFAULT false,
  timestamp       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEADS (funil de vendas)
-- ============================================================
CREATE TABLE leads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES customers(id),
  company_id   UUID NOT NULL REFERENCES companies(id),
  assigned_to  UUID REFERENCES users(id),
  stage        VARCHAR(30) DEFAULT 'novo'
               CHECK (stage IN ('novo', 'contato', 'proposta', 'fechado', 'perdido')),
  value        NUMERIC(12,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS (catálogo de produtos de cada empresa)
-- ============================================================
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  price       NUMERIC(12,2) NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS + ORDER_ITEMS (pedidos)
-- ============================================================
CREATE TABLE orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID NOT NULL REFERENCES customers(id),
  company_id   UUID NOT NULL REFERENCES companies(id),
  total        NUMERIC(12,2) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  unit_price  NUMERIC(12,2) NOT NULL
);

-- ============================================================
-- SETTINGS (configurações por empresa)
-- ============================================================
CREATE TABLE settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  whatsapp_number       VARCHAR(30),
  whatsapp_token        TEXT,
  instagram_connected   BOOLEAN DEFAULT false,
  instagram_token       TEXT,
  auto_reply_enabled    BOOLEAN DEFAULT false,
  auto_reply_message    TEXT,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES (performance em queries multi-tenant)
-- ============================================================
CREATE INDEX idx_users_company          ON users(company_id);
CREATE INDEX idx_customers_company      ON customers(company_id);
CREATE INDEX idx_conversations_company  ON conversations(company_id);
CREATE INDEX idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX idx_messages_conversation  ON messages(conversation_id);
CREATE INDEX idx_leads_company          ON leads(company_id);
CREATE INDEX idx_leads_stage            ON leads(stage);
CREATE INDEX idx_products_company       ON products(company_id);
CREATE INDEX idx_orders_company         ON orders(company_id);

-- ============================================================
-- TRIGGER: atualiza updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language plpgsql;

CREATE TRIGGER trg_conversations_updated
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leads_updated
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
