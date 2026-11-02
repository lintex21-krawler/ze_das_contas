# ZÉ DAS CONTAS --- ESPECIFICAÇÃO TÉCNICA

**Versão:** 1.0\
**Objetivo:** contrato técnico para implementação por agente de IA\
**Stack:** React, TypeScript, Vite, PWA, Dexie/IndexedDB,
Supabase/PostgreSQL, Vercel e GitHub

------------------------------------------------------------------------

## 1. Regras de implementação para o agente

Este documento é normativo. Em caso de conflito, priorizar nesta
ordem: 1. segurança e integridade dos dados; 2. regras financeiras deste
documento; 3. especificação funcional; 4. especificação visual; 5.
decisões de implementação de conveniência.

O agente deve: - ler todos os três documentos antes de alterar o
projeto; - não inventar endpoints, tabelas ou campos divergentes; -
implementar migrations versionadas; - não remover ou renomear dados sem
migration explícita; - nunca colocar secrets no frontend; - não declarar
recurso concluído sem testes; - não usar mocks em fluxos de produção; -
manter documentação atualizada; - entregar alterações pequenas e
verificáveis; - pedir esclarecimento quando uma decisão de negócio não
estiver definida, em vez de inferir silenciosamente.

## 2. Stack e versões

Usar versões estáveis e compatíveis no momento da implementação, fixadas
no lockfile: - Node.js LTS; - React; - TypeScript em modo strict; -
Vite; - React Router; - Tailwind CSS; - shadcn/ui ou componentes
acessíveis equivalentes; - TanStack Query para estado remoto/cache; -
Zustand ou Context para estado global mínimo; - React Hook Form + Zod
para formulários; - Dexie para IndexedDB; - vite-plugin-pwa/Workbox; -
Supabase JS; - Recharts para gráficos; - date-fns com locale pt-BR; -
Vitest + Testing Library; - Playwright para E2E.

Não adicionar bibliotecas redundantes sem justificativa. Usar `npm` e
manter `package-lock.json`.

## 3. Arquitetura lógica

Separar em camadas:

### 3.1 Presentation

Componentes, páginas, navegação, acessibilidade e estados visuais. Não
conter regras financeiras.

### 3.2 Application

Casos de uso: criar despesa, receber receita, pagar fatura, transferir,
criar recorrência, sincronizar, fechar lista.

### 3.3 Domain

Entidades, tipos, validações e regras puras de dinheiro, competência,
fatura, parcela, recorrência e projeção. Não importar React, Supabase ou
Dexie.

### 3.4 Infrastructure

Implementações de repositórios local/remoto, autenticação,
sincronização, persistência e telemetria sem dados sensíveis.

### 3.5 Contracts

Schemas Zod, DTOs, tipos compartilhados, enums e versões de payload.

Dependências devem apontar para dentro: Presentation → Application →
Domain; Infrastructure implementa interfaces consumidas por Application.

## 4. Estrutura de pastas

``` text
src/
  app/
    App.tsx
    router/
    providers/
    guards/
  components/
    ui/
    layout/
    feedback/
    charts/
  modules/
    auth/
    family/
    accounts/
    cards/
    categories/
    transactions/
    installments/
    invoices/
    recurring/
    transfers/
    budgets/
    goals/
    dashboard/
    analytics/
    shopping/
    settings/
  domain/
    money/
    dates/
    entities/
    services/
    errors/
  application/
    use-cases/
    ports/
    dto/
  infrastructure/
    supabase/
      client.ts
      repositories/
      functions/
    local/
      db.ts
      schema.ts
      repositories/
    sync/
      sync-engine.ts
      outbox.ts
      conflict-resolver.ts
      reconciliation.ts
  shared/
    hooks/
    utils/
    constants/
    types/
  styles/
  tests/
supabase/
  migrations/
  functions/
  seed/
docs/
  SPEC_FUNCTIONAL.md
  SPEC_TECHNICAL.md
  SPEC_VISUAL.md
  ADR/
```

## 5. Convenções gerais

-   IDs: UUID v4 ou UUID gerado no cliente por `crypto.randomUUID()`.
-   Datas de evento: `timestamptz` UTC no servidor; apresentar no fuso
    da família.
-   Datas de vencimento/competência: `date` sem horário.
-   Dinheiro: inteiro em centavos (`bigint` no PostgreSQL; `number`
    inteiro validado no TypeScript). Nunca usar float para valores
    monetários.
