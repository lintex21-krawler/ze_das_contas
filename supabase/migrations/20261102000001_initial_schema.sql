-- Migration: 20261102000001_initial_schema.sql
-- Zé das Contas - Esquema Completo PostgreSQL
-- Moeda: centavos inteiros (bigint). Sem float.
-- Identificadores: UUID v4.

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE PERFIS DE USUÁRIO (Vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para atualizar profiles.updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para criar perfil automaticamente no cadastro Supabase
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

-- 3. FAMÍLIAS & MEMBROS
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'BRL',
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- 4. CONTAS BANCÁRIAS E CARTEIRAS
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

CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. CARTÕES DE CRÉDITO
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

CREATE TRIGGER trg_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. CATEGORIAS
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

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. TRANSAÇÕES PRINCIPAIS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'adjustment')),
    description TEXT NOT NULL,
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    transaction_date DATE NOT NULL,
    competence_month DATE NULL, -- Sempre primeiro dia do mês ('YYYY-MM-01')
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

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Histórico imutável de eventos da transação
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

-- 8. PLANOS DE PARCELAMENTO, FATURAS E PARCELAS
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

-- 9. CAIXA, MOVIMENTAÇÕES E TRANSFERÊNCIAS
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

CREATE TRIGGER trg_transfers_updated_at
    BEFORE UPDATE ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. RECORRÊNCIAS, ORÇAMENTOS E COMPRAS
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
    category_id UUID NULL REFERENCES public.categories(id) ON DELETE CASCADE, -- NULL = Orçamento Geral
    reference_month DATE NOT NULL, -- Primeiro dia do mês ('YYYY-MM-01')
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

-- 11. ÍNDICES DE PERFORMANCE E PESQUISA
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
