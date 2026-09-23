# Trifólios espaçados de 2D — plano de implementação

> **Para quem executa:** os passos usam `- [ ]` para acompanhamento. Spec em
> `docs/superpowers/specs/2026-09-23-trifolios-espacados-design.md`.

**Objetivo:** desenhar e conferir um trecho com os feixes de trifólio numa
fileira única, separados por vão livre de 2× o diâmetro.

**Arquitetura:** função nova em `packing.js`, irmã das três existentes, porque
a fileira é determinística e não tem gravidade a resolver. O motor de gravidade
ganha um parâmetro aditivo (círculos pré-posicionados) para que os cabos soltos
caiam depois da fileira sem atravessá-la. A tela e a busca apenas escolhem qual
motor chamar.

**Stack:** React 19, Vite, Tailwind v4, Vitest (ambiente node, sem jsdom).

## Restrições globais

- Fator de agrupamento **não muda**. `estimateCircuits` continua contando um
  circuito por trifólio; o vão não entra na conta.
- O modo **não persiste** em projeto (coluna do Supabase não existe).
- Vão **fixo em 2D, borda a borda**, sem campo de configuração.
- Vão entre feixes de bitolas diferentes usa o **maior** dos dois diâmetros.
- Fileira começa encostada na parede esquerda, sem vão de parede.
- Feixes na ordem em que foram adicionados ao trecho.
- Modo disponível só em infraestrutura **retangular** e em trecho **não misto**
  (eletroduto é feixe por definição; com septo, o compartimento é outra coisa).
- Baseline a preservar: 4 avisos de oxlint, build limpo.

---

### Task 1: motor da fileira espaçada

**Arquivos:**
- Modificar: `src/lib/packing.js`
- Testar: `src/lib/packing.test.js`

**Interfaces produzidas:**
- `layoutCablesTrifolioEspacado(cables, trayWidth, trayHeight) -> items[]`
  — cada item do feixe ganha `fase` ("R" | "S" | "T") e `trifolioGroup`.
- `larguraTrifolioEspacado(cables) -> number` (mm)
- `layoutCables(cables, trayWidth, trayHeight, preposicionados = [])`
  — quarto parâmetro aditivo; sem ele, comportamento idêntico ao atual.

- [ ] **Passo 1:** teste que falha — passo de 4D, feixe de 2D, vão de 2D, todos
      apoiados no fundo; largura de N feixes iguais = (2N−1)·2D; vão entre
      bitolas diferentes usa o maior diâmetro; cabo solto não atravessa a
      fileira; fases T no topo e base alternando R S / S R.
- [ ] **Passo 2:** rodar e confirmar que falha por função inexistente.
- [ ] **Passo 3:** implementar `fileiraTrifolios` (origens + largura, fonte
      única do passo), `layoutCablesTrifolioEspacado` e o parâmetro
      `preposicionados` em `layoutCables`.
- [ ] **Passo 4:** rodar a suíte inteira — nada do que existia pode mudar.
- [ ] **Passo 5:** commitar.

### Task 2: tela

**Arquivos:**
- Modificar: `src/hooks/useCableTray.js` (estado `trifoliosEspacados`)
- Modificar: `src/components/InfraTab.jsx` (chave + largura necessária)
- Modificar: `src/components/TrayVisualization.jsx` (layout + rótulo de fase)

- [ ] **Passo 1:** estado no hook, zerado pelo `resetAll`, exposto no retorno.
- [ ] **Passo 2:** chave na tela, desabilitada com motivo visível quando a
      infraestrutura for eletroduto ou o trecho for misto.
- [ ] **Passo 3:** `TrayVisualization` escolhe o motor pela prop e desenha a
      letra da fase sobre o condutor, como o número de vias já faz.
- [ ] **Passo 4:** "largura necessária" ao lado da ocupação quando o modo está
      ligado.
- [ ] **Passo 5:** conferir no navegador (posições no DOM, não só screenshot).
- [ ] **Passo 6:** commitar.

### Task 3: busca reversa

**Arquivos:**
- Modificar: `src/lib/reverseSearch.js`
- Modificar: `src/hooks/useBuscaInfra.js`, `src/components/InfraTab.jsx`
- Testar: `src/lib/reverseSearch.test.js`

- [ ] **Passo 1:** teste que falha — com o modo ligado, um leito estreito que
      hoje é aprovado passa a ser reprovado, e eletroduto some do ranking.
- [ ] **Passo 2:** rodar e confirmar a falha.
- [ ] **Passo 3:** `findBestFits(cables, { trifoliosEspacados })` usa a fileira
      nos tipos retangulares e pula eletroduto quando ligado.
- [ ] **Passo 4:** repassar a flag da aba até a busca.
- [ ] **Passo 5:** suíte, lint, build; commitar.
