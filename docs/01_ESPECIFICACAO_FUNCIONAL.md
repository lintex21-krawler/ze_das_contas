# ZÉ DAS CONTAS --- ESPECIFICAÇÃO FUNCIONAL

**Versão:** 1.0\
**Status:** Documento-base para implementação\
**Produto:** Aplicação familiar de gerenciamento de finanças pessoais\
**Plataforma:** PWA mobile-first, responsiva e offline-first\
**Idioma e localidade inicial:** Português do Brasil (`pt-BR`), moeda
BRL (R\$), fuso configurável com padrão `America/Sao_Paulo`

------------------------------------------------------------------------

## 1. Objetivo do produto

O Zé das Contas é uma aplicação de finanças pessoais para uso
compartilhado por um núcleo familiar. Seu objetivo é permitir que duas
ou mais pessoas autorizadas registrem, acompanhem e planejem receitas,
despesas, contas bancárias, cartões de crédito, faturas, parcelamentos,
recorrências, metas e listas de compras.

A aplicação deve ser utilizável em celulares distintos, com contas
individuais e dados financeiros compartilhados dentro de uma família.
Deve permitir lançamentos mesmo sem internet e sincronizar as alterações
com o servidor quando a conexão retornar.

O produto não é um banco, não movimenta dinheiro em instituições
financeiras e não realiza pagamentos reais. Todo saldo, limite, fatura e
previsão é calculado a partir dos registros informados pelos usuários.

## 2. Princípios obrigatórios

1.  **Integridade financeira:** nenhum lançamento pode ser contado duas
    vezes; pagamento de fatura não pode duplicar a despesa original.
2.  **Offline-first:** ações principais devem funcionar sem conexão, com
    persistência local antes de confirmar sucesso ao usuário.
3.  **Compartilhamento seguro:** cada usuário tem credenciais próprias;
    os dados são compartilhados por família e protegidos por autorização
    no servidor.
4.  **Rastreabilidade:** registrar autor, data de criação, atualização e
    histórico de alterações relevantes.
5.  **Transparência:** diferenciar valores efetivos, previstos,
    pendentes e estimados.
6.  **Sem integrações bancárias automáticas no MVP:** os dados são
    inseridos manualmente ou importados por arquivo em fase futura.
7.  **Sem dependência obrigatória de IA paga:** linguagem natural deve
    ter modo determinístico/local ou fallback sem custo de API.
8.  **Mobile-first:** registrar uma despesa deve exigir o mínimo
    possível de interações.
9.  **Sem dados fictícios em produção:** dados de demonstração devem
    existir apenas em ambiente de desenvolvimento ou quando o usuário
    solicitar explicitamente.
10. **Exportabilidade:** o usuário deve conseguir exportar seus dados em
    formatos abertos.

## 3. Perfis, família e permissões

### 3.1 Usuários

Cada pessoa deve possuir: - conta individual; - nome de exibição; -
e-mail de autenticação; - avatar opcional; - status ativo/inativo; -
associação a uma ou mais famílias, se a arquitetura permitir.

### 3.2 Família

A família é o espaço de dados compartilhados. Contém contas, cartões,
categorias, transações, metas, listas e configurações.

Campos conceituais: - identificador único; - nome; - moeda principal; -
fuso horário; - data de criação; - criador.

### 3.3 Papéis

-   **Administrador:** gerencia família, membros, configurações e todos
    os dados.
-   **Membro:** registra e consulta dados; pode editar/excluir conforme
    política definida pela família.
-   **Somente leitura (futuro):** consulta sem registrar ou alterar.

No MVP, administrador e membro podem criar e editar lançamentos.
Exclusões devem ser lógicas e auditadas. Somente administrador pode
remover membros, alterar papéis ou encerrar a família.

### 3.4 Convites

O administrador convida por e-mail. O convite tem token seguro, prazo de
validade e status (pendente, aceito, expirado, revogado). O convidado
precisa autenticar-se para aceitar. Não expor dados da família antes da
aceitação.

## 4. Navegação principal

A navegação mobile inferior deve conter: 1. **Início:** dashboard e
alertas. 2. **Lançar:** menu rápido para despesa, receita, transferência
e linguagem natural. 3. **Análises:** relatórios, categorias, metas e
histórico. 4. **Cartões:** cartões, faturas, limites e parcelas. 5.
**Mais:** contas, listas de compras, recorrências, membros e
configurações.

Em telas maiores, a navegação pode se transformar em menu lateral. Todas
as telas devem preservar contexto de família e mês selecionado.

## 5. Módulo de despesas

### 5.1 Cadastro

