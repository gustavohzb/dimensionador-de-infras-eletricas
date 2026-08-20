# Aba de cabos de média tensão — NBR 14039

Data: 2026-08-19
Estado: desenho aprovado nas decisões estruturais; camada de dados já implementada.

## Objetivo

Dimensionar cabos isolados de média tensão pela ABNT NBR 14039:2021, para os dois
casos de uso reais do escritório:

- ramal de entrada e alimentador da subestação (do ponto de entrega ao cubículo,
  e do cubículo ao transformador);
- distribuição de MT entre subestações do mesmo site.

A aba de Cabos Elétricos não serve para isso e não será adaptada. Ela é NBR 5410,
válida até 1000 V: as tabelas de ampacidade são de cabo 0,6/1 kV, a reatância
usada é de baixa tensão, e não há verificação de curto — nem no condutor nem na
blindagem. Hoje o campo de tensão aceita 13800 sem reclamar e devolve uma bitola
de aparência plausível, o que é pior que recusar.

## Fora de escopo

**Rede de distribuição aérea** (cabo protegido em espaçador, cabo nu em poste).
É outro problema: NBR 15992 e normas de concessionária, ampacidade ao ar com
vento e insolação, e critérios mecânicos — vão, flecha, tração, esforço no poste
— que não existem em cabo instalado. A própria NBR 14039 confirma a separação:
declara em 6.2.5 que não tabela capacidade para cabo nu, remetendo à IEEE Std 738.
Vira projeto próprio, com spec própria.

**Motores de MT.** Não apareceram nos casos de uso; entram depois se surgirem.

**Cabo em PVC ou polietileno termoplástico nas classes 1,8/3 e 3,6/6 kV.** A norma
não tabela (6.2.5), remetendo à IEC 60287 ou à NBR 11301. A aba cobre EPR/HEPR/
XLPE/TR XLPE a 90 °C e EPR 105 a 105 °C. Fora disso, recusa em vez de estimar.

## Arquitetura

Aba nova, motor próprio, compartilhando com o resto do app apenas o que não é
normativo. Descartadas: (a) aba totalmente isolada, que duplicaria persistência e
modelo de trechos sem ganho; (b) modo MT dentro de Cabos Elétricos, que tornaria
condicional quase todo campo da tela e é o caminho mais curto para regredir a
aba de baixa tensão, hoje estável.

| Arquivo | Papel | Estado |
|---|---|---|
| `src/data/cabosNBR14039.js` | Tabelas 27 a 44 da norma e funções de consulta | **pronto** |
| `src/data/cabosNBR14039.test.js` | 64 testes de estrutura e coerência | **pronto** |
| `src/lib/mtModelo.js` | Formato do circuito de MT e normalização do estado salvo | a fazer |
| `src/lib/mtSizing.js` | Motor: os quatro critérios e o critério determinante | a fazer |
| `src/lib/mtPdf.js` | Memorial de cálculo | a fazer |
| `src/components/MediaTensaoTab.jsx` + `src/components/mt/*` | Tela | a fazer |

Compartilhado de verdade: a função de merge com defaults de `circuitoModelo.js`
(a extrair para módulo comum), o registro em `estadoAbas.js`, o `ErrorBoundary` e
a infraestrutura de PDF. **Não** compartilhado: tabelas, fatores e motor.

Os métodos de instalação de MT são outros — 13 métodos (A1, A2, B1, B2, C, D, E,
F1, F2, G1, G2, H, I), com "exposto ao sol" como eixo próprio, que não existe em
baixa tensão. Por isso o `defaultTrecho` de BT não é reaproveitável como está.

## Camada de dados (implementada)

Transcrita da NBR 14039:2021 com tabela e página indicadas em cada bloco. Só
valores numéricos e identificação de cláusula; nenhum texto normativo copiado.

**Ampacidade** (Tabelas 28 e 29): indexada por temperatura do condutor
(90 / 105 °C) × material × seção × método. **Não** por classe de tensão — a norma
declara em 6.2.5 que tabelou um único valor para todas as classes, adotando o
menor. A classe de tensão entra só na designação do cabo, nunca no cálculo.
Pelo mesmo motivo o aterramento da blindagem não afeta a ampacidade: os valores
valem para um ponto, dois ou mais, ou cross-bonding.

**Correção de temperatura** (30 e 31): referência de 20 °C para linhas enterradas
e 30 °C para as demais (6.2.5.3.2), a de 30 °C com colunas separadas para
abrigado e exposto ao sol.

**Correção de solo** (32 e 33): resistividade térmica e profundidade, válidas só
para F1, F2, G1, G2, H e I.

**Agrupamento** (34 a 41): oito tabelas, cada uma de um método. Não há fator por
número de circuitos como em BT — ver "Modelo de agrupamento" abaixo.

