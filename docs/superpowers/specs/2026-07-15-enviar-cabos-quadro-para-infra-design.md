# Enviar cabos do Quadro de Cargas para a aba Infraestrutura (Auto)

Data: 2026-07-15
Status: aprovado (aguardando revisão do spec)

## Objetivo

Permitir que o usuário selecione circuitos já calculados no **Quadro de Cargas**
(aba Cabos Elétricos) e os envie, com um botão, para a aba **Infraestrutura** no
modo **Auto (Buscar)** — onde o app já ranqueia qual infraestrutura física
(eletrocalha, leito, perfilado, aramado, eletroduto) comporta aqueles cabos
dentro do limite de ocupação da NBR 5410. Elimina a etapa manual de recolar o
memorial de cálculo entre uma aba e outra.

## Decisões de produto (confirmadas com o usuário)

1. **Escopo**: seleção por circuito (checkbox por linha + "selecionar todos"),
   não um envio único de tudo.
2. **Somar vs. substituir**: quando a aba Infraestrutura já tiver cabos, o app
   pergunta na hora — **Somar**, **Substituir** ou **Cancelar**. Lista vazia:
   pula a pergunta.
3. **Trifólio**: circuitos trifásicos unipolares chegam **pré-sugeridos como
   trifólio** na tela de revisão (mesmo comportamento do "Importar do memorial"),
   com toggle por ramal.
4. **Navegação**: ao confirmar o envio, o app **troca automaticamente** para a
   aba Infraestrutura em modo Auto, com o painel de importação já na tela de
   revisão. A busca em si (`Buscar melhor infraestrutura`) continua um clique
   manual.
5. **Alumínio**: adicionar o catálogo físico Corfio Alumínio XLPE 90°C, para que
   circuitos de alumínio também tenham diâmetro correto na ocupação.
6. **Cor**: cabos de alumínio desenhados com núcleo **prata/cinza**, distinto do
   núcleo cobre.

## Abordagem

Reaproveitar o pipeline de importação que já existe. A **designação** que a
tabela do Quadro exibe (`3#10mm²+1#10mm²+1#6mm²`, `1#4x16mm²+1#16mm²`) usa
exatamente a notação que `parseMemorial` (lib/importCables.js) já interpreta.
O envio gera "linhas de memorial" a partir dos circuitos selecionados e as
injeta no mesmo fluxo `parseMemorial → revisão de trifólio → confirmação`, que
já resolve detecção de trifólio e erros por linha.

Descoberta que ajusta o plano: a designação em texto **não carrega o material**.
Como o diâmetro externo do alumínio difere do cobre para a mesma seção, o
material precisa viajar **junto** do texto (fora dele). O estado-ponte passa a
ser `{ linhas, material }`, não texto puro.

Alternativa descartada: unificar o estado dos cabos entre as duas abas (levantar
`useCableTray` para o pai e chamar `addCable` direto). Evitaria a "textificação",
mas exigiria mexer em ~15 pontos onde a aba Infraestrutura lê esse hook, sem
mudar o resultado final. YAGNI.

## Arquitetura e fluxo de dados

```
QuadroCargasTab                 App.jsx                InfraTab            ImportarPlanilha
   (seleção +                 (activeTab +           (mode="buscar")     (revisão + import)
    "Enviar")   ──payload──▶  pendingImport)  ──────▶  repassa   ──────▶  pré-analisa e mostra
                                                        payload            tela de revisão
```

- **payload**: `{ linhas: string, material: "cobre" | "aluminio" }`.
  `linhas` = um `\n`-separado, cada linha no formato do memorial real
  `Nº\tTAG — descrição\tDESIGNAÇÃO`, para `guessLabel` pegar a TAG como rótulo e
  `parseMemorial` achar a designação pela célula que casa `/^\d+\s*#/`.

### Componentes tocados

- **src/data/corfioHEPR.js**
  - Novo export `corfioAluminio` (mesma forma de `corfioHEPR`: `unipolar` +
    `multipolar[2|3|4]`), com os diâmetros do PDF (ver tabela abaixo).
  - `getDiameter(section, type, vias)` ganha 4º parâmetro `material = "cobre"`.
    Seleciona `corfioAluminio` quando `material === "aluminio"`, senão `corfioHEPR`.
    Mensagem de erro passa a citar o material.

- **src/lib/importCables.js**
  - `parseMemorial(text, material = "cobre")` repassa `material` a `getDiameter`
    ao calcular o `d` de pré-visualização.

- **src/lib/quadroToMemorial.js** (novo, peça testável)
  - `circuitosParaLinhas(circuitos, resultados)` → string de linhas de memorial
    a partir dos circuitos selecionados (usa `designacaoCabos`, ignora os com
    `error`). Isola a geração do texto para teste de ida-e-volta.

- **src/hooks/useCableTray.js**
  - `addCable`/`addTrifolio`/`addCustomCable` passam a aceitar e armazenar
    `material` no objeto do cabo (default `"cobre"` — retrocompat. com projetos
    salvos e adição manual). `getDiameter` chamado com o material.
  - A chave de `groupedCables` (e o `removeGroup` correspondente) passa a
    incluir o `material`, para não fundir numa mesma linha um cabo de cobre e um
    de alumínio de mesma seção/tipo/vias. Cabos antigos sem material contam como
    `"cobre"`.

