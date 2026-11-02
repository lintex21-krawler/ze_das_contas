-- Migration: 20261102000003_atomic_rpcs.sql
-- Procedimentos Armazenados Atômicos (RPCs)
-- Todas as operações financeiras compostas são executadas em uma única transação no servidor.

-- 1. SEED DE CATEGORIAS PADRÃO
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

-- 2. CRIAÇÃO DE FAMÍLIA COM ADMIN E CONTA INICIAL
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

    -- Garante que o perfil do usuário existe
    INSERT INTO public.profiles (id, display_name)
    VALUES (v_user_id, 'Usuário')
    ON CONFLICT (id) DO NOTHING;

    -- Cria a família
    INSERT INTO public.families (name, created_by)
    VALUES (p_family_name, v_user_id)
    RETURNING id INTO v_family_id;

    -- Associa o usuário como Administrador
    INSERT INTO public.family_members (family_id, user_id, role, status)
    VALUES (v_family_id, v_user_id, 'admin', 'active');

    -- Cria categorias padrão
    PERFORM public.seed_default_categories(v_family_id);

    -- Cria a conta inicial se solicitada
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

-- 3. TRANSFERÊNCIA ATÔMICA ENTRE CONTAS
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

    -- Proteção contra repetição (Idempotência)
    SELECT id INTO v_transfer_id
    FROM public.transfers
    WHERE operation_id = p_operation_id;

    IF v_transfer_id IS NOT NULL THEN
        RETURN jsonb_build_object('transfer_id', v_transfer_id, 'status', 'already_processed');
    END IF;

    -- 1. Cria o registro da transferência
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

    -- 2. Cria perna de saída (transfer_out)
    INSERT INTO public.account_movements (
        family_id, account_id, movement_type, amount_cents,
        effective_date, source_entity, source_id, operation_id
    )
    VALUES (
        p_family_id, p_origin_account_id, 'transfer_out', p_amount_cents,
        p_transfer_date, 'transfers', v_transfer_id, p_operation_id
    );

    -- 3. Cria perna de entrada (transfer_in)
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

-- 4. PAGAMENTO DE FATURA DE CARTÃO DE CRÉDITO
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

    -- Idempotência
    SELECT id INTO v_payment_id
    FROM public.invoice_payments
    WHERE operation_id = p_operation_id;

    IF v_payment_id IS NOT NULL THEN
        RETURN jsonb_build_object('payment_id', v_payment_id, 'status', 'already_processed');
    END IF;

    -- Busca fatura
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id AND family_id = p_family_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fatura não encontrada.';
    END IF;

    -- 1. Insere pagamento da fatura
    INSERT INTO public.invoice_payments (
        family_id, invoice_id, account_id, amount_cents, paid_at, created_by, operation_id
    )
    VALUES (
        p_family_id, p_invoice_id, p_account_id, p_amount_cents, p_paid_at, v_user_id, p_operation_id
    )
    RETURNING id INTO v_payment_id;

    -- 2. Registra saída de caixa na conta bancária (invoice_payment)
    -- Atenção: não cria despesa de consumo nova!
    INSERT INTO public.account_movements (
        family_id, account_id, movement_type, amount_cents,
        effective_date, source_entity, source_id, operation_id
    )
    VALUES (
        p_family_id, p_account_id, 'invoice_payment', p_amount_cents,
        p_paid_at::date, 'invoice_payments', v_payment_id, p_operation_id
    );

    -- 3. Atualiza fatura
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