-   Percentuais: decimal com precisão definida ou cálculo em domínio.
-   Campos de auditoria: `created_at`, `updated_at`, `created_by`,
    `updated_by`.
-   Exclusão: `deleted_at` nullable; não deletar financeiramente de
    forma física no fluxo normal.
-   Todas as tabelas familiares incluem `family_id`, salvo tabelas
    globais estritamente necessárias.
-   Toda operação mutável deve ser idempotente.
-   Toda API deve validar payload no servidor.
-   `pt-BR`, BRL e `America/Sao_Paulo` são padrões iniciais, mas moeda e
    fuso pertencem à família.

## 6. Modelo de dados PostgreSQL

O agente deve criar migrations SQL idempotentes e incrementais. Usar
`uuid`, `text`, `boolean`, `date`, `timestamptz`, `integer`, `bigint`,
`numeric` apenas quando apropriado. Não usar `real`/`double precision`
para dinheiro.

### 6.1 Tabelas centrais

#### profiles

-   `id uuid primary key references auth.users(id)`
-   `display_name text not null`
-   `avatar_url text null`
-   `created_at timestamptz not null default now()`
-   `updated_at timestamptz not null default now()`

#### families

-   `id uuid primary key default gen_random_uuid()`
-   `name text not null`
-   `currency_code text not null default 'BRL'`
-   `timezone text not null default 'America/Sao_Paulo'`
-   `created_by uuid not null references profiles(id)`
-   `created_at`, `updated_at`

#### family_members

-   `id uuid primary key`
-   `family_id uuid not null references families(id)`
-   `user_id uuid not null references profiles(id)`
-   `role text not null check (role in ('admin','member','viewer'))`
-   `status text not null check (status in ('active','invited','removed'))`
-   `created_at`, `updated_at`
-   unique (`family_id`,`user_id`)

#### family_invitations

-   `id uuid primary key`
-   `family_id uuid not null`
-   `email text not null`
-   `token_hash text not null unique`
-   `role text not null`
-   `status text not null`
-   `expires_at timestamptz not null`
-   `invited_by uuid not null`
-   `accepted_by uuid null`
-   `created_at timestamptz not null`

### 6.2 Contas e cartões

#### accounts

-   `id uuid primary key`
-   `family_id uuid not null`
-   `name text not null`
-   `account_type text not null`
-   `institution text null`
-   `initial_balance_cents bigint not null default 0`
-   `balance_as_of date not null`
-   `color text null`
-   `icon text null`
-   `is_active boolean not null default true`
-   `created_by uuid not null`
-   `created_at`, `updated_at`, `deleted_at`

#### cards

-   `id uuid primary key`
-   `family_id uuid not null`
-   `account_id uuid null references accounts(id)` --- conta de
    pagamento da fatura
-   `name text not null`
-   `institution text null`
-   `credit_limit_cents bigint not null`
-   `closing_day smallint not null check (closing_day between 1 and 31)`
-   `due_day smallint not null check (due_day between 1 and 31)`
-   `closing_day_policy text not null default 'include_closing_day'`
-   `color text null`
-   `is_active boolean not null default true`
-   `created_by uuid not null`
-   timestamps e `deleted_at`

### 6.3 Categorias e transações

#### categories

-   `id uuid primary key`
-   `family_id uuid not null`
-   `name text not null`
-   `parent_id uuid null references categories(id)`
-   `transaction_type text not null check (transaction_type in ('expense','income','both'))`
-   `essentiality text null check (essentiality in ('essential','non_essential','unset'))`
-   `color text null`
-   `icon text null`
-   `is_system_default boolean not null default false`
-   `is_active boolean not null default true`
-   timestamps e `deleted_at`

#### transactions

-   `id uuid primary key`
-   `family_id uuid not null`
-   `transaction_type text not null check (transaction_type in ('expense','income','adjustment'))`
-   `description text not null`
-   `amount_cents bigint not null check (amount_cents > 0)`
-   `transaction_date date not null`
-   `competence_month date null` --- sempre primeiro dia do mês, quando
    definido