**Curto-circuito** (42 a 44): constantes K e β, temperaturas do condutor e da
blindagem, com a equação `I = K·S·√((1/t)·ln((θf+β)/(θi+β)))` e duração máxima de
5 s.

### Verificação feita

Além dos testes de estrutura, três conferências independentes:

- monotonicidade da ampacidade por método, cobre acima de alumínio, e 105 °C
  acima de 90 °C — sem exceção em nenhuma das 4 × 17 × 13 células;
- fatores de temperatura conferidos contra `√(ΔT/ΔTref)`: 90 °C a 10 °C ambiente
  dá √(80/60) = 1,155 → tabelado 1,15; EPR 105 dá √(95/75) = 1,125 → 1,13;
- o k do curto reconstruído da equação da 14039 dá 143,1 no cobre e 94,5 no
  alumínio, contra 143 e 94 tabelados na NBR 5410 Tabela 43. Duas normas
  independentes concordando é a evidência mais forte disponível de que K, β e as
  temperaturas estão corretos.

### Ausências que são dado, não lacuna

Registradas como `null`, e o motor **deve recusar**, nunca assumir 1,00 nem cair
num vizinho:

- células `–` do método D nas seções grandes (1000 mm² em ambas as tabelas; 800
  também na de EPR 105 no cobre);
- exposição ao sol acima de 60 °C ambiente com isolação de 90 °C, e acima de
  75 °C com EPR 105 — a norma veta o cabo, não reduz o fator;
- métodos A2, B1, B2, C, D e E não têm tabela de agrupamento em lugar nenhum da
  norma. Com mais de um circuito nesses métodos, calcular pela IEC 60287-2-2;
- duração de curto acima de 5 s.

### Duas armadilhas conferidas na norma

Documentadas no código porque parecem erro de digitação e alguém tentaria
"corrigir":

1. A Tabela 38 tem fatores **maiores que 1,00**. Nada no motor pode limitar o
   produto dos fatores a 1.
2. Na Tabela 38 mais espaçamento **nem sempre ajuda**: em 3 dutos de 185 a
   400 mm² o fator cai de 0,97 a 200 mm para 0,92 a 800 mm. Só nas seções
   pequenas o afastamento é favorável.

## Modelo de agrupamento

É a diferença conceitual mais importante em relação à baixa tensão, e define a
tela. Não existe "fator por número de circuitos". Cada método tem sua própria
forma de entrada:

| Método | Tabela | Entrada que a tela precisa pedir |
|---|---|---|
| A1 | 34 e 35 | arranjo geométrico + espaçamento `e` em múltiplos de Dₑ; a tabela depende ainda de o cabo ser unipolar em trifólio (34) ou tripolar (35) |
| F1 | 36 | número de dutos + faixa de seção + espaçamento entre centros em mm (ou "encostados") |
| F2 | 37 | quantos dos quatro dutos do banco estão ocupados; banco fixo de 480 × 480 mm, topo a 760 mm, dutos a 200 mm |
| G1 | 38 | número de dutos (3, 6, 9, 12) + faixa de seção + espaçamento em mm |
| G2 | 39 | número de dutos (4, 6, 9), cada um com seu tamanho de banco |
| H | 40 | número de condutores isolados (6, 9, 12), cabos encostados |
| I | 41 | regime de espaçamento (2·Dₑ ou 200 mm) + número de cabos + seção |
| A2, B1, B2, C, D, E | — | sem tabela: recusar quando houver agrupamento |

Consequência de projeto: o formulário de trecho é **condicional ao método**, não
um conjunto fixo de campos. Escolher o método primeiro e revelar só os campos que
aquela tabela consome evita pedir dado que não será usado e evita a combinação
sem tabela.

Duas limitações que a norma declara e que a tela deve mostrar, não esconder: os
arranjos são os normalizados da IEC 60287-2-2, e outras formas exigem cálculo; e
no banco de dutos, dimensões diferentes das tabeladas afetam fortemente o fator.

## Motor de cálculo

Percorre as seções em ordem crescente e devolve a primeira que passa nos quatro
critérios, junto com qual deles determinou a escolha — no mesmo padrão da aba de
BT, que já identifica o critério determinante.

1. **Capacidade de condução.** `Iz = Iz_tabela × Ftemp × Fagrup × Fsolo ≥ Ib`.
   Qualquer fator `null` interrompe com motivo declarado, em vez de virar 1,00.
   `Ib` vem da potência do transformador (kVA) ou é digitada.
2. **Queda de tensão em regime.** `ΔV = √3·I·L·(R·cosφ + X·senφ)/U`, com R e X de
   MT — não os 0,08 Ω/km de baixa tensão. Em MT a reatância costuma dominar, o
   que inverte o que manda na conta em relação à BT.
