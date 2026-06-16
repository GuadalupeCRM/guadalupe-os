-- ============================================================
-- GUADALUPE OS — Schema Supabase Completo
-- Execute SEÇÃO POR SEÇÃO no SQL Editor do Supabase
-- ============================================================

-- SEÇÃO 1: Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- SEÇÃO 2: Enums
CREATE TYPE user_role AS ENUM ('admin','comercial','marketing','eventos','financeiro','vendedor');
CREATE TYPE canal_type AS ENUM ('evento','on_trade','distribuidor','dtc_site','dtc_ml','dtc_amazon');
CREATE TYPE sku_type AS ENUM ('mango_sour','margarita_lime','paloma_grapefruit');
CREATE TYPE crm_stage AS ENUM ('lead_novo','contato_feito','qualificado','proposta_enviada','negociacao','primeiro_pedido','ativo','em_risco','inativo','perdido');
CREATE TYPE event_stage AS ENUM ('prospeccao','qualificado','proposta_enviada','negociacao','fechado','pre_producao','em_execucao','finalizado','cancelado');
CREATE TYPE affiliate_status AS ENUM ('mapeada','qualificada','contatada','produto_enviado','publicou','parceira','inativa');
CREATE TYPE lead_origin AS ENUM ('instagram_dm','instagram_comentario','whatsapp','indicacao','evento','pap','site','ml','amazon','manual','outro');
CREATE TYPE insight_type AS ENUM ('alerta','sugestao','critico','informativo');

-- SEÇÃO 3: Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'vendedor',
  avatar_url TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'vendedor');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- SEÇÃO 4: Cash Flow
CREATE TABLE cash_flow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  inflows DECIMAL(12,2) NOT NULL DEFAULT 0,
  outflows DECIMAL(12,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(12,2) GENERATED ALWAYS AS (opening_balance + inflows - outflows) STORED,
  notes TEXT,
  input_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 5: Channel Revenue
CREATE TABLE channel_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  canal canal_type NOT NULL,
  revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  units_sold INTEGER NOT NULL DEFAULT 0,
  cmv_total DECIMAL(12,2) GENERATED ALWAYS AS (units_sold * 3.95) STORED,
  gross_margin DECIMAL(12,2) GENERATED ALWAYS AS (revenue - (units_sold * 3.95)) STORED,
  freight_cost DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  materials_cost DECIMAL(12,2) DEFAULT 0,
  other_costs DECIMAL(12,2) DEFAULT 0,
  net_margin DECIMAL(12,2) GENERATED ALWAYS AS (revenue - (units_sold * 3.95) - freight_cost - labor_cost - materials_cost - other_costs) STORED,
  bling_nf_ids TEXT[],
  input_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_start, canal)
);

-- SEÇÃO 6: Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  cnpj TEXT,
  origin lead_origin NOT NULL DEFAULT 'manual',
  canal canal_type,
  stage crm_stage NOT NULL DEFAULT 'lead_novo',
  assigned_to UUID REFERENCES profiles(id),
  estimated_monthly_units INTEGER,
  estimated_monthly_revenue DECIMAL(10,2),
  address TEXT,
  neighborhood TEXT,
  city TEXT DEFAULT 'São Paulo',
  notes TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  last_order_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  tags TEXT[],
  whatsapp_thread_id TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 7: Lead Activities
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  outcome TEXT,
  next_action TEXT,
  next_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 8: PDVs
CREATE TABLE pdvs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id),
  business_name TEXT NOT NULL,
  owner_name TEXT,
  phone TEXT,
  address TEXT NOT NULL,
  neighborhood TEXT,
  city TEXT DEFAULT 'São Paulo',
  cnpj TEXT,
  canal canal_type NOT NULL DEFAULT 'on_trade',
  account_manager UUID REFERENCES profiles(id),
  monthly_avg_units INTEGER DEFAULT 0,
  last_order_date DATE,
  status TEXT DEFAULT 'ativo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 9: PDV Orders
CREATE TABLE pdv_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdv_id UUID REFERENCES pdvs(id) ON DELETE CASCADE NOT NULL,
  order_date DATE NOT NULL,
  sku sku_type NOT NULL,
  units INTEGER NOT NULL,
  unit_price DECIMAL(8,2) NOT NULL,
  total_value DECIMAL(10,2) GENERATED ALWAYS AS (units * unit_price) STORED,
  bling_nf_id TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 10: Events Pipeline
