-- Migration: 20261102000002_rls_policies.sql
-- Políticas de Segurança em Nível de Linha (RLS)
-- Isolamento estrito por família (Multi-tenant)

-- 1. FUNÇÕES AUXILIARES DE AUTORIZAÇÃO (SECURITY DEFINER)
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

-- 2. HABILITAÇÃO DE RLS EM TODAS AS TABELAS
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

-- 3. POLÍTICAS: PROFILES
CREATE POLICY "Usuários podem visualizar perfis"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY "Usuários podem atualizar apenas seu próprio perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 4. POLÍTICAS: FAMILIES
CREATE POLICY "Membros podem ver suas famílias"
    ON public.families FOR SELECT
    TO authenticated
    USING (public.is_family_member(id) OR created_by = auth.uid());

CREATE POLICY "Usuários autenticados podem criar família"
    ON public.families FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Apenas admins podem atualizar dados da família"
    ON public.families FOR UPDATE
    TO authenticated
    USING (public.is_family_admin(id))
    WITH CHECK (public.is_family_admin(id));

-- 5. POLÍTICAS: FAMILY_MEMBERS
CREATE POLICY "Membros podem ver outros membros da mesma família"
    ON public.family_members FOR SELECT
    TO authenticated
    USING (public.is_family_member(family_id) OR user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar membros da família"
    ON public.family_members FOR ALL
    TO authenticated
    USING (public.is_family_admin(family_id) OR user_id = auth.uid());

-- 6. POLÍTICAS: FAMILY_INVITATIONS
CREATE POLICY "Membros podem ver convites da família"
    ON public.family_invitations FOR SELECT
    TO authenticated
    USING (public.is_family_member(family_id) OR email = auth.jwt()->>'email');

CREATE POLICY "Admins podem criar convites"
    ON public.family_invitations FOR INSERT
    TO authenticated
    WITH CHECK (public.is_family_admin(family_id));

CREATE POLICY "Admins podem atualizar status de convites"
    ON public.family_invitations FOR UPDATE
    TO authenticated
    USING (public.is_family_admin(family_id) OR email = auth.jwt()->>'email');

-- 7. POLÍTICA PADRÃO PARA TABELAS CENTRAIS DA FAMÍLIA
-- SELECT: Membro ativo da família
-- INSERT: Membro ativo da família e associando family_id correto
-- UPDATE: Membro ativo da família
-- DELETE: Não permitido diretamente (usa soft-delete via UPDATE de deleted_at)

-- Macro de políticas para cada tabela familiar:
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
