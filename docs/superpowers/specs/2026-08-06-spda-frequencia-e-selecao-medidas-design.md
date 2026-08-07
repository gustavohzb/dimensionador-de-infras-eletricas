# SPDA — frequência de danos F e seleção de medidas de proteção

Data: 2026-08-06
Norma: ABNT NBR 5419-2:2026
Parâmetros extraídos: [nbr5419-2-2026-parametros.md](nbr5419-2-2026-parametros.md)

## Problema

A aba SPDA calcula as oito componentes de risco, soma R1 e R3 e diz se a
proteção é necessária. Ela para aí, e isso deixa dois buracos:

1. **Não diz o que fazer.** Quem projeta descobre a solução por tentativa e
   erro, mexendo num campo por vez até R1 cair abaixo de 10⁻⁵.
2. **Não avalia a frequência de danos F**, que é requisito novo da edição 2026
   (Seção 7) e independente do risco. Uma estrutura pode passar em R1 e
   reprovar em F — hoje o app diria "aprovado" onde a norma exige proteção.

Este documento cobre as duas coisas. Salvar projeto na nuvem e memorial em PDF
ficam para ciclos próprios.

## Parte 1 — Frequência de danos F

### O que a norma pede

`F_X = N_X × P_X` (equação 15). Tabela 7, por fonte de dano:

| S1 | S2 | S3 | S4 |
|---|---|---|---|
| F_C = N_D × P_C | F_M = N_M × P_M | F_W = (N_L + N_DJ) × P_W | F_Z = N_I × P_Z |
| F_B = N_D × P_B ᵃ | | F_V = (N_L + N_DJ) × P_EB | |

ᵃ Só para equipamento em ZPR₀ᴬ, isolado ou no topo da estrutura. Nas demais
situações F_B = 0.

Frequência tolerável F_T:

- **0,1/ano** para sistema crítico — valor máximo, só alterável por autoridade
  com jurisdição;
- **1/ano** para não crítico — meramente representativo.

Sistema crítico, pela norma: aquele cuja falha pode afetar uma comunidade, com
perdas irreversíveis ou de longa duração, ou que possa levar indiretamente a
danos físicos ou ameaça à vida.

### Decisão: a criticidade é do sistema, não da estrutura

A definição da norma é sobre o sistema interno. Um mesmo prédio pode ter um
CFTV comum e um sistema de combate a incêndio crítico, com F_T diferentes. A
marcação vai portanto em cada sistema interno, no painel Proteções, e não no
painel Estrutura.

Ela é manual, com o texto da definição normativa ao lado. O app não deduz: a
classificação é julgamento de quem assina o projeto, e uma dedução errada num
caso limítrofe passaria despercebida justamente onde mais importa.

Cada sistema interno ganha dois campos novos:

- `critico` (booleano) — decide F_T entre 0,1 e 1/ano;
- `zpr0a` (booleano) — equipamento em ZPR₀ᴬ, isolado ou no topo, que é a
  condição da nota "a" para F_B contar.

Ambos entram como `false` no `defaultEntrada`, que é o caso mais comum.

### Motor

`probabilidades()` já calcula `pcPorSistema` e `pmPorSistema` internamente,
mas só devolve o valor composto pelas equações 12 e 13. Passa a devolver
também os vetores por sistema — F precisa do valor individual, não do
composto, porque o limite é comparado equipamento a equipamento.

Módulo novo `frequenciaDanos({ eventos, probs, entrada })`, que para cada
sistema interno devolve:

```js
{
  id,            // id do sistema interno
  fc, fm, fw, fv, fz, fb,
  maior,         // a maior das seis
  ft,            // 0.1 quando critico, senão 1
  atende,        // maior <= ft
}
```

F_W, F_V e F_Z usam os números de eventos da linha à qual o sistema está
ligado (`linhaId`), que o painel de Proteções já registra. Sistema sem linha
associada tem F_W = F_V = F_Z = 0.

`avaliarRisco` passa a devolver `frequencias` (o vetor acima) e
`precisa.f` (verdadeiro quando qualquer sistema não atende).

### Tela

- Terceiro cartão na barra fixa de veredito, ao lado de R1 e R3: mostra o pior
  F entre os sistemas, o F_T que o rege e o veredito. Segue o mesmo desenho
  dos outros dois, inclusive as cores.
- Tabela por sistema abaixo da de componentes, com uma coluna por fonte de
  dano (F_C, F_M, F_W, F_V, F_Z, F_B), o maior valor e o F_T aplicável.
- Quando não há sistema interno cadastrado, o cartão não aparece — não há o
  que avaliar.

## Parte 2 — Seleção de medidas de proteção

### O espaço de busca

As medidas que o motor já sabe aplicar, com a tabela normativa de cada uma:

| Medida | Tabela | Opções |
|---|---|---|
| Nível do SPDA | `SPDA_PB` | nenhum, IV, III, II, I |
| Nível dos DPS | `DPS_PSPD` | nenhum, IV–III, II, I |
| DPS classe I (equipotencialização) | `DPS_PEB` | nenhum e os níveis |
| Medidas contra tensão de toque | `MEDIDAS_PTA` | conjunto |
| Medidas contra tensão de passo | `MEDIDAS_PTU` | conjunto |
| Cuidado de fiação | `FIACAO_KS3` | quatro roteamentos |
| Blindagem espacial | largura de malha ou contínua | discretizada |
| Piso | `PISO_RT` | cinco tipos |
| Providências contra incêndio | `PROVIDENCIAS_RP` | quatro |

O produto cartesiano passa de um milhão de arranjos. Busca exaustiva a cada
tecla digitada não fecha.

### Como a busca escapa disso

Toda medida de proteção só multiplica o risco por um fator ≤ 1 — nenhuma
aumenta o risco. Disso decorre que **se uma combinação não atende, nenhum
subconjunto dela atende**. Isso permite podar ramos inteiros sem avaliá-los.

A busca é melhor-primeiro pelo esforço acumulado: uma fila de prioridade
avalia primeiro os arranjos mais baratos e expande a partir deles, parando
assim que reunir **três** combinações válidas. Como a expansão é por esforço
crescente e nenhum peso é negativo, as três saem já na ordem certa: a primeira
é comprovadamente a de menor esforço entre todas as que atendem.

Critério de aprovação de uma combinação: R1 ≤ 10⁻⁵ **e** R3 ≤ 10⁻⁴ (quando há
patrimônio cultural) **e** todo sistema com F ≤ F_T. Os três juntos — atender
o risco e reprovar na frequência não serve.

Para o espaço ficar tratável, a blindagem espacial entra discretizada em cinco
degraus em vez de um número contínuo: sem blindagem, malha de 5 m, de 2 m, de
0,5 m e blindagem metálica contínua. São as larguras que aparecem em projeto;
uma malha intermediária não muda a ordem das recomendações.

### Os pesos de esforço

Escala ordinal, definida por mim, num único lugar do código
(`src/data/spdaEsforco.js`) para ser fácil de discordar e ajustar. Não é preço
— é ordem de grandeza de intervenção em obra. A ordem pretendida:

| Faixa | Exemplos |
|---|---|
| Barato | avisos de advertência, roteamento de fiação cuidado |
| Médio | DPS, piso isolante, providências contra incêndio |
| Caro | SPDA nível IV e III, equipotencialização classe I |
| Muito caro | SPDA nível II e I, malha de blindagem |
| Último recurso | blindagem metálica contínua |

O arquivo carrega um comentário dizendo que os números são julgamento de
engenharia, não valor normativo, e que mudá-los muda só a ordem de
apresentação — nunca se uma combinação atende ou não.

### Tela

Painel novo "Como atender a norma", abaixo do resultado, que aparece só quando
R1, R3 ou F reprovam. Para cada combinação sugerida:

- as medidas a adotar, em lista, marcando as que já estão aplicadas;
- R1, R3 e o pior F resultantes, com a folga em relação ao limite;
- botão que aplica a combinação nos campos.

**Ressalva explícita na tela:** piso e providências contra incêndio moram no
painel Estrutura, não em Proteções. Aplicar uma combinação altera campos dos
dois painéis, e a tela avisa isso antes — senão parece que o app mexeu em dado
do usuário por conta própria.

Quando nenhuma combinação do catálogo atende, o painel diz isso em vez de
ficar vazio, e mostra a melhor que encontrou com o quanto ainda falta. É
resultado legítimo: há estruturas que só a redução de ocupação resolve.

## Testes

- **F**: um caso calculado à mão para cada uma das seis fórmulas da Tabela 7;
  F_B zerado sem a marcação de ZPR₀ᴬ e não zerado com ela; F_T alternando com
  a marcação de crítico; sistema sem linha associada.
- **Busca**: monotonicidade (adicionar medida nunca aumenta o risco); a
  primeira combinação devolvida é a de menor esforço entre as válidas; espaço
  sem solução devolve o aviso e não uma lista vazia; combinação aplicada
  reproduz exatamente o R1 que a busca prometeu.
- **Desempenho**: a busca sobre o caso padrão termina dentro do orçamento de
  um render; medido no navegador, não presumido.

## Fora de escopo

- Zonas de estudo Z_S múltiplas e seções de linha S_L (a aba segue com zona
  única).
- R4 e a análise custo-benefício do Anexo D, que passou a informativo em 2026.
- Salvar projeto na nuvem e memorial em PDF — ciclos próprios, nesta ordem.
