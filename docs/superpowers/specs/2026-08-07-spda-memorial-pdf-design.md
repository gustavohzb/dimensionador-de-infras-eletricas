# Memorial de cálculo em PDF — aba SPDA

Data: 2026-08-07

## Contexto

A aba SPDA (`src/components/SpdaTab.jsx`) calcula R1, R3 e a frequência de
danos F conforme a ABNT NBR 5419-2:2026, mas não tem exportação em PDF —
diferente das abas de Cabos (`memorialPdf.js`), Iluminação
(`iluminacaoPdf.js`) e Capacitores (`capacitorPdf.js`), que já exportam
memoriais completos com jsPDF.

O usuário pediu que o memorial reproduza as tabelas de cálculo intermediário
(áreas de exposição, número de eventos, probabilidades), não só o resumo
final R1/R3/F — no padrão de planilhas de engenharia como as da NBR
5419-2:2015/02 que ele usa como referência.

**Conferência feita nesta sessão**: 13 equações dos Anexos A, B e C foram
comparadas diretamente contra o texto oficial da ABNT NBR 5419-2:2026 (2ª
edição, 10.03.2026, versão corrigida 02.04.2026) — todas batem exatamente com
o que `spdaRisco.js` já implementa, símbolo por símbolo e equação por
equação. O projeto já tinha uma nota de pesquisa própria
(`docs/superpowers/specs/nbr5419-2-2026-parametros.md`) com essa mesma
extração, que serve de fonte para os rótulos e números de equação usados no
PDF.

**Achado relevante**: no Anexo E da edição 2026 está "Vago" (reservado, sem
conteúdo) — as tabelas de exemplo numérico E.5/E.6 que existiam na edição
2015 não têm equivalente na norma vigente. Por isso o memorial mostra as
equações dos Anexos A/B/C diretamente, com os números de equação da edição
2026, e não replica a numeração ou o layout de tabela de uma planilha de 2015.

## Arquitetura

Novo módulo `src/lib/spdaPdf.js`, seguindo o padrão de `capacitorPdf.js`:
import dinâmico de `jsPDF`, helpers locais `sectionTitle` / `keyValue` /
`ensureSpace` para paginação automática, orientação **paisagem** (as tabelas
de 5 colunas — Parâmetro / Equação / Símbolo / Resultado / Ref. — não cabem
em retrato).

A função exportada recebe `{ entrada, resultado }` — os dois objetos que
`SpdaTab.jsx` já mantém em memória via `avaliarRisco(entrada)` — e não
precisa de nenhum estado novo. Um botão **"Relatório PDF"** aparece no
cabeçalho da aba, ao lado do título, habilitado só quando
`entrada.estrutura.ng != null` (mesma condição que já libera os cartões de
resultado).

`resultado` (retorno de `avaliarRisco`) já expõe tudo que o memorial precisa,
sem cálculo novo:

```js
{
  componentes,      // { RA, RB, RC, RM, RU, RV, RW, RZ }
  chavesR1, r1, r3, rt, precisa, dominante,
  frequencias,      // Seção 7, por sistema
  eventos,          // { nd, nm, ad, am, porLinha: [{id, al, ai, nl, ni, ndj}] }
  probs,            // { pa, pb, peb, pc, pm, porSistema: [{id,pc,pm}], porLinha: [{id,pu,pv,pw,pz}] }
  perdas,           // { la, lb, lc }
}
```

`perdaL3(estrutura)` (não incluído em `resultado`) precisa ser chamado à
parte quando `estrutura.patrimonioCultural` for verdadeiro, do mesmo jeito
que `avaliarRisco` já faz internamente.

## Conteúdo do PDF

Nove seções, cada uma só aparece se fizer sentido para a entrada atual
(sem N_G a exportação nem é oferecida; sem patrimônio cultural, sem tabela
L3; sem sistemas internos, sem Anexo B "por sistema" nem Seção 7).

### 1. Cabeçalho