-   `cash_date date null`
-   `category_id uuid null`
-   `payment_method text null check (payment_method in ('cash','pix','debit','credit','other'))`
-   `account_id uuid null`
-   `card_id uuid null`
-   `status text not null`
-   `notes text null`
-   `shopping_list_id uuid null`
-   `created_by uuid not null`
-   `updated_by uuid not null`
-   `created_at`, `updated_at`, `deleted_at`
-   `version integer not null default 1`
-   `source text not null default 'manual'`

Restrições de domínio: - crédito exige `card_id`; - dinheiro/PIX/débito
exigem conta aplicável; - receita recebida exige conta de destino; -
competência deve ser primeiro dia do mês; - status deve ser validado por
tipo e forma de pagamento.

#### transaction_events

Histórico imutável de eventos: - `id uuid primary key` -
`family_id uuid not null` - `transaction_id uuid not null` -
`event_type text not null` - `before_data jsonb null` -
`after_data jsonb null` - `actor_id uuid not null` -
`created_at timestamptz not null`

### 6.4 Parcelamentos e faturas

#### installment_plans

-   `id uuid primary key`
-   `family_id uuid not null`
-   `original_transaction_id uuid not null unique`
-   `total_amount_cents bigint not null`
-   `installment_count integer not null check (> 0)`
-   `card_id uuid not null`
-   `created_at`, `updated_at`

#### invoices

-   `id uuid primary key`
-   `family_id uuid not null`
-   `card_id uuid not null`
-   `cycle_start date not null`
-   `closing_date date not null`
-   `due_date date not null`
-   `reference_month date not null`
-   `status text not null`
-   `paid_amount_cents bigint not null default 0`
-   timestamps
-   unique (`card_id`,`cycle_start`)

#### installments

-   `id uuid primary key`
-   `family_id uuid not null`
-   `plan_id uuid not null`
-   `invoice_id uuid not null`
-   `installment_number integer not null`
-   `amount_cents bigint not null`
-   `due_date date not null`
-   `competence_month date not null`
-   `status text not null`
-   `created_at`, `updated_at`
-   unique (`plan_id`,`installment_number`)

#### invoice_payments

-   `id uuid primary key`
-   `family_id uuid not null`
-   `invoice_id uuid not null`
-   `account_id uuid not null`
-   `amount_cents bigint not null check (> 0)`
-   `paid_at timestamptz not null`
-   `created_by uuid not null`
-   `operation_id uuid not null unique`

Pagamento parcial é permitido. O valor pago acumulado não pode superar o
saldo da fatura sem um crédito/ajuste explícito.

### 6.5 Caixa e transferências

#### account_movements

-   `id uuid primary key`
-   `family_id uuid not null`
-   `account_id uuid not null`
-   `movement_type text not null` (income, expense, transfer_in,
    transfer_out, invoice_payment, adjustment)
-   `amount_cents bigint not null check (> 0)`
-   `effective_date date not null`
-   `source_entity text not null`
-   `source_id uuid not null`
-   `operation_id uuid not null`
-   `created_at timestamptz not null`
-   unique (`operation_id`,`account_id`,`movement_type`)

#### transfers

-   `id uuid primary key`
-   `family_id uuid not null`
-   `origin_account_id uuid not null`
-   `destination_account_id uuid not null`
-   `amount_cents bigint not null check (> 0)`
-   `transfer_date date not null`
-   `status text not null`
-   `description text null`
-   `operation_id uuid not null unique`
-   `created_by uuid not null`
-   timestamps
-   check origem diferente do destino

As duas movimentações de uma transferência devem ser gravadas na mesma
transação SQL.

### 6.6 Recorrências, orçamento e compras

Criar: - `recurring_rules`: tipo, valor, frequência, intervalo, data
inicial/final, dia, categoria, conta/cartão, ativo, autor. -
`recurring_occurrences`: regra, data de referência, entidade gerada,
status; unique (`rule_id`,`reference_date`). - `budgets`: família,
categoria nullable (null = orçamento geral), mês, limite em centavos,
perspectiva; unique por família/categoria/mês/perspectiva. -
`financial_goals`: nome, valor-alvo, valor acumulado, data-alvo,
status. - `shopping_lists`: família, nome, status, datas, autor. -
`shopping_items`: lista, nome, quantidade, unidade, preço estimado/real
em centavos, status, ordem. - `shopping_purchases`: lista, transação,
data de finalização, valor final. - `audit_logs`: família, usuário,
entidade, id, ação, timestamp, metadados sanitizados. -
`sync_operations`: tabela opcional para idempotência e diagnóstico;
nunca armazenar tokens ou segredos.

