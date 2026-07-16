# Eletroduto de aço inox — Schedule 10 e 40

Data: 2026-07-16
Status: aprovado, pronto para plano de implementação

## Problema

O app oferece quatro catálogos de eletroduto, todos de aço-carbono galvanizado ou
PEAD (NBR 5597, 5598, 5624, 15715). Falta o eletroduto de aço inoxidável, usado
em ambientes de maresia, atmosfera corrosiva, hospitais e indústria alimentícia.
Sem ele, um projeto nesses ambientes não pode ser dimensionado no app.

## Normativa

O inox não é coberto pelas NBRs já cadastradas — todas são de aço-carbono. O
eletroduto de inox segue duas normas americanas, complementares:

- **ASTM A312** — o tubo: material (TP304/304L, TP316/316L), com ou sem costura.
- **ASME/ANSI B36.19** — as dimensões da série Schedule: Ø externo e espessura de
  parede por bitola (séries 10S e 40S).

A Elecon declara fabricação conforme ASTM A312, em barras de 3 m, rosca BSP
(Sch 10) ou BSP/NPT (Sch 40). Os valores de parede do catálogo batem exatamente
com as séries 10S e 40S da B36.19 — validação cruzada da tabela.

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Inox participa da busca Auto? | **Sim**, como as demais normas | Consistência; o usuário quer que a Auto dimensione a bitola do inox |
| Rótulo no toggle | **`Inox A312 Sch 10`** / **`Inox A312 Sch 40`** | Mantém a norma visível no rótulo, coerente com os vizinhos |
| Faixa de bitolas | **Seguir o catálogo Elecon** — Sch 10 até 2", Sch 40 até 4" | Precedente do código (NBR 5624 para em 4"); não sugerir o que não se compra |
| Estrutura | **Duas entradas no cadastro existente** | Os consumidores já são orientados a dados; modelar "material" como eixo próprio seria refatoração não solicitada |

## Dados

Fonte: catálogo Elecon (`elecon.com.br/produto/eletrodutos-rigidos/`), conferido
contra ASME B36.19. Como nas NBR 5597/5598, declara-se `od` e `wall`; o `id`
(diâmetro interno) é derivado por `od − 2×wall` no `.map` final.

### `INOX_SCH10_SIZES` — rosca BSP, 1/2" a 2"

| Bitola | DN | Ø ext (mm) | Parede (mm) | Ø int (mm) |
|---|---|---|---|---|
| 1/2" | 15 | 21,3 | 2,11 | 17,1 |
| 3/4" | 20 | 26,7 | 2,11 | 22,5 |
| 1" | 25 | 33,7 | 2,77 | 28,2 |
| 1.1/4" | 32 | 42,4 | 2,77 | 36,9 |
| 1.1/2" | 40 | 48,3 | 2,77 | 42,8 |
| 2" | 50 | 60,3 | 2,77 | 54,8 |

### `INOX_SCH40_SIZES` — rosca BSP e NPT, 1/2" a 4"

| Bitola | DN | Ø ext (mm) | Parede (mm) | Ø int (mm) |
|---|---|---|---|---|
| 1/2" | 15 | 21,3 | 2,77 | 15,8 |
| 3/4" | 20 | 26,7 | 2,87 | 21,0 |
| 1" | 25 | 33,7 | 3,38 | 26,9 |
| 1.1/4" | 32 | 42,4 | 3,56 | 35,3 |
| 1.1/2" | 40 | 48,3 | 3,68 | 40,9 |
| 2" | 50 | 60,3 | 3,91 | 52,5 |
| 2.1/2" | 65 | 73,0 | 5,16 | 62,7 |
| 3" | 80 | 88,9 | 5,49 | 77,9 |
| 4" | 100 | 114,3 | 6,02 | 102,3 |

### Notas de engenharia

O Sch 10 tem parede fina e é o eletroduto mais folgado do app: 2" dá 54,8 mm de
Ø interno, contra 54,3 da NBR 5598, 54,2 da 5624 e 53,6 da 5597. O Sch 40 é tubo de pressão e
é o mais apertado: 2" dá 52,5 mm. Consequência esperada na busca Auto — o Sch 10
aparece bem posicionado, o Sch 40 fica atrás e às vezes exige uma bitola acima do
galvanizado equivalente. É o resultado fisicamente correto, não um defeito.

O Ø externo de 1" é 33,7 mm, mesmo valor já usado pelas NBR 5597/5598 no app (a
B36.10 genérica usaria 33,4; a Elecon padroniza 33,7 nos dois catálogos).