Título "Memorial de Cálculo — SPDA (ABNT NBR 5419-2:2026)", data/hora,
paisagem A4. Mesmo estilo do cabeçalho de `capacitorPdf.js`.

### 2. Dados de entrada

Três blocos de pares chave-valor (`keyValue`), espelhando os três painéis da
aba:

- **Estrutura**: L, W, H (e Hp se houver), município/UF (N_G), tipo de
  ocupação, risco de incêndio/explosão, piso, providências, perigo especial,
  construção, pessoas (n_z, n_t, ocupação), patrimônio cultural (c_z, c_t se
  aplicável).
- **Linhas elétricas**: uma linha por item de `entrada.linhas` — tipo,
  comprimento, instalação, ambiente, blindagem/resistência.
- **Proteções e sistemas internos**: SPDA NP, DPS NP e classe I, fiação,
  medidas P_TA/P_TU, blindagem/malha, e uma linha por sistema interno com
  U_W, blindado, interface isolante, linha associada, Crítico, ZPR₀ᴬ.

Os rótulos (dropdown value → texto) vêm das tabelas já existentes em
`src/data/spdaNBR5419.js` — sem duplicar strings.

### 3. Tabela — áreas de exposição equivalente (Anexo A)

| Parâmetro | Equação | Símbolo | Resultado | Ref. |
|---|---|---|---|---|
| Estrutura | L×W+2×(3H)×(L+W)+π×(3H)² | A_D | `eventos.ad` | (A.1) |
| Descargas próximas | 2×500×(L+W)+π×500² | A_M | `eventos.am` | (A.6) |
| Linha — cada item de `eventos.porLinha` | 40×L_L | A_L | `.al` | (A.8) |
| Linha — cada item | 4 000×L_L | A_I | `.ai` | (A.10) |

A_DJ (área da estrutura adjacente, quando a linha tiver `adjacente`
declarado) **não é retornada hoje** por `numeroEventos()` — só o N_DJ final.
Pequena extensão do motor: expor `adj` (a área calculada) no item de
`porLinha`, sem mudar nenhum resultado existente, para a tabela poder
mostrá-la quando `linha.adjacente` existir.

### 4. Tabela — número esperado de eventos perigosos (Anexo A)

| Parâmetro | Equação | Símbolo | Resultado | Ref. |
|---|---|---|---|---|
| Estrutura | N_G×A_D×C_D×10⁻⁶ | N_D | `eventos.nd` | (A.3) |
| Estrutura adjacente (se houver) | N_G×A_DJ×C_DJ×C_T×10⁻⁶ | N_DJ | `porLinha[i].ndj` | (A.4) |
| Descargas próximas | N_G×A_M×10⁻⁶ | N_M | `eventos.nm` | (A.5) |
| Linha | N_G×A_L×C_I×C_E×C_T×10⁻⁶ | N_L | `porLinha[i].nl` | (A.7) |
| Linha | N_G×A_I×C_I×C_E×C_T×10⁻⁶ | N_I | `porLinha[i].ni` | (A.9) |

### 5. Tabela — probabilidades (Anexo B)

| Parâmetro | Equação | Símbolo | Resultado | Ref. |
|---|---|---|---|---|
| Estrutura | P_TA×P_B | P_A | `probs.pa` | (B.1) |
| Por sistema interno | P_SPD×C_LD | P_C | `probs.porSistema[i].pc` | (B.2) |
| Composto (≥2 sistemas) | 1−∏(1−P_Ci) | P_C | `probs.pc` | eq. 12 |
| Por sistema interno | P_SPD×P_MS ou P_MS | P_M | `probs.porSistema[i].pm` | (B.3)/(B.4) |
| Composto (≥2 sistemas) | 1−∏(1−P_Mi) | P_M | `probs.pm` | eq. 13 |
| Por linha | P_TU×P_EB×P_LD×C_LD | P_U | `probs.porLinha[i].pu` | (B.8) |
| Por linha | P_EB×P_LD×C_LD | P_V | `probs.porLinha[i].pv` | (B.9) |
| Por linha | P_SPD×P_LD×C_LD | P_W | `probs.porLinha[i].pw` | (B.10) |
| Por linha | P_SPD×P_LI×C_LI | P_Z | `probs.porLinha[i].pz` | (B.11) |

