# ZÉ DAS CONTAS --- ESPECIFICAÇÃO VISUAL

**Versão:** 1.0\
**Direção:** aplicativo financeiro moderno, acolhedor, confiável e
simples\
**Prioridade:** experiência mobile-first, acessibilidade e legibilidade
de dados

------------------------------------------------------------------------

## 1. Conceito visual

O Zé das Contas deve transmitir controle, clareza e tranquilidade. A
interface não deve parecer um sistema bancário complexo nem um
aplicativo infantil.

Personalidade: - acolhedora, sem excesso de informalidade; - moderna e
objetiva; - confiável e discreta; - visualmente leve, com foco nos
números; - fácil de usar por pessoas com diferentes níveis de
familiaridade tecnológica.

O personagem "Zé das Contas" é um elemento de identidade e orientação,
não deve competir com os dados. Usar em onboarding, estados vazios,
dicas e conquistas; evitar mascote em todas as telas.

## 2. Direção de arte

### 2.1 Tema padrão

Tema escuro como padrão inicial, com opção de tema claro e seguir
configuração do sistema.

Paleta escura sugerida: - Background principal: `#0B1220` -
Surface/card: `#121D2D` - Surface elevada: `#1A2940` - Borda:
`#26364B` - Texto principal: `#F4F7FB` - Texto secundário: `#A7B4C5` -
Texto desabilitado: `#718096`

Paleta clara: - Background: `#F5F7FA` - Surface: `#FFFFFF` - Surface
elevada: `#F0F3F7` - Borda: `#E2E8F0` - Texto principal: `#172033` -
Texto secundário: `#64748B`

Cores semânticas: - Positivo/receita/sucesso: `#25B77A` - Despesa/erro:
`#E56B6F` - Atenção/pendência: `#E8A23A` - Informação/ação primária:
`#4D8DDB` - Destaque secundário: `#8B7BEA`

Não depender exclusivamente da cor para comunicar status. Sempre
acompanhar com texto, ícone ou padrão.

## 3. Tipografia

Usar fonte sans-serif legível, preferencialmente Inter ou equivalente
local/web otimizada.

Escala: - Display/valor principal: 28--34 px, peso 700. - Título de
tela: 22--26 px, peso 700. - Título de seção: 16--18 px, peso 600. -
Texto padrão: 14--16 px, peso 400. - Metadados/labels: 12--13 px, peso
500. - Botões: 14--16 px, peso 600.

Valores financeiros devem usar algarismos tabulares quando disponíveis.
Manter formato `R$ 1.234,56`.

## 4. Espaçamento, grid e formas

-   Base de espaçamento: 4 px.
-   Padding lateral mobile: 16 px.
-   Espaço entre seções: 24 px.
-   Espaço entre cards: 12 px.
-   Padding de cards: 16 px.
-   Altura mínima de toque: 44--48 px.
-   Raio de cards: 16 px.
-   Raio de inputs/botões: 10--12 px.
-   Bordas sutis; evitar sombras fortes no tema escuro.

Breakpoints indicativos: - mobile: até 767 px; - tablet: 768--1023 px; -
desktop: 1024 px ou mais.

No mobile, usar uma coluna e navegação inferior. No desktop, menu
lateral e grid de duas ou três colunas quando houver espaço. Não esticar
formulários excessivamente.

## 5. Navegação

### Mobile

Barra inferior fixa com cinco destinos: 1. Início; 2. Lançar; 3.
Análises; 4. Cartões; 5. Mais.

O item "Lançar" deve ter destaque visual moderado e acesso rápido. A
barra deve respeitar safe areas do aparelho.

### Desktop

Sidebar com logo, família ativa, navegação e perfil. Área de conteúdo
central com largura máxima apropriada.

### Cabeçalho

Exibir: - título da tela; - seletor de período quando aplicável; -
seletor de família se houver mais de uma; - avatar/perfil; - estado de
sincronização em local consistente.

## 6. Componentes de sistema visual

Criar componentes reutilizáveis: - `AppShell`; - `BottomNavigation`; -
`SidebarNavigation`; - `PageHeader`; - `MonthSelector`; -
`FamilySwitcher`; - `SyncStatus`; - `OfflineBanner`; - `MoneyDisplay`; -
`MetricCard`; - `ProgressBar`; - `CategoryIcon`; -
`TransactionListItem`; - `AccountCard`; - `CreditCardTile`; -
`InvoiceSummary`; - `EmptyState`; - `ErrorState`; - `LoadingSkeleton`; -
`ConfirmDialog`; - `BottomSheet`; - `Toast`; - `FormField`; -
`CurrencyInput`; - `DateInput`; - `CategoryPicker`.

Os componentes devem ter estados default, hover (desktop), focus,
pressed, disabled, loading, error e success quando aplicável.

