# 💰 Zé das Contas

> **Gerenciador de finanças pessoais e familiares com tecnologia offline-first e sincronização em tempo real**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5a0fc8)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

O **Zé das Contas** é uma aplicação web progressiva (PWA) para gerenciamento de finanças pessoais e familiares, projetada para funcionar perfeitamente mesmo sem conexão à internet. Registre despesas, receitas, cartões de crédito, faturas, transferências, orçamentos e listas de compras com precisão matemática em centavos inteiros.

---

## 🎯 Características Principais

### ✅ Integridade Financeira
- **Centavos inteiros**: Toda matemática financeira em centavos (`bigint`) — sem erros de arredondamento
- **Parcelamento determinístico**: R$ 100,00 em 3x = R$ 33,34 + R$ 33,33 + R$ 33,33 (soma exata)
- **Pagamento de fatura sem duplicação**: Pagar fatura não cria despesa duplicada
- **Transferências neutras**: Transferência entre contas não altera total de receitas/despesas

### 🔄 Offline-First
- **Funciona sem internet**: Registre operações offline; sincroniza automaticamente ao reconectar
- **Banco local Dexie/IndexedDB**: Persistência local com performance de aplicativo nativo
- **Sync Engine robusto**: Idempotência via `operation_id`, retentativas com backoff exponencial
- **Resolução de conflitos**: Detecta edições concorrentes e preserva ambas as versões

### 👨‍👩‍👧‍👦 Compartilhamento Familiar Seguro
- **Multi-usuário**: Dois ou mais membros com contas individuais
- **RLS (Row Level Security)**: Dados isolados por família no Supabase PostgreSQL
- **Sincronização em tempo real**: Alterações aparecem instantaneamente nos dispositivos da família
- **Papéis e permissões**: Admin, Membro, Visualizador

### 📊 3 Perspectivas Analíticas
1. **Competência**: Quando você consumiu (crédito no mês da fatura, débito no mês da compra)
2. **Caixa**: Quando o dinheiro entrou/saiu das suas contas bancárias
3. **Compromissos**: Obrigações futuras (faturas abertas, parcelas vincendas)

### 💳 Gestão Completa de Cartões de Crédito
- **Ciclo de fatura automático**: Cálculo preciso com regras configuráveis (dia de fechamento incluído/excluído)
- **Limites dinâmicos**: Limite disponível estimado com base em parcelas e pagamentos
- **Faturas inteligentes**: Abertas, fechadas, parcialmente pagas, vencidas
- **Parcelamento**: 1x a 24x com atribuição correta à fatura de cada mês

### 📈 Orçamentos e Metas
- **Orçamento geral ou por categoria**: Defina tetos de gastos mensais
- **Alertas não-punitivos**: "Você utilizou 75% do orçamento de Delivery" (tom acolhedor)
- **Indicadores visuais**: Normal (verde) → Atenção 70% (amarelo) → Alerta 90% (laranja) → Excedido 100% (vermelho)

### 🛒 Listas de Compras Colaborativas
- **Tempo real**: Toda a família vê e edita as mesmas listas
- **Checklist inteligente**: Marque itens comprados, acompanhe progresso
- **Preço estimado vs. real**: Compare quanto planejou gastar vs. quanto gastou

### 🎨 Design Acessível e Responsivo
- **Mobile-first**: Otimizado para celulares, adapta-se a tablets e desktops
- **WCAG 2.1 AA**: Contraste validado, navegação por teclado, área de toque 44px
- **Tema claro/escuro**: Automático (segue sistema) ou manual
- **PWA instalável**: Adicione à tela inicial como aplicativo nativo

---

## 🚀 Como Usar

