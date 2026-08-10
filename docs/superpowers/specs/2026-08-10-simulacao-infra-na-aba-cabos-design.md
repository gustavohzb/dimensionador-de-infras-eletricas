# Simulação de infraestrutura dentro da aba Cabos Elétricos

Data: 2026-08-10

## Problema

Hoje, para ver em que infraestrutura os circuitos dimensionados cabem, o usuário
marca os circuitos no quadro de cargas, clica em **Enviar p/ Infra (Auto)** e é
jogado para outra aba. Lá ainda precisa confirmar a revisão de trifólio, clicar
em *Buscar melhor infraestrutura* e clicar em *Ver* — três cliques e uma troca
de contexto depois do botão. Ao voltar para o quadro, perdeu o desenho.

Além disso, o desenho resultante não diz **quais circuitos** estão ali dentro:
sai uma seção de eletrocalha com sete círculos e nenhuma referência às TAGs.

## Objetivo

Rodar a simulação na própria aba Cabos Elétricos, com o desenho identificando
os circuitos que compõem o trecho, sem perder o acesso ao que só a aba
Infraestrutura oferece.

## Decisões tomadas

| Assunto | Decisão |
|---|---|
| Escopo do painel | Enxuto: busca, lista de opções, desenho e ocupação. Sem Projetos, sem adicionar cabo à mão, sem derating, sem Relatório PDF |
| Identificação dos circuitos | Legenda em lista ao lado do desenho, **dentro do SVG**. Nenhuma marcação sobre os cabos |
| Ponte antiga | Mantida como saída secundária: link *Abrir na aba Infraestrutura* dentro do painel |
| Trifólio | Assumido (padrão de hoje), com caixinha por circuito na legenda para desmarcar |
| Tipos de infraestrutura | Filtro no painel, já aberto no conduto que os circuitos declaram |
| Ocupação no desenho | Não. Fica só na barra do `OccupancyMeter`, abaixo |

### Por que legenda em lista, e não marcação nos cabos

Foram comparados anel colorido por circuito, número impresso dentro do cabo,
contorno tracejado com chamada, e as combinações. A legenda em lista venceu
porque o desenho responde *"cabe?"* e a lista responde *"o que tem aqui?"* —
são perguntas separadas, e amarrar uma na outra custa poluição visual sem
resolver nada que o usuário tenha pedido.

Limitação aceita conscientemente: se dois circuitos usarem cabos idênticos, não
há como dizer qual círculo do desenho pertence a qual circuito. Se isso vier a
incomodar, o anel colorido é a evolução natural — a legenda já tem a estrutura
por circuito para receber o marcador.

### Por que o filtro de tipo nasce no conduto dos circuitos

Os ids de `CONDUTOS` (`src/data/cabosNBR5410.js`) coincidem com os de
`INFRA_TYPES` (`src/data/corfioHEPR.js`) para `eletrocalha`, `perfilado`,
`leito` e `eletroduto`. O `condutoId` de cada trecho é o que definiu o método
de referência (B1/B2/E/F) e o fator de agrupamento que dimensionaram aquele
cabo. Sugerir um eletroduto para um circuito dimensionado como eletrocalha é
incoerente com a própria conta que gerou o cabo.

Sem o filtro haveria ainda um segundo problema: `findBestFits` ordena por menor
área útil, e um eletroduto de bitola pequena quase sempre ganha de qualquer
bandeja. A opção aplicada automaticamente seria um eletroduto na maioria dos
trechos.

## Arquitetura

### `src/lib/simulacaoTrecho.js` (novo, puro)

```js
circuitosParaCabos({ circuitos, resultados, selecionados, material, semTrifolio })
  → { cabos, itens, avisos }
condutoPredominante(circuitos) → "eletrocalha" | "perfilado" | "leito" | "eletroduto" | null
ocupacaoAplicada(cables, applied) → { trayArea, cableArea, ocupacao, limite, dentroLimite }
```

**`circuitosParaCabos`** recebe os arrays **completos** do quadro mais
`selecionados`, um array de índices. Trabalhar com os índices originais (em vez
de receber os arrays já filtrados) é o que permite numerar a legenda pela
posição real na tabela. `semTrifolio` é um `Set` no mesmo espaço de índices.

Para cada índice selecionado, chama `designacaoCabos`, passa a string por
`parseSecao` e resolve o diâmetro com `getDiameter`. Circuitos com
`resultado.error` ou sem designação são ignorados e viram entrada em `avisos`.