Campos: - descrição (obrigatória); - valor total (obrigatório,
positivo); - data da compra (obrigatória; padrão hoje); - categoria
(obrigatória, com sugestão automática); - subcategoria (opcional); -
forma de pagamento: dinheiro, PIX, débito, crédito ou outro
configurável; - conta de origem (obrigatória para dinheiro, PIX e
débito, quando aplicável); - cartão (obrigatório para crédito); -
quantidade de parcelas (padrão 1); - recorrência (opcional, separada do
parcelamento); - observações (opcional); - responsável pelo lançamento
(preenchido pelo usuário autenticado); - lista de compras associada
(opcional); - status: previsto, pendente, pago/liquidado ou cancelado,
conforme tipo de pagamento.

A aplicação deve permitir escolher data e mês de referência, mas não
deve confundir mês de competência com mês de pagamento. A competência é
calculada conforme regras do produto e pode ser visualizada/ajustada
quando permitido.

### 5.2 Formas de pagamento

-   **Dinheiro:** saída da carteira/conta dinheiro na data efetiva de
    pagamento.
-   **PIX:** saída da conta selecionada na data efetiva.
-   **Débito:** saída da conta vinculada na data efetiva.
-   **Crédito:** cria obrigação no cartão/fatura; não reduz saldo
    bancário no momento da compra.
-   **Outro:** exige descrição e configuração do comportamento contábil
    antes de ser usado em cálculos.

### 5.3 Parcelamento

O usuário informa valor total e número de parcelas. O sistema cria um
plano e parcelas individuais. A soma das parcelas deve ser exatamente
igual ao total, inclusive quando houver divisão não exata em centavos.
Distribuir os centavos residuais de forma determinística (por exemplo,
nas primeiras parcelas), garantindo soma exata.

Cada parcela possui: - número sequencial; - valor; - data de
vencimento; - fatura de destino; - competência; - status; - vínculo com
a compra original.

A compra original deve aparecer uma vez no histórico de compras.
Relatórios por competência e fatura devem considerar as parcelas, sem
somar novamente o valor integral da compra.

### 5.4 Recorrência

Recorrência é diferente de parcelamento. Exemplos: aluguel mensal,
internet mensal, salário mensal. A regra deve permitir: - frequência
diária, semanal, mensal ou anual; - intervalo; - data inicial; - data
final opcional; - dia preferencial; - valor fixo ou variável; -
categoria; - conta/cartão; - geração antecipada configurável de
ocorrências; - pausar, retomar e encerrar.

Cada ocorrência gerada tem identidade única por regra + data de
referência. Não gerar duplicatas em reprocessamentos. Ocorrências
futuras podem ser editadas individualmente ou a partir de determinada
data, com confirmação clara.

## 6. Módulo de receitas

Campos: - descrição; - valor positivo; - categoria/tipo: salário,
pensão, décimo terceiro, férias, reembolso, venda, outro; - data
prevista; - data efetiva de recebimento; - conta de destino; -
recorrência opcional; - responsável; - observação; - status: prevista,
recebida, atrasada ou cancelada.

Receita prevista não aumenta saldo bancário real. Receita recebida
aumenta o saldo da conta na data efetiva. O usuário pode converter
previsão em recebimento sem criar uma segunda receita.

## 7. Contas bancárias e carteiras

Cadastro: - nome; - tipo: corrente, poupança, carteira digital, dinheiro
ou outro; - instituição opcional; - saldo inicial; - data-base do saldo
inicial; - cor/ícone; - ativa/inativa.

O saldo atual deve ser calculado a partir do saldo inicial e
movimentações efetivas. O sistema pode manter snapshots/cache de saldo
para desempenho, mas a fonte lógica deve ser o razão de movimentações.

Fórmula conceitual:
`saldo = saldo_inicial + entradas_liquidadas - saídas_liquidadas`.

Transferências: - conta de origem; - conta de destino; - valor; -
data; - descrição; - status.

Uma transferência cria duas pernas relacionadas (saída e entrada), mas
não é receita nem despesa. Impedir origem igual ao destino. As duas
pernas devem ser atômicas no servidor e reconciliáveis offline por um
único `operation_id`.

Ajustes de saldo devem ser lançamentos explícitos de ajuste, com motivo
e auditoria, nunca alteração silenciosa do saldo inicial.

## 8. Cartões de crédito

Cadastro: - nome/apelido; - instituição; - conta de pagamento
vinculada; - limite total; - dia de fechamento (1--31); - dia de
vencimento (1--31); - cor/ícone; - ativo/inativo.

O sistema calcula: - limite comprometido; - limite disponível
estimado; - fatura aberta; - faturas fechadas e futuras; - parcelas
futuras; - utilização percentual.