CREATE TABLE events_pipeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  venue TEXT,
  address TEXT,
  city TEXT DEFAULT 'São Paulo',
  contact_name TEXT,
  contact_phone TEXT,
  event_date DATE,
  event_type TEXT,
  stage event_stage NOT NULL DEFAULT 'prospeccao',
  assigned_to UUID REFERENCES profiles(id),
  estimated_attendees INTEGER,
  estimated_units_sold INTEGER,
  estimated_revenue DECIMAL(10,2),
  actual_units_sold INTEGER,
  actual_revenue DECIMAL(10,2),
  cost_labor DECIMAL(10,2) DEFAULT 0,
  cost_materials DECIMAL(10,2) DEFAULT 0,
  cost_freight DECIMAL(10,2) DEFAULT 0,
  cost_rent DECIMAL(10,2) DEFAULT 0,
  cost_other DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (cost_labor + cost_materials + cost_freight + cost_rent + cost_other) STORED,
  net_margin DECIMAL(10,2),
  ugc_count INTEGER DEFAULT 0,
  instagram_tags INTEGER DEFAULT 0,
  videos_count INTEGER DEFAULT 0,
  notes TEXT,
  checklist JSONB DEFAULT '[]',
  bling_nf_ids TEXT[],
  canal_tag canal_type DEFAULT 'evento',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 11: Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  sku sku_type NOT NULL,
  opening_stock INTEGER NOT NULL DEFAULT 0,
  units_in INTEGER NOT NULL DEFAULT 0,
  units_out INTEGER NOT NULL DEFAULT 0,
  closing_stock INTEGER GENERATED ALWAYS AS (opening_stock + units_in - units_out) STORED,
  reorder_point INTEGER NOT NULL DEFAULT 200,
  cost_per_unit DECIMAL(8,4) NOT NULL DEFAULT 3.95,
  bling_nf_in TEXT[],
  notes TEXT,
  input_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, sku)
);

-- SEÇÃO 12: CMV History
CREATE TABLE cmv_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL,
  sku sku_type NOT NULL,
  cmv_per_unit DECIMAL(8,4) NOT NULL,
  reason TEXT,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, sku)
);

-- SEÇÃO 13: Marketing KPIs
CREATE TABLE marketing_kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL UNIQUE,
  instagram_followers INTEGER,
  instagram_reach INTEGER,
  instagram_impressions INTEGER,
  instagram_engagement_rate DECIMAL(5,2),
  instagram_posts_count INTEGER,
  instagram_reels_count INTEGER,
  instagram_stories_count INTEGER,
  google_sessions INTEGER,
  google_organic_clicks INTEGER,
  google_avg_position DECIMAL(5,2),
  email_subscribers INTEGER,
  email_open_rate DECIMAL(5,2),
  email_click_rate DECIMAL(5,2),
  b2c_conversions INTEGER,
  b2c_revenue DECIMAL(10,2),
  ugc_pieces INTEGER,
  influencer_reach INTEGER,
  notes TEXT,
  input_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 14: Marketing Goals
CREATE TABLE marketing_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL,
  metric_key TEXT NOT NULL,
  target_value DECIMAL(12,2) NOT NULL,
  actual_value DECIMAL(12,2),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, metric_key)
);

-- SEÇÃO 15: Affiliates
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  instagram_handle TEXT,
  instagram_followers INTEGER,
  engagement_rate DECIMAL(5,2),
  niche TEXT[],
  city TEXT,
  status affiliate_status NOT NULL DEFAULT 'mapeada',
  assigned_to UUID REFERENCES profiles(id),
  product_sent_at TIMESTAMPTZ,
  product_sku sku_type,
  coupon_code TEXT UNIQUE,
  coupon_discount_pct DECIMAL(5,2) DEFAULT 10,
  total_sales_generated DECIMAL(10,2) DEFAULT 0,
  total_units_generated INTEGER DEFAULT 0,
  total_uses INTEGER DEFAULT 0,
  cost_product_sent DECIMAL(8,2) DEFAULT 0,
  roi DECIMAL(8,2),
  contact_phone TEXT,
  email TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 16: Ad Campaigns
CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL DEFAULT 'meta',
  external_campaign_id TEXT,
  name TEXT NOT NULL,
  canal canal_type,
  budget_tier TEXT NOT NULL DEFAULT 'core',
  monthly_budget DECIMAL(10,2),
  spent_to_date DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  cac DECIMAL(10,2),
  roas DECIMAL(8,2),
  conversions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo',
  start_date DATE,
  end_date DATE,
  agent_last_review TIMESTAMPTZ,
  agent_suggestion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 17: Bling NFs Cache
CREATE TABLE bling_nfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bling_id TEXT UNIQUE NOT NULL,
  nf_number TEXT,
  client_cnpj TEXT,
  client_name TEXT,
  total_value DECIMAL(12,2),
  canal canal_type,
  canal_confidence DECIMAL(5,2),
  status TEXT,
  issued_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- SEÇÃO 18: Agent Insights