### Pré-requisitos

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ (incluído com Node.js)
- Conta no **Supabase** ([Criar conta grátis](https://supabase.com))
- Conta no **GitHub** (para controle de versão)
- Conta no **Vercel** ([Criar conta grátis](https://vercel.com)) — opcional para deploy

---

## 📦 Instalação e Configuração Local

### 1️⃣ Clone o Repositório

```bash
git clone https://github.com/SEU_USUARIO/ze_das_contas.git
cd ze_das_contas
```

### 2️⃣ Instale as Dependências

```bash
npm install
```

### 3️⃣ Configure o Supabase

#### 3.1 Crie um Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `ze-das-contas` (ou nome de sua preferência)
   - **Database Password**: Crie uma senha forte e **salve em local seguro**
   - **Region**: Escolha a região mais próxima (ex: `South America (São Paulo)`)
4. Aguarde a criação (1-2 minutos)

#### 3.2 Execute as Migrations SQL

1. No painel do Supabase, vá em **SQL Editor** (menu lateral esquerdo)
2. Clique em **"New Query"**
3. Copie todo o conteúdo do arquivo `supabase/migrations/all_migrations.sql` do projeto
4. Cole no editor SQL e clique em **"Run"**
5. Aguarde a confirmação de sucesso (deve demorar 10-20 segundos)

#### 3.3 Obtenha as Credenciais

1. No painel do Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL**: `https://XXXXX.supabase.co`
   - **anon public key**: `eyJhbGciOi...` (chave longa começando com `eyJ`)

### 4️⃣ Configure as Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
# Na pasta ze_das_contas/
touch .env.local
```

Edite o arquivo `.env.local` e adicione:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

**⚠️ IMPORTANTE**: Nunca commite o arquivo `.env.local` no Git! Ele já está listado no `.gitignore`.

### 5️⃣ Inicie o Servidor de Desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em **http://localhost:5173**

---

## 🧪 Testes

Execute os testes unitários:

```bash
npm test
```

Execute testes em modo watch (desenvolvimento):

```bash
npm run test:watch
```

Verificação de tipos TypeScript:

```bash
npm run typecheck
```

Build de produção local:

```bash
npm run build
```

---

## 🌐 Deploy na Vercel (Recomendado)

### Passo 1: Conecte o Repositório ao GitHub

1. Crie um repositório no GitHub:
   ```bash
   # Se ainda não criou o repositório remoto
   git remote add origin https://github.com/SEU_USUARIO/ze_das_contas.git
   git branch -M main
   git push -u origin main
   ```

### Passo 2: Conecte o Repositório à Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em **"Add New Project"**
3. Selecione o repositório `ze_das_contas`
4. Configure as variáveis de ambiente:
   - Clique em **"Environment Variables"**
   - Adicione:
     - `VITE_SUPABASE_URL` = `https://SEU_PROJECT_ID.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `sua_anon_key_aqui`
5. Clique em **"Deploy"**

### Passo 3: Configure o Domínio (Opcional)

1. Após o deploy, vá em **Settings** → **Domains**
2. Adicione um domínio personalizado (ex: `ze-das-contas.vercel.app`)
3. A Vercel configura HTTPS automaticamente

### Passo 4: Deploys Automáticos

Agora, toda vez que você fizer `git push` para a branch `main`, a Vercel:
- Detecta a alteração automaticamente
- Executa `npm install` e `npm run build`
- Faz deploy da nova versão em ~1 minuto

---

## 📱 Instalação como PWA

Após o deploy, você pode instalar o Zé das Contas como aplicativo:

### No Android (Chrome/Edge):
1. Abra o site no navegador
2. Toque no menu (⋮) e selecione **"Adicionar à tela inicial"**
3. Confirme a instalação

### No iOS (Safari):
1. Abra o site no Safari
2. Toque no botão **Compartilhar** (ícone de seta para cima)
3. Selecione **"Adicionar à Tela de Início"**
4. Confirme

### No Desktop (Chrome/Edge/Brave):
1. Abra o site
2. Clique no ícone de instalação na barra de endereço (➕)
3. Ou vá em Menu → **"Instalar Zé das Contas..."**

---

## 🏗️ Estrutura do Projeto

```
ze_das_contas/
├── docs/                           # Especificações funcionais, técnicas e visuais
│   ├── 01_ESPECIFICACAO_FUNCIONAL.md
│   ├── 02_ESPECIFICACAO_TECNICA.md
│   └── 03_ESPECIFICACAO_VISUAL.md
├── public/                         # Assets estáticos e manifest PWA
│   └── manifest.json
├── src/
│   ├── app/                        # Configuração global, rotas e guards
│   │   ├── App.tsx
│   │   ├── router/
│   │   └── guards/
│   ├── components/                 # Componentes reutilizáveis
│   │   ├── ui/                     # Button, Input, MoneyDisplay, etc.
│   │   ├── layout/                 # AppShell, PageHeader, Navigation
│   │   └── feedback/               # EmptyState, SyncStatus, Toast
│   ├── modules/                    # Módulos de negócio (feature-based)
│   │   ├── auth/                   # Autenticação e onboarding
│   │   ├── accounts/               # Contas bancárias e carteiras
│   │   ├── cards/                  # Cartões de crédito e faturas
│   │   ├── transactions/           # Despesas, receitas e lançamentos
│   │   ├── analytics/              # Relatórios e 3 perspectivas
│   │   ├── categories/             # Gestão de categorias
│   │   ├── shopping/               # Listas de compras
│   │   └── settings/               # Configurações e exportação
│   ├── domain/                     # Lógica de negócio pura (sem React/Supabase)
│   │   ├── money/                  # Cálculos monetários em centavos
│   │   ├── cards/                  # Ciclo de fatura e datas
│   │   ├── finance/                # Saldo, limites e projeções
│   │   └── analytics/              # 3 perspectivas e orçamentos
│   ├── application/                # Casos de uso (Use Cases)
│   │   └── use-cases/
│   │       ├── createExpense.ts
│   │       ├── createIncome.ts
│   │       ├── payInvoice.ts
│   │       └── exportFamilyData.ts
│   ├── infrastructure/             # Implementações técnicas
│   │   ├── supabase/               # Cliente Supabase e autenticação
│   │   ├── local/                  # Dexie (IndexedDB)
│   │   │   ├── db.ts
│   │   │   └── types.ts
│   │   └── sync/                   # Motor de sincronização offline
│   │       └── sync-engine.ts
│   └── shared/                     # Utilitários e constantes
│       ├── hooks/
│       └── utils/
├── supabase/
│   └── migrations/
│       └── all_migrations.sql      # Schema completo PostgreSQL + RLS
├── .env.local                      # Variáveis de ambiente (NÃO commitado)
├── package.json
├── tsconfig.json                   # TypeScript strict mode
├── tailwind.config.js              # Design system e tema
├── vite.config.ts                  # Build tool + PWA plugin
└── vitest.config.ts                # Configuração de testes
```

---

## 🧑‍💻 Fluxo de Trabalho do Desenvolvedor

### Criar Nova Feature

```bash
# Crie uma branch
git checkout -b feature/nova-funcionalidade

# Desenvolva e teste
npm run dev
npm test

# Commit e push
git add .
git commit -m "feat: adiciona nova funcionalidade X"
git push origin feature/nova-funcionalidade

# Abra Pull Request no GitHub
```

### Atualizar Dependências

```bash
# Verifica atualizações disponíveis
npm outdated

# Atualiza com cuidado (testa depois)
npm update

# Ou atualiza uma dependência específica
npm install react@latest
```

### Adicionar Nova Migration SQL

1. Crie um novo arquivo em `supabase/migrations/`
2. Nomeie com timestamp: `20261102_adiciona_campo_x.sql`
3. Execute no Supabase SQL Editor
4. Documente no README ou em comentários SQL

---

## 🔒 Segurança

### O Que Está Protegido

✅ **RLS (Row Level Security)**: Todas as tabelas verificam `is_family_member()`  
✅ **Secrets no servidor**: Nenhuma chave sensível no código frontend  
✅ **HTTPS obrigatório**: Supabase e Vercel forçam conexão segura  
✅ **Sanitização de erros**: Logs não expõem dados financeiros  
✅ **Isolamento de dados**: Família A não acessa dados de Família B  

### Boas Práticas

- ⚠️ Nunca commite `.env.local` no Git
- ⚠️ Não exponha `service_role` key no frontend
- ⚠️ Faça backup do banco de dados Supabase periodicamente
- ⚠️ Exporte seus dados regularmente (botão na tela "Mais")

---

## 📊 Exportação de Dados

### Como Exportar

1. Navegue para **Mais** (menu inferior ou lateral)
2. Clique em **"Exportar Dados"** (rodapé do card informativo)
3. Escolha o formato:
   - **JSON Completo**: Backup estruturado com todas as entidades
   - **CSV para Planilhas**: Transações compatíveis com Excel/Sheets

### O Que é Exportado

#### JSON Completo
- Contas bancárias e saldos
- Cartões de crédito e configurações
- Todas as transações (despesas, receitas, transferências)
- Faturas e parcelamentos
- Orçamentos e metas
- Listas de compras e itens
- Metadados da família

#### CSV para Planilhas
- Data da transação
- Tipo (Despesa/Receita)
- Descrição
- Categoria
- Valor (R$)
- Forma de pagamento
- Conta/Cartão
- Status
- Competência
- Observações

### Restauração de Backup

Atualmente, a restauração de backup JSON não possui interface automatizada. Para restaurar:
1. Entre em contato com o administrador do sistema
2. Ou use ferramentas SQL diretas no Supabase

---

## 🧪 Testes Automatizados

### Cobertura Atual: 41 Testes Unitários (100% aprovados)

#### Domain (Lógica Pura)
- ✅ `money.test.ts`: Formatação, parsing, divisão de parcelas (10 testes)
- ✅ `invoiceCycle.test.ts`: Ciclo de fatura em cenários complexos (6 testes)
- ✅ `analytics.test.ts`: 3 perspectivas e orçamentos (3 testes)

#### Application (Use Cases)
- ✅ `financialCases.test.ts`: Casos financeiros de referência (7 testes)

#### Components (UI)
- ✅ `MoneyDisplay.test.tsx`: Exibição de valores monetários (3 testes)
- ✅ `CurrencyInput.test.tsx`: Input de valores (2 testes)
- ✅ `Button.test.tsx`: Estados e variantes (4 testes)
- ✅ `SyncStatus.test.tsx`: Indicador de sincronização (3 testes)

#### Infrastructure
- ✅ `db.test.ts`: Dexie e mutações atômicas (1 teste)
- ✅ `sync-engine.test.ts`: Outbox e retentativas (2 testes)

---

## 🐛 Solução de Problemas

### Erro: "Invalid API Key"

**Causa**: Credenciais do Supabase incorretas ou ausentes.

**Solução**:
1. Verifique se `.env.local` existe e contém as variáveis corretas
2. Confirme que copiou a **anon public key** (não a `service_role`)
3. Reinicie o servidor de desenvolvimento: `Ctrl+C` → `npm run dev`

### Erro: Migration SQL Falhou

**Causa**: Schema já existe ou sintaxe SQL inválida.

**Solução**:
1. Verifique se já executou a migration antes
2. No Supabase SQL Editor, clique em **"Reset Database"** (⚠️ apaga todos os dados)
3. Execute a migration `all_migrations.sql` novamente

### Dados Não Sincronizam

**Causa**: Conflito de versão, internet instável ou RLS bloqueando acesso.

**Solução**:
1. Verifique se está online
2. Force sincronização: abra DevTools (F12) → Console → digite `location.reload()`
3. Verifique se o usuário está associado à família no Supabase

### Build Falha na Vercel

**Causa**: Variáveis de ambiente ausentes ou dependências desatualizadas.

**Solução**:
1. Confirme que adicionou `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` na Vercel
2. No painel da Vercel, vá em **Deployments** → clique no deploy falhado → **"Redeploy"**
3. Verifique logs de build para erros específicos

---

## 📖 Documentação Adicional

### Especificações Originais

- [01_ESPECIFICACAO_FUNCIONAL.md](docs/01_ESPECIFICACAO_FUNCIONAL.md) — Requisitos de negócio
- [02_ESPECIFICACAO_TECNICA.md](docs/02_ESPECIFICACAO_TECNICA.md) — Arquitetura e implementação
- [03_ESPECIFICACAO_VISUAL.md](docs/03_ESPECIFICACAO_VISUAL.md) — Design system e UX

### Recursos Externos

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Dexie](https://dexie.org/)
- [PWA Guide](https://web.dev/progressive-web-apps/)
- [React Router v7](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🗺️ Roadmap

### ✅ Fase 1-6 (Concluídas)
- [x] Projeto base, PWA e design system
- [x] Backend, database, auth e RLS
- [x] Persistência local e sync engine
- [x] Núcleo financeiro e casos de uso
- [x] Dashboard e análises (3 perspectivas)
- [x] Categorias e listas de compras
- [x] **Exportação de dados** (JSON e CSV)

### 🚧 Fase 7 — Funcionalidades Complementares (Próxima)
- [ ] Recorrências e assinaturas (schema pronto, UI pendente)
- [ ] Projeção de saldo (30/60/90 dias)
- [ ] Calendário diário de vencimentos
- [ ] Parser de linguagem natural (opcional)
- [ ] Subcategorias (hierarquia pai/filho)
- [ ] Testes E2E com Playwright

### 🔮 Fase 8 — Evoluções Futuras
- [ ] Metas financeiras com acompanhamento
- [ ] Gráficos interativos (Recharts)
- [ ] Notificações push (quando suportado)
- [ ] Importação de OFX/CSV bancário
- [ ] Relatórios PDF
- [ ] Modo multi-família (trocar entre famílias)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Convenções de Commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação (sem mudança lógica)
- `refactor:` Refatoração de código
- `test:` Adição/correção de testes
- `chore:` Tarefas de build, CI/CD, dependências

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

## 👨‍💻 Autor

Desenvolvido com ❤️ por **[Seu Nome]**

- GitHub: [@SEU_USUARIO](https://github.com/SEU_USUARIO)
- Email: seu.email@example.com

---

## 🙏 Agradecimentos

- [Supabase](https://supabase.com) — Backend as a Service open-source
- [Vercel](https://vercel.com) — Hospedagem e deploy instantâneo
- [Dexie.js](https://dexie.org/) — Wrapper IndexedDB incrível
- [Lucide](https://lucide.dev/) — Ícones bonitos e acessíveis
- [Tailwind CSS](https://tailwindcss.com/) — Framework CSS utilitário

---

## 📞 Suporte

Encontrou um bug ou tem uma sugestão?

- Abra uma [Issue no GitHub](https://github.com/SEU_USUARIO/ze_das_contas/issues)
- Consulte a seção **[Solução de Problemas](#-solução-de-problemas)**
- Revise a [Documentação Técnica](docs/02_ESPECIFICACAO_TECNICA.md)

---

**Zé das Contas** — Seu dinheiro, organizado em família. 💚