`limite disponível = limite total - compromissos ainda não liberados`,
considerando compras não canceladas e pagamentos/estornos efetivamente
reconhecidos. O método de liberação de limite após pagamento deve ser
configurável por política do produto e claramente indicado como
estimativa, pois emissores podem atualizar limites em momentos
diferentes.

### 8.1 Ciclo de fatura

A data de fechamento determina a fatura de destino. A regra precisa
tratar: - compras antes do fechamento; - compras no próprio dia de
fechamento; - compras depois do fechamento; - meses com menos dias que o
dia configurado; - ano bissexto; - compras lançadas retroativamente.

Regra padrão proposta: compra feita no dia de fechamento pertence à
fatura que está fechando, salvo se o usuário alterar explicitamente a
regra do cartão para "dia de fechamento pertence à próxima fatura". Essa
política deve ser configurável por cartão e documentada.

Se o dia configurado não existir no mês, utilizar o último dia do mês.

### 8.2 Faturas

Status: - aberta; - fechada; - parcialmente paga; - paga; - vencida; -
cancelada.

A fatura contém parcelas de compras atribuídas ao ciclo. O pagamento de
fatura: - seleciona conta de pagamento; - permite pagamento total ou
parcial; - gera saída de caixa na conta; - reduz obrigação da fatura; -
não gera despesa nova; - atualiza o limite conforme regra configurada; -
mantém vínculo e auditoria.

Estornos e créditos devem ser lançamentos próprios associados à
compra/fatura, não exclusões destrutivas.

## 9. Competência, caixa e comprometimento

A aplicação deve oferecer três perspectivas distintas:

1.  **Competência:** período em que a despesa é atribuída para análise
    de consumo. Para compras no crédito, a parcela pertence ao mês da
    fatura. Para débito/PIX/dinheiro, padrão é o mês da
    compra/pagamento, conforme configuração.
2.  **Caixa:** data em que o dinheiro efetivamente entrou ou saiu de uma
    conta.
3.  **Comprometimento:** obrigações futuras previstas, incluindo
    parcelas, contas e recorrências ainda não liquidadas.

A tela de relatórios deve identificar claramente a perspectiva ativa.
Não somar fatura e parcelas duas vezes.

## 10. Categorias

Categorias iniciais sugeridas: - Mercado; - Alimentação; - Delivery; -
Transporte; - Moradia; - Água e energia; - Internet e telefone; -
Saúde; - Educação; - Lazer; - Assinaturas; - Compras pessoais; -
Família; - Pets; - Impostos e taxas; - Serviços; - Outros.

Categorias devem ser editáveis, permitir subcategorias e possuir tipo
(despesa, receita ou ambos). O usuário pode marcar uma categoria como
essencial/não essencial. Categorias padrão podem ser copiadas para a
família no primeiro acesso.

## 11. Dashboard e análises

### 11.1 Dashboard principal

Exibir: - saldo consolidado das contas (caixa real); - receitas
recebidas no período; - despesas reconhecidas no período; - resultado do
período; - compromissos futuros; - faturas em aberto; - previsão de
saldo; - progresso do orçamento; - últimas movimentações; - alertas
importantes.

Distinguir visualmente "saldo nas contas" de "saldo livre estimado". O
saldo livre estimado deve descontar obrigações previstas ainda não pagas
e evitar dupla contagem.

### 11.2 Relatório mensal

Filtros: - mês; - ano; - família; - perspectiva (competência, caixa ou
comprometimento); - pessoa responsável; - categoria; - conta/cartão.

Indicadores: - receitas; - despesas; - resultado; - variação absoluta e
percentual vs. período anterior; - despesas fixas/variáveis; -
pagas/pendentes; - evolução mensal.

### 11.3 Visão acumulada

Desde o início do histórico: - receitas; - despesas; - resultado
acumulado; - evolução do saldo; - despesas por categoria; - evolução de
patrimônio líquido simplificado, se ativos e passivos forem cadastrados
em versão futura.

### 11.4 Categorias

-   ranking de despesas;
-   participação percentual;
-   comparação com mês anterior;
-   média móvel de 3 e 6 meses;
-   tendência;
-   filtro por pessoa.

### 11.5 Cartões

-   limite total;
-   limite utilizado;
-   limite disponível;
-   ocupação percentual;
-   fatura atual;
-   próximas faturas;
-   compras parceladas;
-   histórico.

### 11.6 Orçamentos e metas

Permitir: - orçamento geral mensal; - orçamento por categoria; - meta de
economia; - objetivo com valor-alvo e data; - alertas em 70%, 90% e
100%, configuráveis.