Índices em todas as FKs, `family_id`, datas de transação, `card_id`,
`invoice_id`, status e campos usados nos filtros.

## 7. Segurança Supabase / RLS

Habilitar RLS em todas as tabelas expostas ao cliente.

Criar função SQL `is_family_member(target_family_id uuid)` usando
`auth.uid()` e `family_members` com `security definer`, `search_path`
fixo e permissões mínimas. Criar função de papel administrativo quando
necessário.

Políticas: - SELECT: membro ativo da família. - INSERT: membro ativo,
`created_by = auth.uid()` quando aplicável. - UPDATE: membro autorizado
da família; preservar `family_id`; validar autor/versão. - DELETE:
preferir `deleted_at` via UPDATE; apenas admin pode operações
administrativas. - Viewer: SELECT somente. - Convites: não expor token
em texto claro; operações via Edge Function.

Nunca confiar em `family_id` recebido do cliente sem validar associação.
Não expor `service_role` no bundle, logs ou variáveis `VITE_*`.

## 8. Regras de dinheiro e datas

### 8.1 Money

Criar tipo `MoneyCents` (number inteiro seguro) e funções: -
`parseCurrencyInput()`; - `formatBRL()`; - `addMoney()`; -
`subtractMoney()`; - `splitAmountIntoInstallments()`.

Validar `Number.isSafeInteger` e limites máximos razoáveis. Não usar
`parseFloat` diretamente em campos monetários sem normalização.

### 8.2 Parcelas

Para total `T` em centavos e quantidade `N`: - base = `floor(T / N)`; -
resto = `T % N`; - as primeiras `resto` parcelas recebem `base + 1`; -
demais recebem `base`; - soma obrigatoriamente igual a `T`.

### 8.3 Ciclo de cartão

Implementar uma função de domínio pura:
`resolveInvoiceCycle(transactionDate, closingDay, dueDay, closingDayPolicy, timezone)`

Cobrir: - dia de fechamento existente/inexistente; - compra no
fechamento; - compra antes/depois; - vencimento em mês posterior ou no
mesmo mês, conforme calendário; - retroatividade; - mudança de regra do
cartão sem reescrever faturas já fechadas.

Persistir datas de ciclo calculadas nas faturas/parcelas. Mudanças
futuras no cartão não devem recalcular silenciosamente transações
antigas.

### 8.4 Competência

Guardar competência como data do primeiro dia do mês (`YYYY-MM-01`).
Para crédito, padrão é mês da fatura atribuída. Para caixa, usar data
efetiva. Não derivar relatórios de competência apenas a partir de
`created_at`.

## 9. Motor de sincronização offline

### 9.1 Banco local Dexie

Criar stores: - `families`; - `familyMembers`; - `accounts`; -
`cards`; - `categories`; - `transactions`; - `installmentPlans`; -
`installments`; - `invoices`; - `invoicePayments`; - `recurringRules`; -
`budgets`; - `financialGoals`; - `shoppingLists`; - `shoppingItems`; -
`outbox`; - `syncMetadata`; - `conflicts`.

Todas as entidades sincronizáveis devem ter: - `id`; - `familyId`; -
`createdAt`; - `updatedAt`; - `deletedAt`; - `version`; - `syncStatus`
local (pending/synced/conflict/error).

### 9.2 Outbox

Toda mutação: 1. valida no domínio; 2. grava entidade local e outbox na
mesma transação IndexedDB; 3. atualiza interface; 4. tenta sincronizar
se online.

Campos de outbox: - `operationId` UUID; - `entityType`; - `entityId`; -
`operationType`; - `payload`; - `baseVersion`; - `createdAt`; -
`attempts`; - `nextAttemptAt`; - `status`; - `lastErrorCode` sanitizado.

### 9.3 Idempotência

Toda mutação remota leva `operation_id` único. O servidor deve manter
registro de operações processadas e retornar o resultado anterior quando
a mesma operação for reenviada.

Não confiar somente no UUID da entidade: a mesma entidade pode receber
atualizações diferentes.

### 9.4 Ordem e dependências

Sincronizar por dependência: 1. família/membro (quando aplicável); 2.
contas, cartões e categorias; 3. transação/plano; 4. faturas e parcelas;
5. pagamentos/movimentações; 6. listas e itens.