P_B (`probs.pb`) e P_EB (`probs.peb`) também entram como linhas simples da
tabela (Tabela B.2 e B.7), sem fórmula própria — são lookup direto.

**Nota no rodapé desta seção** (mesmo texto dado ao usuário durante o
brainstorm): o modelo do app tem um sistema interno por conexão de linha e um
único P_SPD, então P_C/P_M aparecem por sistema e compostos — sem separar
P_CP/P_CI por tipo de DPS de potência/sinal, que a norma prevê como caso mais
granular.

### 6. Tabela — perdas (Anexo C)

| Parâmetro | Equação | Símbolo | Resultado | Ref. |
|---|---|---|---|---|
| L1 — choque | r_t×L_T×(n_z/n_t)×(t_z/8760)×r_s | L_A | `perdas.la` | (C.1)/(C.2) |
| L1 — danos físicos | r_p×r_f×h_z×L_F×(n_z/n_t)×(t_z/8760)×r_s | L_B | `perdas.lb` | (C.3) |
| L1 — sistemas internos | L_O×(n_z/n_t)×(t_z/8760)×r_s | L_C | `perdas.lc` | (C.4) |
| L3 — danos físicos (se `patrimonioCultural`) | r_p×r_f×L_F×(c_z/c_t) | L_B | `perdaL3(estrutura)` | (C.7) |

### 7. Componentes de risco R_A...R_Z

Mesma tabela de `ResultadoRisco.jsx` (componente, origem, valor, % de R1),
com uma coluna extra por linha quando aplicável (R_U/R_V/R_W somam
`eventos.porLinha`), e o componente dominante destacado. R1 e o veredito
("dentro do tolerável" / "acima do tolerável") logo abaixo.

### 8. Veredito R1 / R3

Texto simples: valor calculado, limite tolerável (`resultado.rt`),
resultado — no texto das barras de `VereditoRisco.jsx`.

### 9. Frequência de danos F

Mesma tabela de `FrequenciaDanos.jsx`: por sistema × fonte de dano (F_C, F_M,
F_W, F_Z, F_V, F_B), F_T e veredito.

**Fora do memorial**: a seção "Como atender a norma" (busca de medidas) —
decisão já tomada no brainstorm: a busca é sob demanda e pode não ter sido
rodada, e o resultado muda se os dados de entrada mudarem depois. O memorial
documenta o estado atual, não um plano de ação hipotético.

## Nome do arquivo

`memorial-spda-<município>.pdf` (slug do município, mesma sanitização usada
em `capacitorPdf.js`), ou `memorial-spda.pdf` se por algum motivo o
município não estiver preenchido (não deveria acontecer, já que o botão só
aparece com N_G definido).

## Testes

Seguindo o padrão dos outros módulos de PDF (`iluminacaoPdf.test.js`): não se
testa a renderização do jsPDF em si, mas as funções puras de preparação de
dados que o módulo expuser (ex.: montagem das linhas da tabela A/B/C a partir
de `resultado`, resolução de rótulos). Verificação final via browser: gerar o
PDF com o galpão padrão da aba (`defaultEntrada()`) e conferir visualmente
que os números batem com o que a tela mostra.

## Fora de escopo

- Alterar qualquer cálculo do motor (`spdaRisco.js`, `spdaFrequencia.js`) —
  a única mudança é expor `adj` (área da estrutura adjacente) em
  `eventos.porLinha`, que hoje é calculada mas descartada.
- Anexo D (custo-benefício) e Anexo F (mapa de N_G) — não fazem parte do
  memorial de cálculo de risco.
- Sugestão de medidas de proteção no PDF (decisão do brainstorm).