3. **Curto no condutor.** `S ≥ I·√t / k`, com `k = K·√(ln((θf+β)/(θi+β)))`
   derivado das Tabelas 42 e 43, não uma constante tabelada.
4. **Curto na blindagem.** Mesma equação com a blindagem partindo 5 °C abaixo do
   condutor e a temperatura final vinda do material da **cobertura** (Tabela 44).
   É frequentemente este critério que define a seção, não a fase — quem dimensiona
   só o condutor não vê isso.

A corrente de falta fase-terra do critério 4 vem de um seletor de aterramento do
neutro (solidamente aterrado, aterrado por resistor com corrente limitada
informada, ou isolado/alta impedância), e a tela declara de onde o valor saiu. O
Icc trifásico é digitado, vindo da concessionária.

**Por circuito, não no preset:** o tempo de atuação `t` e o aterramento da
blindagem. Cada alimentador tem seu cubículo, seu relé e seu critério. Misturar um
dado por circuito com um preset global foi exatamente o defeito de desenho da
funcionalidade de proteção que abortamos.

## Tela e saídas

- Tabela na tela com seção final, seção da blindagem e o critério determinante em
  destaque, no mesmo formato da aba de BT.
- Memorial de cálculo em PDF, com premissas, tabelas usadas com referência de
  cláusula, e o cálculo de cada circuito.
- Designação do cabo para lista de material (ex.: `3#1x50mm² 8,7/15 kV EPR
  blindado`), aproveitável na skill de resumo de cabos. É onde a classe de tensão
  aparece.
- **Sem** salvamento na nuvem nesta rodada. Só localStorage, com normalização do
  estado salvo desde o início — a aba de BT precisou disso depois, e reabrir
  projeto antigo chegou a produzir cabo subdimensionado.

## Testes

Funções puras, no padrão do repositório (vitest, ambiente node, sem jsdom). Além
dos 64 testes de dados já escritos, o motor precisa de casos que travem:
recusa quando falta tabela; o critério determinante correto em cada cenário; e um
caso em que a blindagem manda e o condutor passaria — que é a razão de existir do
quarto critério.

## Faseamento

- **Etapa 0 — dados.** Concluída.
- **Etapa 1 — motor e testes.** `mtModelo.js` e `mtSizing.js`, sem tela.
- **Etapa 2 — tela.** Aba, formulário condicional ao método, tabela de resultados.
- **Etapa 3 — memorial e designação.**

## Métodos C e D: ambiguidade resolvida como decisão do usuário

Conferido na norma e **encerrado**: ela não classifica C e D (canaleta fechada no
solo) como enterrados nem como "demais maneiras de instalar". A Tabela 25, citada
em 6.2.5.2.2, só mapeia tipo de instalação para método de referência, e a 6.2.2
apenas remete a ela. Nada em 6.2.5.3.2 enumera métodos.

Os dois lados têm apoio real no texto:

- **não enterrado** (Tabela 30, referência 30 °C, coluna exposto ao sol):
  6.2.5.1.2 descreve a canaleta como exposta ao sol, condição que só a Tabela 30
  tem coluna para expressar;
- **enterrado** (Tabela 31, referência 20 °C): o título da Tabela 31 é "para
  linhas subterrâneas", e canaleta fechada no solo é, em leitura direta,
  subterrânea.

A exclusão de C e D das Tabelas 32 e 33 **não** é argumento para nenhum dos lados,
ao contrário do que uma versão anterior desta spec afirmava: aquelas correções
tratam de resistividade do solo e profundidade de enterramento, que não se
aplicam a cabo dentro de canaleta com ar sob qualquer das duas leituras.

**Por isso não há default.** A diferença troca de sinal com a temperatura: a
30 °C a Tabela 30 dá 1,00 contra 0,93 da Tabela 31 — 7 % a mais de ampacidade,
portanto cabo menor — e o sinal só se inverte acima de cerca de 38 °C. Na faixa
usual de projeto no Brasil, escolher a Tabela 30 subdimensiona. Arbitrar em
silêncio o lado que subdimensiona, numa ambiguidade que a norma deixou em aberto,
é exatamente o defeito que o resto deste desenho evita.

Implementado: `enterrado: null` para C e D, e `fatorTemperaturaMT` devolve `null`
até quem chama passar `referencia: "aoAr"` ou `referencia: "enterrado"`. Nos
métodos que a norma classifica, a referência informada é ignorada.

Consequência para a tela: ao escolher C ou D, o formulário precisa perguntar qual
referência adotar, mostrando as duas e dizendo que a norma não decide. Não é um
campo a mais por preciosismo — é a única entrada da aba em que o projetista
assume uma interpretação, e ela precisa aparecer no memorial.