Uma operação dependente não pode ser enviada antes da entidade
referenciada existir no servidor. Como IDs são gerados no cliente,
referências podem ser resolvidas por UUID estável.

### 9.5 Retentativa

-   exponential backoff com jitter;
-   respeitar `Retry-After`;
-   distinguir falha transitória, autorização, validação e conflito;
-   erros de validação não devem ser repetidos indefinidamente;
-   botão "tentar novamente" para erros recuperáveis.

### 9.6 Conflitos

-   inserts diferentes: aceitar ambos.
-   update com `baseVersion` igual à versão atual: aplicar e incrementar
    versão.
-   update com versão divergente: retornar conflito.
-   valores financeiros concorrentes: preservar ambas as propostas no
    registro de conflito; usuário escolhe ou cria ajuste explícito.
-   deletes: tombstone com versão; não apagar fisicamente no cliente.
-   Realtime notifica; reconciliação consulta alterações desde
    `lastSyncAt`.

### 9.7 Reconciliação

Ao iniciar app, recuperar conexão e receber notificação Realtime: -
buscar alterações remotas após cursor; - aplicar em transação local; -
preservar operações locais pendentes; - detectar versões divergentes; -
avançar cursor apenas após commit local. Implementar paginação e cursor
estável (`updated_at` + `id`) para não perder registros com timestamps
iguais.

### 9.8 Limitações do offline

Autenticação inicial e convite exigem conexão. Depois de uma sessão
válida, permitir acesso offline ao cache local, sujeito à política de
expiração de sessão. Ao sair da conta, limpar ou bloquear dados locais
daquela identidade, sem apagar dados remotos.

Não prometer Background Sync universal. Sincronizar ao abrir, ao voltar
ao primeiro plano, no evento online, após mutações e periodicamente
enquanto a aplicação estiver ativa.

## 10. Operações atômicas no servidor

Criar RPCs PostgreSQL ou Edge Functions para operações compostas: -
`create_expense_with_installments`; - `record_invoice_payment`; -
`create_transfer`; - `generate_recurring_occurrences`; -
`accept_family_invitation`; - `apply_sync_operation`.

Cada operação: - valida autenticação e associação familiar; - valida
payload; - verifica `operation_id`; - executa em transação; - grava
auditoria; - retorna entidades atualizadas e versões.

Não implementar pagamento de fatura ou transferência como múltiplas
chamadas independentes do frontend.

## 11. API e contratos de aplicação

A camada Application deve usar interfaces, não importar Supabase
diretamente.

Exemplos de casos de uso: - `CreateExpense`; - `CreateIncome`; -
`CreateTransfer`; - `CreateCreditCard`; - `CreateAccount`; -
`CreateInstallmentPlan`; - `PayInvoice`; - `CreateRecurringRule`; -
`GenerateRecurringOccurrences`; - `CreateBudget`; -
`CreateShoppingList`; - `ParseNaturalLanguageEntry`; -
`SyncPendingOperations`; - `ResolveSyncConflict`; - `ExportFamilyData`.

Usar Zod para validar DTOs no frontend e novamente no servidor.

## 12. Linguagem natural

Implementar parser desacoplado com interface:
`NaturalLanguageParser.parse(text, context): ParseResult`.

ParseResult: - `intent`; - `fields`; - `missingFields`; -
`ambiguities`; - `confidence`; - `requiresConfirmation`.

Primeira implementação: parser determinístico para padrões comuns em
pt-BR, números monetários, datas relativas, categorias, cartões e formas
de pagamento. Não inventar cartão ou conta. Se houver múltiplos
candidatos, perguntar.

LLM futura deve ser adapter substituível. Nunca enviar credenciais,
dados de outras famílias ou histórico integral sem consentimento. A
gravação exige confirmação explícita.

## 13. PWA

Configurar: - manifest com nome "Zé das Contas", short name "Zé das
Contas"; - ícones 192x192 e 512x512; - `display: standalone`; -
`start_url`; - theme/background color; - Service Worker; - precache de
shell e assets; - estratégia cache-first para assets versionados; -
network-first ou stale-while-revalidate para recursos públicos não
sensíveis; - nunca cachear respostas financeiras autenticadas em Cache
Storage sem política explícita.

O cache de dados financeiros é IndexedDB, isolado por usuário/família e
controlado pela camada local.

