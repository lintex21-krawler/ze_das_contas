-- ZÉ DAS CONTAS - CONSOLIDATED MIGRATIONS SCRIPT
-- Execute este arquivo no Supabase SQL Editor para criar todas as tabelas, RLS e RPCs atômicas.

-- ==============================================================================
-- PARTE 1: SCHEMA E TABELAS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Perfis
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Famílias
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'BRL',
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_families_updated_at ON public.families;
CREATE TRIGGER trg_families_updated_at
    BEFORE UPDATE ON public.families
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_family_member UNIQUE (family_id, user_id)
);

DROP TRIGGER IF EXISTS trg_family_members_updated_at ON public.family_members;
CREATE TRIGGER trg_family_members_updated_at
    BEFORE UPDATE ON public.family_members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.family_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.profiles(id),
    accepted_by UUID NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contas
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'wallet', 'investment', 'other')),
    institution TEXT NULL,
    initial_balance_cents BIGINT NOT NULL DEFAULT 0,
    balance_as_of DATE NOT NULL DEFAULT CURRENT_DATE,
    color TEXT NULL,
    icon TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

DROP TRIGGER IF EXISTS trg_accounts_updated_at ON public.accounts;
CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Cartões
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    account_id UUID NULL REFERENCES public.accounts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    institution TEXT NULL,
    credit_limit_cents BIGINT NOT NULL CHECK (credit_limit_cents >= 0),
    closing_day SMALLINT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    closing_day_policy TEXT NOT NULL DEFAULT 'include_closing_day' CHECK (closing_day_policy IN ('include_closing_day', 'exclude_closing_day')),
    color TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

DROP TRIGGER IF EXISTS trg_cards_updated_at ON public.cards;
CREATE TRIGGER trg_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'both')),
    essentiality TEXT NULL CHECK (essentiality IN ('essential', 'non_essential', 'unset')),
    color TEXT NULL,
    icon TEXT NULL,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Transações
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'adjustment')),
    description TEXT NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    transaction_date DATE NOT NULL,
    competence_month DATE NULL,
    cash_date DATE NULL,
    category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    payment_method TEXT NULL CHECK (payment_method IN ('cash', 'pix', 'debit', 'credit', 'other')),
    account_id UUID NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    card_id UUID NULL REFERENCES public.cards(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('planned', 'pending', 'settled', 'cancelled')),
    notes TEXT NULL,
    shopping_list_id UUID NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    updated_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    version INTEGER NOT NULL DEFAULT 1,
    source TEXT NOT NULL DEFAULT 'manual'
);

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.transaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    before_data JSONB NULL,
    after_data JSONB NULL,
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parcelas e Faturas
CREATE TABLE IF NOT EXISTS public.installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    original_transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
    total_amount_cents BIGINT NOT NULL CHECK (total_amount_cents > 0),
    installment_count INTEGER NOT NULL CHECK (installment_count > 0),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_installment_plans_updated_at ON public.installment_plans;
CREATE TRIGGER trg_installment_plans_updated_at
    BEFORE UPDATE ON public.installment_plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    cycle_start DATE NOT NULL,
    closing_date DATE NOT NULL,
    due_date DATE NOT NULL,
    reference_month DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    paid_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_card_cycle_start UNIQUE (card_id, cycle_start)
);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.installment_plans(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    installment_number INTEGER NOT NULL CHECK (installment_number > 0),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    due_date DATE NOT NULL,
    competence_month DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planned', 'pending', 'settled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_plan_installment UNIQUE (plan_id, installment_number)
);

DROP TRIGGER IF EXISTS trg_installments_updated_at ON public.installments;
CREATE TRIGGER trg_installments_updated_at
    BEFORE UPDATE ON public.installments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    paid_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    operation_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Caixa e Transferências
CREATE TABLE IF NOT EXISTS public.account_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('income', 'expense', 'transfer_in', 'transfer_out', 'invoice_payment', 'adjustment')),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    effective_date DATE NOT NULL,
    source_entity TEXT NOT NULL,
    source_id UUID NOT NULL,
    operation_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_operation_account_movement UNIQUE (operation_id, account_id, movement_type)
);

CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    origin_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    destination_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    transfer_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planned', 'settled', 'cancelled')),
    description TEXT NULL,
    operation_id UUID NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_different_accounts CHECK (origin_account_id <> destination_account_id)
);

DROP TRIGGER IF EXISTS trg_transfers_updated_at ON public.transfers;
CREATE TRIGGER trg_transfers_updated_at
    BEFORE UPDATE ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Recorrências, Orçamentos, Metas e Compras