CREATE TABLE agent_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_name TEXT NOT NULL,
  insight_type insight_type NOT NULL DEFAULT 'informativo',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_label TEXT,
  action_url TEXT,
  metadata JSONB,
  read_by UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEÇÃO 19: App Settings
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (key, value, description) VALUES
  ('breakeven_target', '24000', 'Meta de breakeven mensal em R$'),
  ('fixed_costs', '12000', 'Custos fixos mensais em R$'),
  ('cash_minimum', '8000', 'Saldo mínimo de caixa em R$'),
  ('pap_conversion_rate', '0.18', 'Taxa de conversão PAP de referência'),
  ('freight_avg_on_trade', '2.50', 'Frete médio por lata on-trade em R$'),
  ('freight_avg_evento', '3.20', 'Frete médio por lata evento em R$'),
  ('ads_budget_total', '5000', 'Budget mensal total de ads em R$');

-- SEÇÃO 20: RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdv_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmv_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bling_nfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self"  ON profiles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "profiles_admin" ON profiles FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "cash_write"     ON cash_flow FOR ALL    USING (get_user_role() IN ('admin','financeiro'));
CREATE POLICY "cash_read"      ON cash_flow FOR SELECT USING (get_user_role() IN ('admin','financeiro','comercial'));
CREATE POLICY "leads_vendedor" ON leads FOR ALL USING (get_user_role() = 'vendedor' AND assigned_to = (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "leads_team"     ON leads FOR ALL USING (get_user_role() IN ('admin','comercial','marketing','eventos','financeiro'));
CREATE POLICY "events_write"   ON events_pipeline FOR ALL    USING (get_user_role() IN ('admin','eventos'));
CREATE POLICY "events_read"    ON events_pipeline FOR SELECT USING (get_user_role() IN ('admin','eventos','comercial','financeiro','marketing'));
CREATE POLICY "marketing_write" ON marketing_kpis FOR ALL    USING (get_user_role() IN ('admin','marketing'));
CREATE POLICY "marketing_read"  ON marketing_kpis FOR SELECT USING (get_user_role() IN ('admin','marketing','financeiro'));
CREATE POLICY "affiliates_write" ON affiliates FOR ALL    USING (get_user_role() IN ('admin','marketing'));
CREATE POLICY "affiliates_read"  ON affiliates FOR SELECT USING (get_user_role() IN ('admin','marketing','financeiro'));
CREATE POLICY "ads_write" ON ad_campaigns FOR ALL    USING (get_user_role() IN ('admin','marketing'));
CREATE POLICY "ads_read"  ON ad_campaigns FOR SELECT USING (get_user_role() IN ('admin','marketing','financeiro'));
CREATE POLICY "inv_write" ON inventory FOR ALL    USING (get_user_role() IN ('admin','financeiro'));
CREATE POLICY "inv_read"  ON inventory FOR SELECT USING (get_user_role() IN ('admin','financeiro','comercial','eventos'));
CREATE POLICY "cmv_write" ON cmv_history FOR ALL    USING (get_user_role() IN ('admin','financeiro'));
CREATE POLICY "cmv_read"  ON cmv_history FOR SELECT USING (true);
CREATE POLICY "insights_read" ON agent_insights FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_write" ON app_settings FOR ALL    USING (get_user_role() = 'admin');
CREATE POLICY "settings_read"  ON app_settings FOR SELECT USING (get_user_role() IN ('admin','financeiro'));
CREATE POLICY "bling_service" ON bling_nfs FOR ALL USING (true);
CREATE POLICY "pdvs_team" ON pdvs FOR ALL USING (get_user_role() IN ('admin','comercial','financeiro'));
CREATE POLICY "pdv_orders_team" ON pdv_orders FOR ALL USING (get_user_role() IN ('admin','comercial','financeiro'));
CREATE POLICY "lead_activities_team" ON lead_activities FOR ALL USING (get_user_role() IN ('admin','comercial','marketing','eventos','financeiro'));
CREATE POLICY "channel_write" ON channel_revenue FOR ALL USING (get_user_role() IN ('admin','financeiro'));
CREATE POLICY "channel_read"  ON channel_revenue FOR SELECT USING (get_user_role() IN ('admin','financeiro','comercial','marketing'));

-- SEÇÃO 21: Índices de performance
CREATE INDEX idx_leads_stage        ON leads(stage);
CREATE INDEX idx_leads_assigned     ON leads(assigned_to);
CREATE INDEX idx_leads_canal        ON leads(canal);
CREATE INDEX idx_leads_activity     ON leads(last_activity_at DESC);
CREATE INDEX idx_lead_acts_lead     ON lead_activities(lead_id);
CREATE INDEX idx_events_stage       ON events_pipeline(stage);
CREATE INDEX idx_events_date        ON events_pipeline(event_date DESC);
CREATE INDEX idx_ch_revenue_week    ON channel_revenue(week_start DESC);
CREATE INDEX idx_cash_date          ON cash_flow(date DESC);
CREATE INDEX idx_bling_issued       ON bling_nfs(issued_at DESC);
CREATE INDEX idx_insights_created   ON agent_insights(created_at DESC);
CREATE INDEX idx_pdv_orders_pdv     ON pdv_orders(pdv_id);
CREATE INDEX idx_affiliates_status  ON affiliates(status);