- **src/App.jsx**
  - Estado `pendingImport` (`{ linhas, material } | null`). Handler
    `enviarParaInfra(payload)` seta `pendingImport` e `activeTab = "infra"`.
    Passa `pendingImport` + `onConsumeImport` (limpa após consumido) ao `InfraTab`
    e `onEnviarParaInfra` ao `QuadroCargasTab`.

- **src/components/QuadroCargasTab.jsx**
  - Estado de seleção (`Set` de índices). Checkbox por linha (só em circuitos sem
    `error`) + checkbox "todos" no cabeçalho. Botão **"Enviar N p/ Infra (Auto)"**
    (desabilitado com 0 selecionados). Ao clicar: monta o payload via
    `circuitosParaLinhas` + `preset.material` e chama `onEnviarParaInfra`.

- **src/components/InfraTab.jsx**
  - `useEffect` sobre `pendingImport`: entra em `mode="buscar"` e repassa o
    payload ao `ImportarPlanilha`; chama `onConsumeImport` depois.

- **src/components/ImportarPlanilha.jsx**
  - Aceita prop `incoming` (`{ linhas, material } | null`): pré-preenche o texto,
    guarda o material e roda `handleAnalyze` automaticamente (cai na revisão).
  - Passa `material` a `parseMemorial` e às chamadas `onImport/onImportTrifolio`.
  - **Somar/Substituir**: recebe `existingCount` e `onReplaceAll`. No "Confirmar
    importação", se `existingCount > 0`, mostra painel inline (botões cobre
    **Somar** / **Substituir**, e **Cancelar**); "Substituir" chama `onReplaceAll`
    antes de adicionar. Vale para os dois caminhos (colado e enviado) — o import
    colado deixa de somar em silêncio.

- **src/components/TrayVisualization.jsx**
  - `Conductor` e o cabo multipolar recebem/propagam `material`; o núcleo usa
    `url(#aluminio-${uid})` (gradiente prata novo) quando `material === "aluminio"`,
    senão o gradiente cobre atual. Novo `<linearGradient id="aluminio-…">` em
    tons de prata/cinza. `stroke` do núcleo ajustado para o alumínio.

### Dados — Corfio Alumínio XLPE 90°C (diâmetro externo nominal, mm)

Unipolar: 10→7,7 · 16→8,7 · 25→10,5 · 35→11,6 · 50→13,6 · 70→15,5 · 95→17,6 ·
120→19,5 · 150→21,5 · 185→23,8 · 240→26,8
Multipolar 2 vias: 10→13,7 · 16→15,8 · 25→19,1 · 35→21,7
Multipolar 3 vias: 10→14,6 · 16→16,8 · 25→20,8 · 35→23,2
Multipolar 4 vias: 10→16,0 · 16→18,8 · 25→22,8 · 35→25,8

Limites do catálogo de alumínio: unipolar 10–240mm²; multipolar só 2/3/4 vias e
só 10–35mm² (sem 5 vias, sem seções < 10). Fora disso, `getDiameter` falha e a
tela de revisão exibe o aviso por ramal (degradação suave).

## Tratamento de erros e casos de borda

- **Circuito com erro de cálculo**: não selecionável (sem checkbox).
- **Seção/via fora do catálogo físico** (ex.: alumínio multipolar > 35mm²):
  `getDiameter` lança, `parseMemorial` marca o spec com erro, a revisão mostra
  o aviso e segue com os demais ramais.
- **Condutores em paralelo (porFase > 1)**: chegam como N condutores soltos —
  quantidade e área corretas; **sem** agrupamento automático em múltiplos
  trifólios (o parser só sugere trifólio em grupos de exatamente 3). Limitação
  conhecida da v1.
- **Nenhum circuito válido selecionado**: botão de envio desabilitado.
- **Aba Infra vazia**: pula a pergunta somar/substituir (só adiciona).

## Testes

Motor de cálculo intocado — os 65 testes atuais seguem valendo.

Novos testes de unidade (Vitest):
- **quadroToMemorial**: para cada tipo de circuito (unipolar mono/tri, multipolar,
  com/sem neutro, com/sem terra, paralelo, alumínio), a linha gerada, ao passar
  de volta por `parseMemorial`, reproduz a quantidade, seção, tipo e vias
  esperados (teste de ida-e-volta).
- **getDiameter alumínio**: retorna os diâmetros do catálogo para
  unipolar/multipolar de alumínio e lança nos gaps (ex.: alumínio 5 vias,
  alumínio unipolar 4mm², alumínio multipolar 50mm²).
- **parseMemorial com material**: o `d` de pré-visualização usa o diâmetro do
  material passado (cobre vs. alumínio para a mesma seção).

UI (checkbox, troca de aba, painel somar/substituir, cor prata) — verificação
manual no navegador nos dois temas.

## Fora de escopo (v1)

- Rodar a busca de infraestrutura automaticamente após o envio (fica manual).
- Agrupar condutores em paralelo em múltiplos trifólios automaticamente.
- Seletor de material no import por colagem (colar assume cobre).
- Persistir/rotular qual circuito originou cada cabo na aba Infraestrutura.