Criar tela de atualização disponível. Não forçar reload no meio de um
lançamento.

## 14. Segurança e privacidade

-   HTTPS obrigatório em produção.
-   Segredos somente no servidor.
-   RLS em todas as tabelas.
-   Sanitização de erros/logs.
-   Não registrar valores, descrições ou payloads financeiros em logs
    externos.
-   Proteção contra XSS; não renderizar HTML de usuário sem sanitização.
-   Rate limit para convites e operações sensíveis.
-   Validação de uploads futuros.
-   Política de sessão e logout.
-   Limpeza de dados locais em logout conforme especificação.
-   Exportação e exclusão de dados conforme solicitação do usuário e
    requisitos legais aplicáveis.
-   Não afirmar certificação ou conformidade legal não auditada.

## 15. Observabilidade e recuperação

Criar: - painel local de status de sincronização; - contador de
pendências; - última sincronização; - erros recuperáveis; - logs
técnicos sem dados pessoais; - exportação de diagnóstico opcional e
sanitizada.

Implementar backup lógico/exportação JSON e CSV. Documentar procedimento
de restauração. Não depender somente do backup do plano gratuito do
provedor.

## 16. Testes obrigatórios

### Unitários

-   parsing e formatação monetária;
-   divisão de parcelas;
-   ciclo de cartão;
-   competência;
-   cálculo de saldo;
-   projeção;
-   recorrência;
-   parser de linguagem natural;
-   resolução de conflitos.

### Integração

-   criação de despesa e parcelas;
-   pagamento parcial/total de fatura;
-   transferência atômica;
-   recorrência idempotente;
-   RLS entre famílias;
-   sync operation idempotente.

### E2E

-   cadastro/login;
-   criar família e convidar segundo usuário;
-   registrar despesa;
-   desconectar internet, registrar e reconectar;
-   dois navegadores/aparelhos simulados;
-   fatura e parcelamento;
-   dashboard e filtros;
-   exportação.

### Casos financeiros de referência

1.  Compra de R\$ 100,00 em 3 parcelas: soma = R\$ 100,00.
2.  Compra de R\$ 10,00 em 3 parcelas: R\$ 3,34 + R\$ 3,33 + R\$ 3,33.
3.  Transferência de R\$ 500: total consolidado de receitas/despesas
    permanece inalterado.
4.  Compra no crédito de R\$ 200: não reduz saldo bancário no ato.
5.  Pagamento de fatura de R\$ 200: reduz caixa e obrigação; não
    adiciona R\$ 200 às despesas.
6.  Receita prevista de R\$ 3.000: não aumenta saldo real até
    recebimento.
7.  Reenviar mesma operação: não duplicar.
8.  Dois inserts offline independentes: ambos persistem.
9.  Dois updates concorrentes em valor: gerar conflito.
10. Família A não consulta família B.

## 17. CI/CD e ambientes

Ambientes: - local; - preview/staging; - produção.

Variáveis: - `VITE_SUPABASE_URL`; - `VITE_SUPABASE_ANON_KEY` (chave
publicável); - secrets de Edge Functions configurados no Supabase, nunca
prefixados `VITE_`.

Usar migrations no Git. Pipeline: 1. instalar dependências com lockfile;
2. lint; 3. typecheck; 4. unit tests; 5. build; 6. E2E em preview quando
configurado.

Não executar migration destrutiva automaticamente em produção. Exigir
revisão e backup antes de alterações de schema com risco de perda.

## 18. Critérios de conclusão técnica

Uma sprint está concluída somente se: - build passa; - TypeScript strict
passa; - lint passa; - testes relevantes passam; - migrations estão
versionadas; - RLS foi revisada; - comportamento offline foi testado
quando aplicável; - documentação foi atualizada; - não há secrets no
frontend; - não há dados mockados no fluxo de produção; - instruções de
execução foram atualizadas.

## 19. Decisões em aberto que devem ser configuráveis

Não fixar silenciosamente: - política de compra no dia de fechamento; -
horário de corte/timezone; - se orçamento de crédito usa data da compra
ou competência da fatura; - política de liberação de limite após
pagamento; - permissões de exclusão para membros; - prazo de retenção de
dados locais após logout; - geração antecipada de recorrências.

Adotar defaults descritos na especificação funcional e expor
configuração quando necessário.
