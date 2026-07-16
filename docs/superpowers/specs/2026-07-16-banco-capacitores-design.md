# Aba Capacitores — cálculo de banco de capacitores

Data: 2026-07-16
Status: aprovado, pronto para plano de implementação
Origem: planilha `CAPAC-380 PARA 440.xlsx` (dump completo célula a célula, com fórmulas)

## Problema

O dimensionamento de banco de capacitores hoje vive numa planilha Excel: correção
da potência quando o capacitor opera abaixo da tensão nominal, corrente e
disjuntor por estágio, e a régua de 33% da potência do trafo. A feature traz esse
cálculo para uma aba própria do app, com a planilha original servindo de fixture
de teste.

## A física da planilha

Um capacitor entrega potência proporcional ao quadrado da tensão aplicada:

- **Correção de tensão:** `kvarReal = kvarNominal × (vRede/vCapacitor)²`.
  380/440 dá fator ≈ 0,746 — um banco de 659,2 kvar nominais vira 491,7 kvar reais.
- **Corrente por estágio:** `I = kvarReal × 1000 / (vRede × √3)`.
- **Disjuntor do estágio:** `I × 1,63` (sobrecorrente permanente de capacitor:
  harmônicas + tolerância de +10% na tensão; IEC exige ≥ 1,35, 1,63 é usual).
- **Disjuntor geral:** `ΣI × 1,25`.
- **Régua do trafo:** banco ≈ 33% da potência do trafo (percentual editável).

## Decisões

| Decisão | Escolha |
|---|---|
| Tensões | Configuráveis (defaults 380 rede / 440 capacitor); iguais ⇒ fator 1 |
| Estágios | Lista dinâmica, 1 ou 2 células por estágio |
| Potências de célula | Dropdown consolidado de mercado + "Outra..." (campo livre); sem seletor de fabricante |
| Bloco do trafo | Opcional; alvo % editável (default 33%); veredito alvo × montado |
| Disjuntores | Corrente × fator + arredondamento para escala comercial; fatores editáveis (defaults 1,63 / 1,25) |
| Persistência / PDF | Fora desta versão |

## Arquivos

### `src/data/capacitores.js` (novo)

```js
// Consolidado ABB CLMD / WEG UCWT / Siemens (catálogos 440V); 33,7 vem da
// prática da planilha de origem. "Outra..." na UI abre campo livre.
export const POTENCIAS_CELULA = [5, 7.5, 10, 12.5, 15, 16.7, 20, 25, 30, 33.3, 33.7, 35, 40, 50];

// Escala comercial de disjuntores (A).
export const DISJUNTORES = [10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125,
  150, 160, 175, 200, 225, 250, 300, 320, 350, 400, 500, 630, 800, 1000, 1250];
```

### `src/lib/capacitorBank.js` (novo)

Motor puro. Assinatura única:

```js
calcularBanco({
  vRede: 380,
  vCapacitor: 440,
  fatorDisjEstagio: 1.63,
  fatorDisjGeral: 1.25,
  estagios: [{ celulas: [33.7, 33.7] }, ...],  // kvar @ vCapacitor
  trafo: { kva: 1500, percentualAlvo: 33 } | null,
})
```

Devolve por estágio: `kvarNominal`, `kvarReal`, `corrente`, `disjCalculado`,
`disjComercial` (próximo degrau de DISJUNTORES; `null` + flag se estourar a
escala — nunca inventa degrau). Totais: `kvarNominalTotal`, `kvarRealTotal`,
`correnteTotal` (soma das correntes de estágio, como a planilha),
`disjGeralCalculado`, `disjGeralComercial`. Trafo (se informado): `alvoKvar`,
`percentualAtingido` (= kvarRealTotal / kva × 100).

### `src/lib/capacitorBank.test.js` (novo)