O cálculo do orçamento deve usar a mesma perspectiva de competência
escolhida e não misturar pagamentos de fatura com despesas originais.

## 12. Previsão financeira

Horizontes: 30, 60 e 90 dias, além de calendário diário.

Considerar: - saldos atuais; - receitas previstas e recorrentes; -
despesas recorrentes; - parcelas futuras; - faturas e vencimentos; -
contas pendentes; - transferências agendadas.

Exibir: - saldo projetado por data; - menor saldo previsto; - datas de
maior concentração de pagamentos; - itens incluídos no cálculo; - nível
de confiança (confirmado, previsto ou estimado).

Não incluir automaticamente média histórica de gastos variáveis na
projeção de caixa sem identificá-la como estimativa. Se houver
estimativa baseada em média, apresentar separadamente.

## 13. Linguagem natural

Disponibilizar campo de texto para frases como: - "Gastei 85 reais no
mercado no Nubank em 2 vezes." - "Paguei 32 reais de Uber no débito pelo
Banco do Brasil." - "Recebi meu salário de 3.500 reais." - "A conta de
internet de 120 reais vence dia 10 todo mês." - "Adicione leite, arroz e
café na lista do mercado."

O parser deve identificar: - intenção (despesa, receita, transferência,
item de lista); - valor; - descrição; - categoria; - data; - meio de
pagamento; - conta/cartão; - parcelas; - recorrência; - pessoa, se
explicitamente informada.

Fluxo obrigatório: 1. Interpretar. 2. Exibir resumo dos campos
detectados. 3. Destacar campos ausentes ou ambíguos. 4. Permitir
correção. 5. Confirmar antes de gravar.

Nunca salvar silenciosamente uma interpretação incerta. Se houver
ambiguidade entre cartões, datas ou valores, perguntar. Parser
local/determinístico é o fallback obrigatório. Integração com LLM é
opcional, substituível e nunca deve ser requisito para registrar
manualmente.

## 14. Listas de compras

Permitir: - criar listas por finalidade; - compartilhar em tempo real; -
adicionar item por formulário ou linguagem natural; - nome, quantidade,
unidade, preço estimado e observação; - marcar como comprado; -
registrar preço real; - comparar estimado x real; - finalizar lista; -
gerar uma despesa agregada vinculada à lista.

Não gerar despesa automaticamente apenas ao marcar itens como comprados.
Exigir confirmação de fechamento e valor final para evitar
contabilização indevida.

## 15. Alertas e notificações

Alertas dentro da aplicação: - fatura próxima do vencimento; - orçamento
em 70%, 90% e 100%; - saldo projetado negativo; - sincronização com
erro; - convite recebido; - meta atingida; - conta recorrente próxima do
vencimento.

Push notifications são evolução opcional e dependem de suporte/permissão
do navegador. A aplicação deve continuar funcional sem push.

## 16. Configurações

-   perfil;
-   família e membros;
-   moeda;
-   fuso horário;
-   primeiro dia do mês orçamentário;
-   regras de fechamento de cartões;
-   categorias;
-   preferências de alerta;
-   tema claro/escuro/sistema;
-   exportação;
-   política de sincronização;
-   informações sobre dados e privacidade.

## 17. Critérios de aceite funcionais

A versão só pode ser considerada funcional quando: 1. Dois usuários
conseguem acessar a mesma família com contas individuais. 2. Um
lançamento criado online aparece no outro dispositivo. 3. Um lançamento
offline é persistido localmente e sincroniza depois. 4. Retentativas não
duplicam registros. 5. Duas operações offline distintas são
consolidadas. 6. Conflitos de edição financeira não são descartados
silenciosamente. 7. Compras parceladas geram parcelas cuja soma é
exatamente o valor total. 8. Pagamento de fatura não duplica despesa. 9.
Transferências não alteram receitas/despesas consolidadas. 10. Saldo
bancário considera somente movimentações liquidadas. 11. Receitas
previstas não aumentam saldo real. 12. Relatórios identificam
competência, caixa ou comprometimento. 13. Recorrências não geram
ocorrências duplicadas. 14. O usuário consegue exportar os dados. 15.
Usuários de uma família não acessam dados de outra.

## 18. Fora do escopo da primeira versão

-   Open Finance e conexão automática com bancos;
-   pagamento de boletos ou faturas;
-   execução de PIX;
-   investimentos e carteira de ativos;
-   score de crédito;
-   leitura automática de e-mails bancários;
-   OCR obrigatório de notas fiscais;
-   IA generativa paga como dependência;
-   publicação obrigatória em lojas de aplicativos.

Esses recursos podem ser adicionados depois, sem comprometer a
arquitetura.