CREATE TABLE IF NOT EXISTS public.recurring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer')),
    description TEXT NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    interval_value INTEGER NOT NULL DEFAULT 1 CHECK (interval_value > 0),
    start_date DATE NOT NULL,
    end_date DATE NULL,
    preferred_day SMALLINT NULL CHECK (preferred_day BETWEEN 1 AND 31),
    category_id UUID NULL REFERENCES public.categories(id) ON DELETE SET NULL,
    account_id UUID NULL REFERENCES public.accounts(id) ON DELETE SET NULL,
    card_id UUID NULL REFERENCES public.cards(id) ON DELETE SET NULL,
    payment_method TEXT NULL CHECK (payment_method IN ('cash', 'pix', 'debit', 'credit', 'other')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recurring_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.recurring_rules(id) ON DELETE CASCADE,
    reference_date DATE NOT NULL,
    generated_transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('generated', 'skipped', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rule_reference_date UNIQUE (rule_id, reference_date)
);

CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    category_id UUID NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    reference_month DATE NOT NULL,
    limit_cents BIGINT NOT NULL CHECK (limit_cents > 0),
    perspective TEXT NOT NULL DEFAULT 'competence' CHECK (perspective IN ('competence', 'cash')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_budget_family_category_month_perspective UNIQUE (family_id, category_id, reference_month, perspective)
);

CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount_cents BIGINT NOT NULL CHECK (target_amount_cents > 0),
    current_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (current_amount_cents >= 0),
    target_date DATE NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'un',
    estimated_price_cents BIGINT NULL CHECK (estimated_price_cents >= 0),
    actual_price_cents BIGINT NULL CHECK (actual_price_cents >= 0),
    is_checked BOOLEAN NOT NULL DEFAULT FALSE,
    item_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shopping_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    list_id UUID NOT NULL UNIQUE REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
    final_amount_cents BIGINT NOT NULL CHECK (final_amount_cents > 0),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    entity_name TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_operations (
    operation_id UUID PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    entity_type TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    result_data JSONB NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_family_members_user ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_family ON public.accounts(family_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cards_family ON public.cards(family_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_family ON public.categories(family_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_family_date ON public.transactions(family_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_competence ON public.transactions(family_id, competence_month) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card ON public.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_invoices_card_status ON public.invoices(card_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_reference_month ON public.invoices(family_id, reference_month);
CREATE INDEX IF NOT EXISTS idx_installments_invoice ON public.installments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_account_date ON public.account_movements(account_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_family ON public.transfers(family_id);

-- ==============================================================================
-- PARTE 2: ROW LEVEL SECURITY (RLS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_family_member(target_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.family_members
        WHERE family_id = target_family_id
          AND user_id = auth.uid()
          AND status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_family_admin(target_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.family_members
        WHERE family_id = target_family_id
          AND user_id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
    );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;

-- Políticas de perfis
DROP POLICY IF EXISTS "Usuários podem visualizar perfis" ON public.profiles;
CREATE POLICY "Usuários podem visualizar perfis"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "Usuários podem atualizar apenas seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar apenas seu próprio perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Políticas de famílias
DROP POLICY IF EXISTS "Membros podem ver suas famílias" ON public.families;
CREATE POLICY "Membros podem ver suas famílias"
    ON public.families FOR SELECT
    TO authenticated
    USING (public.is_family_member(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Usuários autenticados podem criar família" ON public.families;
CREATE POLICY "Usuários autenticados podem criar família"
    ON public.families FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Apenas admins podem atualizar dados da família" ON public.families;
CREATE POLICY "Apenas admins podem atualizar dados da família"
    ON public.families FOR UPDATE
    TO authenticated
    USING (public.is_family_admin(id))
    WITH CHECK (public.is_family_admin(id));

-- Políticas de membros
DROP POLICY IF EXISTS "Membros podem ver outros membros da mesma família" ON public.family_members;
CREATE POLICY "Membros podem ver outros membros da mesma família"
    ON public.family_members FOR SELECT
    TO authenticated
    USING (public.is_family_member(family_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Admins podem gerenciar membros da família" ON public.family_members;
CREATE POLICY "Admins podem gerenciar membros da família"
    ON public.family_members FOR ALL
    TO authenticated
    USING (public.is_family_admin(family_id) OR user_id = auth.uid());

-- Políticas de convites
DROP POLICY IF EXISTS "Membros podem ver convites da família" ON public.family_invitations;
CREATE POLICY "Membros podem ver convites da família"
    ON public.family_invitations FOR SELECT
    TO authenticated
    USING (public.is_family_member(family_id) OR email = auth.jwt()->>'email');

DROP POLICY IF EXISTS "Admins podem criar convites" ON public.family_invitations;
CREATE POLICY "Admins podem criar convites"
    ON public.family_invitations FOR INSERT
    TO authenticated
    WITH CHECK (public.is_family_admin(family_id));

DROP POLICY IF EXISTS "Admins podem atualizar status de convites" ON public.family_invitations;
CREATE POLICY "Admins podem atualizar status de convites"
    ON public.family_invitations FOR UPDATE
    TO authenticated
    USING (public.is_family_admin(family_id) OR email = auth.jwt()->>'email');

-- Políticas em massa para entidades financeiras
DO $$
DECLARE
    tbl text;
    family_tables text[] := ARRAY[
        'accounts',
        'cards',
        'categories',
        'transactions',
        'transaction_events',
        'installment_plans',
        'invoices',
        'installments',
        'invoice_payments',
        'account_movements',
        'transfers',
        'recurring_rules',
        'recurring_occurrences',
        'budgets',
        'financial_goals',
        'shopping_lists',
        'shopping_items',
        'shopping_purchases',
        'audit_logs',
        'sync_operations'
    ];
BEGIN
    FOREACH tbl IN ARRAY family_tables
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "select_family_%1$s" ON public.%1$I;
            CREATE POLICY "select_family_%1$s" ON public.%1$I
                FOR SELECT TO authenticated
                USING (public.is_family_member(family_id));

            DROP POLICY IF EXISTS "insert_family_%1$s" ON public.%1$I;
            CREATE POLICY "insert_family_%1$s" ON public.%1$I
                FOR INSERT TO authenticated
                WITH CHECK (public.is_family_member(family_id));

            DROP POLICY IF EXISTS "update_family_%1$s" ON public.%1$I;
            CREATE POLICY "update_family_%1$s" ON public.%1$I
                FOR UPDATE TO authenticated
                USING (public.is_family_member(family_id))
                WITH CHECK (public.is_family_member(family_id));
        ', tbl);
    END LOOP;
END;
$$;

-- ==============================================================================
-- PARTE 3: RPCS ATÔMICAS E PROCEDIMENTOS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_categories(p_family_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.categories (family_id, name, transaction_type, essentiality, color, icon, is_system_default)
    VALUES
        (p_family_id, 'Mercado', 'expense', 'essential', '#25B77A', 'ShoppingCart', TRUE),
        (p_family_id, 'Alimentação & Restaurantes', 'expense', 'non_essential', '#E8A23A', 'Utensils', TRUE),
        (p_family_id, 'Moradia & Aluguel', 'expense', 'essential', '#4D8DDB', 'Home', TRUE),
        (p_family_id, 'Água, Luz & Gás', 'expense', 'essential', '#3B82F6', 'Zap', TRUE),
        (p_family_id, 'Internet & Telefone', 'expense', 'essential', '#8B5CF6', 'Wifi', TRUE),
        (p_family_id, 'Transporte & Combustível', 'expense', 'essential', '#F59E0B', 'Car', TRUE),
        (p_family_id, 'Saúde & Farmácia', 'expense', 'essential', '#EF4444', 'HeartPulse', TRUE),
        (p_family_id, 'Educação', 'expense', 'essential', '#10B981', 'GraduationCap', TRUE),
        (p_family_id, 'Lazer & Passeios', 'expense', 'non_essential', '#EC4899', 'Film', TRUE),
        (p_family_id, 'Assinaturas & Serviços', 'expense', 'non_essential', '#6366F1', 'Repeat', TRUE),
        (p_family_id, 'Compras Pessoais', 'expense', 'non_essential', '#8B7BEA', 'ShoppingBag', TRUE),
        (p_family_id, 'Pets', 'expense', 'non_essential', '#D97706', 'Dog', TRUE),
        (p_family_id, 'Salário & Renda Fixa', 'income', 'essential', '#25B77A', 'BadgeDollarSign', TRUE),
        (p_family_id, 'Renda Extra & Vendas', 'income', 'non_essential', '#10B981', 'TrendingUp', TRUE),
        (p_family_id, 'Reembolsos', 'income', 'essential', '#3B82F6', 'Receipt', TRUE),
        (p_family_id, 'Outros', 'both', 'unset', '#64748B', 'MoreHorizontal', TRUE)
    ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_family_with_admin(
    p_family_name TEXT,
    p_initial_account_name TEXT DEFAULT 'Conta Corrente Principal'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_family_id UUID;
    v_account_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    INSERT INTO public.profiles (id, display_name)
    VALUES (v_user_id, 'Usuário')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.families (name, created_by)
    VALUES (p_family_name, v_user_id)
    RETURNING id INTO v_family_id;

    INSERT INTO public.family_members (family_id, user_id, role, status)
    VALUES (v_family_id, v_user_id, 'admin', 'active');

    PERFORM public.seed_default_categories(v_family_id);

    IF p_initial_account_name IS NOT NULL AND length(trim(p_initial_account_name)) > 0 THEN
        INSERT INTO public.accounts (family_id, name, account_type, initial_balance_cents, created_by)
        VALUES (v_family_id, p_initial_account_name, 'checking', 0, v_user_id)
        RETURNING id INTO v_account_id;
    END IF;

    RETURN jsonb_build_object(
        'family_id', v_family_id,
        'family_name', p_family_name,
        'account_id', v_account_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_transfer(
    p_family_id UUID,
    p_origin_account_id UUID,
    p_destination_account_id UUID,
    p_amount_cents BIGINT,
    p_transfer_date DATE,
    p_description TEXT,
    p_operation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_transfer_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF NOT public.is_family_member(p_family_id) THEN
        RAISE EXCEPTION 'Permissão negada para esta família.';
    END IF;

    IF p_origin_account_id = p_destination_account_id THEN
        RAISE EXCEPTION 'A conta de origem deve ser diferente da conta de destino.';
    END IF;

    IF p_amount_cents <= 0 THEN
        RAISE EXCEPTION 'O valor da transferência deve ser positivo.';
    END IF;

    SELECT id INTO v_transfer_id
    FROM public.transfers
    WHERE operation_id = p_operation_id;

    IF v_transfer_id IS NOT NULL THEN
        RETURN jsonb_build_object('transfer_id', v_transfer_id, 'status', 'already_processed');
    END IF;

    INSERT INTO public.transfers (
        family_id, origin_account_id, destination_account_id,
        amount_cents, transfer_date, status, description,
        operation_id, created_by
    )
    VALUES (
        p_family_id, p_origin_account_id, p_destination_account_id,
        p_amount_cents, p_transfer_date, 'settled', p_description,
        p_operation_id, v_user_id
    )
    RETURNING id INTO v_transfer_id;

    INSERT INTO public.account_movements (
        family_id, account_id, movement_type, amount_cents,
        effective_date, source_entity, source_id, operation_id
    )
    VALUES (
        p_family_id, p_origin_account_id, 'transfer_out', p_amount_cents,
        p_transfer_date, 'transfers', v_transfer_id, p_operation_id
    );

    INSERT INTO public.account_movements (
        family_id, account_id, movement_type, amount_cents,
        effective_date, source_entity, source_id, operation_id
    )
    VALUES (
        p_family_id, p_destination_account_id, 'transfer_in', p_amount_cents,
        p_transfer_date, 'transfers', v_transfer_id, p_operation_id
    );

    RETURN jsonb_build_object('transfer_id', v_transfer_id, 'status', 'created');
END;
$$;

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
    p_family_id UUID,
    p_invoice_id UUID,
    p_account_id UUID,
    p_amount_cents BIGINT,
    p_paid_at TIMESTAMPTZ,
    p_operation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_payment_id UUID;
    v_invoice RECORD;
    v_new_paid_amount BIGINT;
    v_new_status TEXT;
BEGIN
    v_user_id := auth.uid();
    IF NOT public.is_family_member(p_family_id) THEN
        RAISE EXCEPTION 'Permissão negada para esta família.';
    END IF;

    IF p_amount_cents <= 0 THEN
        RAISE EXCEPTION 'O valor do pagamento de fatura deve ser positivo.';
    END IF;

    SELECT id INTO v_payment_id
    FROM public.invoice_payments
    WHERE operation_id = p_operation_id;

    IF v_payment_id IS NOT NULL THEN
        RETURN jsonb_build_object('payment_id', v_payment_id, 'status', 'already_processed');
    END IF;

    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id AND family_id = p_family_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fatura não encontrada.';
    END IF;

    INSERT INTO public.invoice_payments (
        family_id, invoice_id, account_id, amount_cents, paid_at, created_by, operation_id
    )
    VALUES (
        p_family_id, p_invoice_id, p_account_id, p_amount_cents, p_paid_at, v_user_id, p_operation_id
    )
    RETURNING id INTO v_payment_id;

    INSERT INTO public.account_movements (
        family_id, account_id, movement_type, amount_cents,
        effective_date, source_entity, source_id, operation_id
    )
    VALUES (
        p_family_id, p_account_id, 'invoice_payment', p_amount_cents,
        p_paid_at::date, 'invoice_payments', v_payment_id, p_operation_id
    );

    v_new_paid_amount := v_invoice.paid_amount_cents + p_amount_cents;
    v_new_status := 'partially_paid';

    UPDATE public.invoices
    SET paid_amount_cents = v_new_paid_amount,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_invoice_id;

    RETURN jsonb_build_object('payment_id', v_payment_id, 'status', 'success', 'paid_total', v_new_paid_amount);
END;
$$;