Isso substitui o caminho atual `circuitosParaLinhas` → `parseMemorial`, que
serializa os circuitos para texto tabulado só para reparsear em seguida. O
`circuitosParaLinhas` **continua existindo**, porque é o que a ponte para a aba
Infraestrutura usa.

Um grupo unipolar de exatamente 3 condutores iguais (o que `parseSecao` marca
como `canBeTrifolio`) vira um cabo com `trifolio: true`, salvo quando o índice
do circuito estiver em `semTrifolio`.

`itens` é a legenda pronta, um objeto por circuito aproveitado:

```js
{ numero, tag, descricao, designacao, podeTrifolio }
```

`numero` vem do índice do circuito **no quadro inteiro**, não da posição dentro
da seleção, para bater com a coluna Nº da tabela.

**`condutoPredominante`** varre os `trechos` de todos os circuitos recebidos.
Devolve o `condutoId` se todos concordarem **e** ele existir em `INFRA_TYPES`;
caso contrário `null`. Condutos sem equivalente na simulação (`canaletaEmb`,
`dutoSubt`, `canaletaSubt`) caem no `null`, e o painel abre em *Todos* com um
aviso.

**`ocupacaoAplicada`** é o `liveOccupancy` do `InfraTab` extraído como função
pura, incluindo o ramo do septo divisor. Passa a ser testável e some da
`InfraTab`.

### `src/hooks/useBuscaInfra.js` (novo)

A máquina de estados da busca, hoje solta dentro do `InfraTab`:

```js
const { results, displayResults, applied, searching, layerHint,
        maxLayers, setMaxLayers, infraType, setInfraType,
        buscar, aplicar, limpar } = useBuscaInfra();
```

`buscar(cables)` mantém o `setTimeout(…, 10)` que existe hoje para o botão
conseguir renderizar em *"Buscando…"* antes do cálculo síncrono.

O filtro `infraType` é aplicado **sobre o array devolvido por `findBestFits`,
antes de `selectDiverseResults`** — `reverseSearch.js` não é tocado. Valor
`null` significa todos os tipos.

**O `InfraTab` passa a consumir esse hook**, para não existirem duas cópias da
lógica de busca. É o único ponto de risco de regressão da mudança, e por isso a
verificação no navegador cobre as duas abas.

### `TrayVisualization` — prop `legenda`

Nova prop opcional:

```jsx
legenda={[{ numero, tag, descricao, designacao }, …]}
```

Ausente, nada muda: os dois usos atuais na aba Infraestrutura renderizam byte a
byte o que renderizam hoje — e como a aba Infra não conhece circuitos, ela
nunca passa a prop.

Presente, um `<g>` à direita do desenho, **dentro do SVG**, e não em HTML
abaixo dele. O motivo é o `exportPNG`: ele serializa apenas o elemento `<svg>`,
então a `CableLegend` de vias (HTML) nunca saiu na imagem exportada. Uma
legenda de circuitos em HTML teria o mesmo destino.

Precisa funcionar nos dois ramos de renderização, retangular e circular — o
eletroduto continua sendo um resultado possível.

Ajustes de layout quando a legenda está presente:

- viewBox alargado por uma constante de largura da legenda
- altura do SVG = maior entre a altura do desenho e a da legenda
- `style.width` maior que os 520/420 atuais
- cores respeitando a prop `dark` já existente

SVG não quebra linha sozinho. Descrições longas são truncadas por orçamento de
caracteres, com reticências. É uma aproximação (a fonte não é monoespaçada), e
está aceito: errar por truncar cedo demais é melhor do que a descrição vazar
por cima da designação.

### `src/components/cabos/SimulacaoTrecho.jsx` (novo)

```jsx
<SimulacaoTrecho
  circuitos={circuitos} resultados={resultados}
  selecionados={selEnvio} preset={preset}
  onAbrirNaInfra={enviarSelecionados}
/>
```

Estado próprio: `semTrifolio` (Set de índices de circuito) e o aviso de
desatualizado. O resto vem do `useBuscaInfra`.

Layout, de cima para baixo:

1. Cabeçalho: título, seletor **Tipo**, seletor **Máximo de camadas**, botão
   **Exportar PNG**
2. Lista de opções encontradas, com a aplicada marcada `Visualizando ✓`
3. `TrayVisualization` com a `legenda`
4. `OccupancyMeter`, mais o aviso vermelho de "já não cabem" que a aba Infra já
   tem