## Implementação

Um único arquivo de produção muda: **`src/data/corfioHEPR.js`**.

1. Adicionar `INOX_SCH10_SIZES` e `INOX_SCH40_SIZES` após `NBR5598_SIZES`, no
   mesmo formato `{ bitola, dn, od, wall }` + `.map((s) => ({ ...s, id: +(s.od - 2 * s.wall).toFixed(1) }))`.
   Comentário de fonte no padrão das vizinhas, citando Elecon, ASTM A312 e
   ASME B36.19, e registrando que o Sch 10 para em 2" porque é onde o catálogo para.

2. Registrar em `DUCT_SIZES_BY_NORMA`:
   ```js
   inoxSch10: INOX_SCH10_SIZES,
   inoxSch40: INOX_SCH40_SIZES,
   ```

3. Acrescentar ao fim de `ELETRODUTO_NORMAS` (após o PEAD, preservando a ordem atual):
   ```js
   { id: "inoxSch10", label: "Inox A312 Sch 10" },
   { id: "inoxSch40", label: "Inox A312 Sch 40" },
   ```

### Por que nada mais muda

- `getDimensions("eletroduto", norma)` resolve a tabela por `DUCT_SIZES_BY_NORMA[norma]`
  e devolve `{ kind: "duct", sizes, default }`; o `default` sai de `sizes[1]` — 3/4"
  nas duas tabelas novas, coerente com as demais.
- `InfraSelector` renderiza `ELETRODUTO_NORMAS` direto. Com 6 opções o `ToggleGroup`
  cai no `grid-cols-2` (o `grid-cols-3` só vale para exatamente 3 opções), virando
  três linhas de dois botões. Sem mudança de layout.
- `reverseSearch.findBestFits` itera `ELETRODUTO_NORMAS` e monta o label como
  `Eletroduto ${norma.label} ${size.label}`. `selectDiverseResults` agrupa por
  `eletroduto-${norma.id}`, então cada schedule ganha suas próprias 2 sugestões
  sem competir com o galvanizado pelo mesmo slot.
- `TrayVisualization` obtém o label por `ELETRODUTO_NORMAS.find`.
- `useCableTray.setEletrodutoNorma` já reajusta a bitola ao trocar de norma —
  relevante aqui: sair do Sch 40 4" para o Sch 10 (que não tem 4") cai no default
  sem quebrar.
- `useProjects` persiste `eletroduto_norma` como string; projetos antigos continuam
  abrindo e os novos salvam o inox sem migração.

### Efeito colateral aceito

A busca Auto passa a testar 6 catálogos de eletroduto em vez de 4, alongando a
lista de resultados em até 4 linhas. É consequência direta da decisão de incluir
o inox na Auto.

## Testes

Novo arquivo **`src/data/eletrodutoInox.test.js`**, no padrão do
`corfioAluminio.test.js`: valores escritos à mão a partir do catálogo, nunca
copiados do código.

- **Ø interno derivado** — as 15 linhas das tabelas acima; confirma de passagem
  que o `.map(od − 2×wall)` foi aplicado.
- **Faixa de bitolas** — Sch 10 tem exatamente 6 bitolas terminando em 2"; Sch 40
  tem 9 terminando em 4". Trava a decisão de seguir o catálogo.
- **`getDimensions("eletroduto", "inoxSch10")`** devolve `kind: "duct"`, 6 tamanhos
  e default 3/4".
- **Sch 10 ⊃ Sch 40** — para toda bitola comum, o Ø interno do Sch 10 é maior que o
  do Sch 40. Invariante físico (parede mais fina); pega inversão de tabelas.
- **`findBestFits` inclui inox** — com um conjunto de cabos, os resultados contêm
  `eletrodutoNorma: "inoxSch10"` e `"inoxSch40"`. Ancora a decisão "entra na Auto".

As tabelas de eletroduto pré-existentes (5597/5598/5624/PEAD) seguem sem cobertura.
Testá-las retroativamente está fora do escopo.

## Verificação no app

Branch `feat-eletroduto-inox`, reversível.

- Toggle mostra 6 normas em 3×2, sem quebra de layout.
- Cada schedule selecionado lista as bitolas corretas.
- Trocar do Sch 40 4" para o Sch 10 reajusta a bitola em vez de quebrar.
- Busca Auto mostra o inox nos resultados.
- `npm test` completo e `vite build` limpos.