## 7. Tela de login e onboarding

### Login

-   Logo e nome do produto.
-   Mensagem curta: "Seu dinheiro, organizado em família."
-   E-mail.
-   Senha com mostrar/ocultar.
-   Entrar.
-   Recuperar senha.
-   Criar conta.

### Onboarding

Passos curtos: 1. Criar perfil. 2. Criar família. 3. Configurar primeira
conta. 4. Cadastrar cartão (opcional). 5. Convidar membro. 6. Acessar
dashboard.

Permitir pular configurações opcionais. Nunca bloquear o acesso porque o
usuário ainda não cadastrou cartão ou conta.

## 8. Dashboard

Ordem visual mobile: 1. Header com saudação e família. 2. Seletor de
mês. 3. Card de saldo consolidado. 4. Indicadores de receitas e
despesas. 5. Card de saldo livre estimado/projeção. 6. Progresso do
orçamento. 7. Gráfico de evolução. 8. Categorias principais. 9. Faturas
próximas. 10. Últimas movimentações.

O saldo consolidado deve ser o maior destaque. Deixar explícito se
representa saldo real de contas ou estimativa.

Cards: - usar hierarquia clara; - rótulo pequeno; - valor em destaque; -
comparação em texto menor; - ícone discreto; - evitar excesso de cores.

## 9. Lançamentos

### 9.1 Acesso rápido

Ao tocar em "Lançar", abrir bottom sheet ou tela curta com: - Despesa; -
Receita; - Transferência; - Linguagem natural.

### 9.2 Formulário de despesa

Ordem: 1. valor (campo mais destacado); 2. descrição; 3. categoria; 4.
data; 5. forma de pagamento; 6. conta ou cartão; 7. parcelas, se
crédito; 8. recorrência, se aplicável; 9. observação; 10. botão salvar.

Mostrar campos condicionais somente quando necessários. Ao escolher
crédito, exibir cartão e número de parcelas. Ao escolher
PIX/débito/dinheiro, exibir conta.

O formulário deve preservar rascunho se o usuário navegar acidentalmente
ou o app for interrompido.

### 9.3 Linguagem natural

Campo amplo com placeholder: "Ex.: Gastei R\$ 85 no mercado no Nubank em
2x"

Após interpretar, mostrar cartões de campos detectados para revisão.
Destacar ambiguidade com linguagem clara. Botão principal "Confirmar
lançamento"; opção "Editar detalhes".

Nunca apresentar texto de parser como se fosse confirmação de gravação
antes de persistir localmente.

## 10. Listas de transações

Cada linha: - ícone de categoria; - descrição; - categoria e data; -
responsável ou avatar pequeno; - valor alinhado à direita; - indicação
de status/forma de pagamento.

Receitas e despesas devem ser distinguíveis sem depender apenas de
verde/vermelho. Usar prefixos/sinais e labels.

Filtros em chips ou bottom sheet: - mês; - tipo; - categoria; -
pessoa; - conta/cartão; - status.

## 11. Cartões e faturas

### Visão de cartões

Cards compactos com: - nome; - instituição; - limite utilizado; - limite
disponível; - barra de utilização; - próxima data de vencimento.

Evitar mostrar números completos de cartão ou dados bancários sensíveis.

### Detalhe do cartão

-   limite total;
-   comprometido;
-   disponível estimado;
-   fatura atual;
-   próximas faturas;
-   lista de parcelas;
-   histórico.

### Fatura

Mostrar: - valor total; - valor pago; - saldo restante; - fechamento; -
vencimento; - status; - compras/parcelas incluídas; - botão "Registrar
pagamento".

O botão deve abrir formulário de pagamento parcial ou total, com seleção
da conta de origem.

## 12. Contas

Cards com: - nome da conta; - tipo/instituição; - saldo atual; - última
atualização; - estado ativa/inativa.

Detalhe: - saldo atual; - entradas e saídas; - transferências; - filtros
de período; - ajuste de saldo com motivo.

## 13. Análises

### Relatório mensal

-   seletor de mês;
-   alternador competência/caixa/comprometimento;
-   receitas, despesas e resultado;
-   comparação com período anterior;
-   gráfico de barras ou linha;
-   despesas por categoria;
-   fixas x variáveis;
-   pagas x pendentes.

### Categorias

-   gráfico de rosca apenas quando legível;
-   lista ordenada por valor;
-   participação percentual;
-   comparação com mês anterior;
-   média móvel.

### Visão acumulada

-   período total;
-   gráfico de evolução;
-   totais;
-   filtros.

Gráficos devem ter labels legíveis, tooltips acessíveis e alternativa
tabular para leitores de tela ou quando não houver espaço.

## 14. Orçamentos e metas

Exibir: - limite definido; - realizado; - saldo restante; -
percentual; - status visual.