5. Rodapé: caixinhas de **trifólio** por circuito elegível e o link
   **Abrir na aba Infraestrutura →**

Ao montar, roda a busca e aplica o primeiro resultado — o desenho aparece sem
clique nenhum a mais.

#### Quando a busca re-roda

`findBestFits` testa da ordem de 240 layouts, e o painel fica logo acima do
formulário de edição de circuito. Re-rodar a cada tecla digitada num campo de
potência não é aceitável.

- **Desenho e ocupação:** sempre ao vivo, derivados do estado atual.
- **A busca:** re-roda sozinha ao mexer nos controles do painel — tipo, máximo
  de camadas, trifólio, seleção de circuitos.
- **Edição de um circuito que mude a designação de cabos:** não dispara busca.
  Aparece o aviso *"os cabos mudaram — re-simular"* com o botão.

A detecção usa uma assinatura serializada do conjunto de cabos
(`section`, `type`, `vias`, `trifolio`), comparada com a assinatura vigente
quando a última busca rodou.

### `QuadroCargasTab`

- O botão `Enviar p/ Infra (Auto)` vira `Simular infraestrutura`, com contagem
  quando há seleção (`Simular 3 circuitos`). Alterna a abertura do painel.
- O painel entra logo após o card do quadro, no mesmo slot condicional que o
  `ImportarCargas` já ocupa.
- `onAbrirNaInfra` chama o `enviarSelecionados` que já existe — a ponte
  (`onEnviarParaInfra` → `App.pendingImport` → `InfraTab` → `ImportarPlanilha`)
  não é alterada.

## Tratamento de erro

| Situação | Comportamento |
|---|---|
| Nenhum circuito marcado | Botão desabilitado, como hoje |
| Circuito marcado com erro de cálculo | Já não é marcável hoje (`enviaveis`); `circuitosParaCabos` ignora e registra em `avisos` por garantia |
| `getDiameter` não acha a bitola | O circuito entra em `avisos` e fica fora do desenho; os demais simulam normalmente |
| Nenhuma infraestrutura comporta os cabos | Mesmas duas mensagens da aba Infra: a de limite de camadas (com a dica de camada mínima) e a de "nenhuma cadastrada comporta" |
| Filtro de tipo sem nenhum resultado | Mensagem dizendo que aquele tipo não comporta, sugerindo *Todos* |
| Condutos divergentes entre os circuitos | Filtro abre em *Todos* com aviso de que os circuitos declaram condutos diferentes |
| Cabos mudaram depois da busca | Aviso "re-simular" (ver acima) |

## Testes

**Unitários (vitest), em `src/lib/simulacaoTrecho.test.js`:**

- `circuitosParaCabos`: trifólio assumido; trifólio desmarcado vira 3 unipolares
  soltos; circuito com `error` ignorado e registrado em `avisos`; material
  alumínio muda o diâmetro; `numero` da legenda é o índice no quadro
- `condutoPredominante`: todos concordam; trechos divergentes dentro do mesmo
  circuito; circuitos divergentes entre si; conduto sem equivalente em
  `INFRA_TYPES`
- `ocupacaoAplicada`: caso simples; eletroduto (área circular); com septo
  divisor (o pior ocupado e o menor limite entre os dois compartimentos)

**No navegador:**

- Aba Cabos: marcar circuitos, abrir o painel, conferir que o desenho aparece de
  primeira, a legenda traz as TAGs certas e o filtro abre no conduto declarado
- Desmarcar trifólio e ver a re-simulação
- Editar um circuito e ver o aviso de "re-simular" em vez de busca automática
- Exportar PNG e confirmar que a legenda saiu na imagem
- Um trecho que caia em eletroduto, para exercitar o ramo circular da legenda
- **Regressão na aba Infra:** os dois modos (Manual e Auto), a busca, o *Ver*, a
  ocupação, o septo divisor e a ponte vinda do quadro

## Fora de escopo

- Marcação dos circuitos sobre os cabos no desenho (anel colorido) — a legenda
  fica preparada para receber o marcador se vier a ser necessário
- Projetos, adicionar cabo à mão, painel de derating e Relatório PDF dentro do
  painel enxuto — continuam na aba Infraestrutura, a um clique pelo link
- Alterar `reverseSearch.js`, o motor de empacotamento ou o dimensionamento
- Quebra de linha real na legenda do SVG
