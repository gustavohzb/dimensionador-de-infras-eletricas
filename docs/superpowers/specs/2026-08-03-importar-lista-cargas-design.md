# Importar lista de cargas — aba Cabos Elétricos

**Data:** 2026-08-03 · **Status:** aprovado pelo Gustavo

## Problema

Inserir uma lista de cargas no Quadro de Cargas é circuito a circuito: clicar
"+ circuito", preencher, repetir. Para listas que já existem numa planilha
(uma ou duas colunas com potências, às vezes mais), isso é lento. O formato
das listas varia de projeto para projeto.

## Solução

Um botão **"Importar lista"** no cabeçalho do Quadro de Cargas (ao lado de
"+ circuito") abre um painel de colagem → análise → correção → confirmação,
no mesmo padrão do importador da aba Infraestrutura (`ImportarPlanilha`).

### Entrada

- Área de texto que aceita o que o Excel gera ao copiar células (colunas
  separadas por TAB), além de `;` como separador e coluna única.
- Vírgula decimal aceita ("3,7").
- Linhas vazias são ignoradas.

### Detecção de colunas + correção manual

Ao analisar, cada coluna é classificada automaticamente. A prévia mostra um
**seletor no topo de cada coluna** para corrigir a classificação. Papéis:

| Papel | Detecção automática |
|---|---|
| Descrição | células com texto |
| TAG | texto curto no padrão `XX-99` (ex.: `AL-03`, `QF-12`) |
| Potência | número; se a célula traz unidade escrita ("15 CV", "3,7 kW", "500 W", "10 kVA"), a unidade é lida da própria célula |
| Tensão (V) | coluna cujos valores são só 127/220/380/440/660 |
| Distância (m) | coluna numérica que não se encaixou como potência nem tensão |
| Corrente (A) | **sem detecção automática** — só mapeável à mão, para não confundir com potência; cria o circuito em modo corrente |
| Ignorar | qualquer coluna que não interessa |

- Se a primeira linha for cabeçalho ("Descrição", "Potência", "kW",
  "Distância"…), serve de dica para o mapeamento e não vira circuito.
- A coluna Tensão ajusta **só o número** da tensão; o esquema
  (mono/trifásico) vem sempre do padrão do lote — "220" sozinho não diz se é
  fase-neutro ou trifásico.

### Padrões do lote

Linha de padrões acima da prévia, preenchendo o que a lista não traz:

- unidade da potência (CV/kW/W/kVA) — usada quando a célula tem só número;
- esquema + tensão;
- distância do trecho;
- forma de partida.

Regra de precedência: **coluna vence padrão do lote, que vence default do
formulário**. Campos que o painel não pergunta (rendimento, fator de
serviço, conduto do trecho…) usam os defaults de `defaultCircuito()` /
`defaultTrecho()`.

**Só a potência é obrigatória** (ou corrente, se mapeada). O caso mínimo é
uma coluna só de números + padrões do lote.

### Confirmação

- A prévia mostra linha a linha o circuito que será criado.
- Linha sem número aproveitável vira aviso em vermelho e é pulada — não cria
  circuito quebrado.
- Se o quadro já tem circuitos, pergunta **somar ou substituir** (mesmo
  padrão do `ImportarPlanilha`).
- TAGs: usa a coluna TAG quando mapeada; senão gera `AL-NN` sequencial via
  `proximoNumero`, sem colidir com as existentes.
- Depois de importado, cada circuito é um circuito normal do quadro —
  editável como qualquer outro.

## Arquitetura

- **`src/lib/importCargas.js`** — parser e detecção, puro (sem React):
  separar linhas/colunas, classificar colunas, ler unidade da célula,
  montar os objetos de circuito a partir de mapeamento + padrões do lote.
- **`src/components/cabos/ImportarCargas.jsx`** — painel que orquestra
  colar → analisar → corrigir → confirmar; chama de volta o
  `QuadroCargasTab` para inserir os circuitos.
- **`QuadroCargasTab.jsx`** — botão "Importar lista" e o callback de
  inserção (somar/substituir + seleção do primeiro importado).

## Testes (Vitest, `src/lib/importCargas.test.js`)

- TSV de 2 colunas (descrição + potência);
- coluna única de números;
- unidades misturadas na mesma lista ("15 CV" e "3,7 kW");
- vírgula decimal;
- linha de cabeçalho detectada e usada como dica;
- coluna de tensão detectada (valores 127/220/380/440/660);
- linha sem número → aviso, não circuito;
- precedência coluna > padrão do lote > default;
- TAGs geradas sem colidir com as existentes.

## Fora de escopo

- Upload de arquivo `.xlsx`/`.csv` (o colar cobre o caso).
- Detecção automática de coluna de corrente.
- Inferir esquema mono/trifásico a partir da tensão.

## Entrega

Fluxo de sempre: branch, testes, verificação no navegador, merge `--no-ff`
em master, push, apagar a branch. Entrada nova no changelog: **1.18.0 —
"Importar lista de cargas"**, tipo Novidade.