Estados: - normal; - atenção (70%); - alerta (90%); - excedido (100%+).

Não usar animações chamativas ou mensagens culpabilizadoras. Tom de voz
acolhedor: "Você está perto do limite de Delivery" em vez de "Você
gastou demais".

## 15. Listas de compras

Interface semelhante a checklist: - nome da lista; - progresso de
itens; - valor estimado; - itens marcáveis; - quantidade; - preço
estimado/real; - adicionar item em destaque; -
compartilhar/atualização; - finalizar compra.

Ao finalizar, apresentar resumo estimado x real e botão explícito para
gerar despesa.

## 16. Estado offline e sincronização

Indicador persistente e discreto: - Online: "Sincronizado". - Offline:
"Modo offline". - Pendências: "3 alterações aguardando sincronização". -
Erro: "Não foi possível sincronizar" com ação de tentar novamente. -
Conflito: aviso com acesso à resolução.

Não bloquear o uso por estar offline. Não exibir "salvo na nuvem" até
confirmação do servidor. Após salvar localmente, usar mensagem "Salvo
neste aparelho; será sincronizado quando houver conexão".

## 17. Estados vazios, loading e erro

Estados vazios devem orientar a próxima ação: - "Você ainda não tem
despesas neste mês." - "Cadastre seu primeiro cartão para acompanhar as
faturas." - "Crie uma lista para organizar suas compras."

Loading: - skeletons com dimensões próximas ao conteúdo final; - evitar
spinner infinito; - ações críticas com loading e prevenção de duplo
clique.

Erro: - mensagem simples; - ação de recuperação; - detalhe técnico
apenas em área de diagnóstico.

## 18. Acessibilidade

-   contraste WCAG AA como meta;
-   navegação por teclado;
-   foco visível;
-   labels em todos os campos;
-   mensagens de erro associadas ao campo;
-   aria-label em ícones sem texto;
-   área de toque mínima de 44 px;
-   não depender apenas de cor;
-   respeitar `prefers-reduced-motion`;
-   suportar zoom do navegador;
-   gráficos com descrição textual.

## 19. Microinterações

Permitidas: - feedback curto ao salvar localmente; - animação suave de
progresso; - transições discretas entre telas; - confirmação visual de
sincronização; - feedback tátil quando suportado pelo dispositivo.

Evitar: - animações longas; - confete em operações financeiras comuns; -
modal para toda ação; - excesso de notificações; - elementos piscando.

## 20. Tom de voz e microcopy

Tom: brasileiro, claro, respeitoso e próximo. Pode haver personalidade
do "Zé", mas sem excesso de gírias.

Exemplos: - "Bom dia! Vamos organizar seu mês?" - "Despesa salva neste
aparelho." - "Tudo sincronizado." - "Sua fatura vence em 3 dias." -
"Você utilizou 90% do orçamento de Delivery." - "Não encontramos um
cartão com esse nome. Escolha um cartão cadastrado."

Evitar julgamento, culpa ou promessas de aconselhamento financeiro
profissional.

## 21. Responsividade e comportamento

-   Mobile é prioridade.
-   Não exigir hover para descobrir ações.
-   Formulários em uma coluna no celular.
-   Bottom sheets devem ser roláveis e respeitar teclado virtual.
-   Desktop deve aproveitar espaço sem transformar a aplicação em uma
    planilha densa.
-   Tabelas podem virar cards no mobile.
-   Gráficos devem se adaptar à largura.
-   Navegação e ações principais devem permanecer consistentes.

## 22. Critérios de aceite visual

1.  Todas as telas principais funcionam em largura de 360 px.
2.  Nenhum campo ou botão fica oculto pelo teclado ou safe area.
3.  Valores monetários são legíveis e alinhados.
4.  Tema claro e escuro mantêm contraste.
5.  Estado offline é identificável em todas as telas.
6.  Status de sincronização não se confunde com sucesso de gravação
    local.
7.  Formulários condicionais mostram somente campos relevantes.
8.  Loading, vazio, erro e sucesso foram desenhados.
9.  Navegação inferior funciona em dispositivos móveis.
10. Desktop possui layout adaptado, não apenas esticado.
11. Acessibilidade básica foi testada por teclado e leitor de tela.
12. A interface não utiliza dados fictícios fora de ambiente de
    demonstração.

## 23. Referências de execução visual

A IA deve priorizar consistência sobre originalidade em cada tela. Criar
um design system com tokens e componentes antes de desenvolver todas as
páginas.

Não copiar literalmente interfaces de bancos existentes. Usar padrões
familiares de aplicativos financeiros, mas manter identidade própria do
Zé das Contas.

O mascote pode ser desenvolvido como ilustração original em etapa
separada. Não bloquear o MVP por ausência do mascote: logo tipográfico e
ícone simples são suficientes para a primeira entrega.