A planilha inteira como fixture — 8 estágios de 2×33,7 + 4 de 1×30 kvar,
380/440, trafo 1500 kVA a 33%, reproduzindo os valores dela:

| Grandeza | Valor da planilha |
|---|---|
| kvar nominal total | 659,2 |
| kvar real total | 491,68 (D5 = 491,676...) |
| kvar real estágio 2×33,7 | 50,2715 |
| Corrente estágio 2×33,7 | 76,3796 A |
| Disj. estágio 2×33,7 | 124,499 A → 125 A comercial |
| kvar real estágio 1×30 | 22,376 |
| Corrente estágio 1×30 | 33,9969 A |
| Disj. estágio 1×30 | 55,415 A → 63 A comercial |
| Corrente total | 747,024 A |
| Disj. geral | 933,78 A → 1000 A comercial |
| Alvo trafo | 495 kvar; atingido = 32,78% |

Bordas: tensões iguais (fator 1, kvarReal = kvarNominal); estágio de 1 célula;
`trafo: null` (bloco ausente do retorno); corrente acima de 1250 A
(disjComercial null + flag); lista de estágios vazia (totais zerados, sem NaN).

### `src/components/CapacitoresTab.jsx` (novo)

Duas colunas, padrão do app (entradas à esquerda, resultados à direita):

**Parâmetros:** tensões (380/440), fator `(vRede/vCapacitor)²` exibido em
destaque; fatores de disjuntor com tooltip da origem; trafo opcional (kVA +
alvo %) — vazio, a seção de veredito não aparece.

**Estágios:** dropdown 1/2 células; dropdown(s) de potência com
POTENCIAS_CELULA + "Outra..." (abre input numérico); campo "repetir N×";
botão "+ estágio". Lista com remover individual.

**Resultados:** tabela mono/tabular `# · kvar @vCap · kvar @vRede · corrente ·
disjuntor (calculado → comercial)`; linha de totais cobre com disjuntor geral;
veredito do trafo em pill — verde quando `percentualAtingido` está dentro de
±10% relativos do alvo (alvo 33% ⇒ verde entre 29,7% e 36,3%), âmbar fora.

### `src/App.jsx` (alterado)

Registro da aba "Capacitores" entre "Cabos Elétricos" e "Sobre": botão no
header + render sempre montado, escondido via CSS (`className="hidden"`),
padrão das outras abas. Nenhum outro arquivo muda — a aba não toca em
useCableTray, ocupação nem Quadro de Cargas.

## Adendo (2026-07-16): placa de montagem + remover todos

Aprovado após a entrega inicial:

- **Botão "remover todos"** no cabeçalho do painel Estágios, padrão do
  "Cabos do trecho".
- **Vista superior da placa de montagem** (novo painel na coluna de
  resultados): células como **círculos** — o catálogo WEG confirma que as
  unidades UCW/UCWT são todas cilíndricas (Ø×H; em 480V: 7,5–15 kvar ≈ Ø75mm,
  17,5–25 kvar ≈ Ø84mm). Campos editáveis com defaults: Ø célula 85mm,
  espaçamento 40mm, margem 50mm, células por fileira 6. Layout automático em
  grade na ordem dos estágios (células do mesmo estágio adjacentes), e a
  **placa mínima calculada** com cotas: `L = 2×margem + n×Ø + (n−1)×esp` por
  eixo. Motor de layout em `src/lib/plateLayout.js` (puro, testado: contagem
  de células, quebra de fileira, dimensões, posições dentro da placa).
  Persistência dos campos junto do estado da aba (capacitores.v1).

## Verificação

Branch `feat-banco-capacitores`.

- `npm test` — a fixture da planilha é o teste-chave (26 números).
- `vite build` limpo.
- Navegador: montar o banco da planilha (8×2×33,7 + 4×1×30) via "repetir N×"
  e conferir totais na tela; "Outra..." com valor livre; trafo vazio; tensões
  iguais mostrando fator 1.
