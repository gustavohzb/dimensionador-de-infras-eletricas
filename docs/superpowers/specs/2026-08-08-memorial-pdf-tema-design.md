# Tema de PDF e redesenho do Memorial de Cabos

Data: 2026-08-08

## Contexto

O Memorial de Cálculo em PDF da aba Cabos (`src/lib/memorialPdf.js`) é
funcional mas sem apresentação: nenhum logo, nenhuma cor de marca (tudo em
cinza-ardósia), sem numeração de página, tabela resumo sem bordas de célula,
e o detalhamento por circuito é uma sequência de pares rótulo/valor em texto
corrido. O documento inteiro sai em paisagem porque a tabela resumo precisa
da largura — o que deixa as páginas de detalhamento quase vazias, com meia
dúzia de linhas encostadas na margem esquerda.

O app tem cinco geradores de PDF (`memorialPdf`, `spdaPdf`, `capacitorPdf`,
`iluminacaoPdf`, `reportPdf`, ~1 430 linhas somadas) que duplicam a mesma
base. `iluminacaoPdf.js` traz `sectionTitle` e `keyValue` copiados letra por
letra do `memorialPdf.js` — mesmas cores, mesmo recuo de 62 mm, mesmos
corpos de fonte. As cores aparecem como literais RGB repetidos nos cinco
arquivos.

**Decisão deste brainstorm**: extrair um módulo de tema compartilhado e
redesenhar o memorial em cima dele. O tema nasce resolvendo o caso mais
difícil — o memorial é o único que precisa de tabela em paisagem *e* ficha em
retrato no mesmo documento, então a interface do módulo sai exercitada de
verdade em vez de inventada no abstrato.

**Escopo deste spec**: `src/lib/pdfTema.js` (novo) e `src/lib/memorialPdf.js`
(redesenhado). Migrar os outros quatro geradores para o tema é um segundo
ciclo, com spec próprio — trabalho de natureza diferente (migração mecânica
com verificação visual de quatro documentos), que ficaria grande demais aqui.

## Decisões já tomadas no brainstorm

- **Só estética.** Nenhum campo de identificação novo (cliente, obra,
  responsável técnico, revisão). O PDF continua conhecendo apenas o nome do
  projeto e a data — o que o app já tem. Nenhuma mudança de interface,
  nenhum campo novo para preencher, nenhuma mudança de schema.
- **O memorial serve aos dois usos** — conferência interna e anexo ao
  projeto entregue ao cliente. Precisa ficar apresentável sem virar
  burocrático.
- **Sem `jspdf-autotable`.** As tabelas continuam desenhadas à mão. Adicionar
  a dependência obrigaria a reescrever o código de tabela dos cinco
  geradores para ganhar o que o módulo de tema já vai entregar.

## Cores

`TEMA` nomeia o que hoje são literais RGB espalhados. Os valores cinza são
os que os geradores já usam (paleta slate do Tailwind); a novidade é o
copper, que é a cor de marca do app (`--color-copper-600: #b4622a` em
`src/index.css`).

| Nome | RGB | Uso |
|---|---|---|
| `copper` | 180, 98, 42 | faixa de cabeçalho, cabeçalho de tabela |
| `copperClaro` | 243, 227, 214 | barra de título da ficha |
| `tinta` | 30, 41, 59 | texto principal |
| `suave` | 100, 116, 139 | texto secundário, rótulos |
| `linha` | 203, 213, 225 | fio de separação |
| `zebra` | 248, 250, 252 | faixa alternada da tabela |
| `ok` | 5, 150, 105 | faixa de resultado |
| `erro` | 220, 38, 38 | faixa de erro |

## Módulo — `src/lib/pdfTema.js`

Exporta `TEMA` (acima) e `novoDocumento({ orientation, titulo, subtitulo })`,
que devolve um estado `s` com:

- `s.doc`, `s.pageW`, `s.pageH`, `s.margin`, `s.contentW`, `s.y` — o mesmo
  contrato que o `novoDoc` local do memorial já expõe hoje.
- `s.ensureSpace(mm)` — quebra de página, redesenhando a faixa de cabeçalho
  e reservando a altura do rodapé.
- `s.novaPagina({ orientation })` — página nova, opcionalmente trocando a
  orientação.
- `s.secao(texto)` — título de seção com fio embaixo.
- `s.par(rotulo, valor)` — linha rótulo/valor.
- `s.tabela({ cols, linhas })` — tabela com bordas de célula, zebra nas
  linhas ímpares, cabeçalho em copper repetido a cada quebra de página.
  `cols` é `[{ w, label, align }]` em mm; `linhas` é uma matriz de strings já
  formatadas (o módulo não conhece o domínio).
- `s.ficha({ titulo, subtitulo, colunas, trechos, destaque })` — a caixa de
  circuito descrita abaixo.
- `s.nota(texto)` — texto pequeno em `suave`, quebrado na largura útil.
- `s.finalizar({ rodape, arquivo })` — segunda passada e salvamento.

### Dois pontos que a interface precisa resolver

**A numeração só pode ser escrita no fim.** Não dá para imprimir "1 / 6" na
primeira página antes de saber que são 6. Por isso `finalizar` faz uma
segunda passada com `doc.setPage(i)` sobre `doc.getNumberOfPages()`,
carimbando número e nota de rodapé em todas as páginas. É o que obriga o
módulo a ter um `finalizar` em vez de cada gerador chamar `doc.save()`
diretamente.

**Trocar de orientação muda `pageW` e `pageH`.** O estado recalcula
`pageW`, `pageH` e `contentW` a cada página nova. Sem isso, a ficha em
retrato herdaria a largura útil da paisagem e vazaria para fora do papel.

### Emblema

`src/assets/emblema.png` (394×433, 183 KB) já está no bundle — a aba Sobre o
usa — então embutir no PDF não muda o peso do app. O módulo carrega a
imagem, reduz num canvas para ~80 px de lado e guarda o data URL em cache
entre chamadas, para não enfiar 183 KB em cada PDF gerado.

Se a carga falhar (imagem indisponível, canvas bloqueado), o cabeçalho cai
para só texto. A geração do PDF nunca falha por causa do emblema.

### Restrição de fonte

A fonte padrão do jsPDF é WinAnsi e **não tem** `→`, `≥`, `Δ` nem `ρ` — o
`iluminacaoPdf.js` já registra isso num comentário. Usar `->`, `>=`, "Queda".
`×` (0xD7) e `²` (0xB2) existem e podem ficar.

## Layout do memorial

### Páginas em paisagem — resumo

1. Faixa copper no topo: emblema à esquerda, título "Memorial de cálculo —
   quadro de cargas"; à direita, em copper claro, nome do projeto e data.
2. Caixa de identificação: Projeto, Preset (material, isolação, seção mínima,
   máxima multipolar, queda máxima em regime), nº de circuitos, data.
3. Tabela resumo — as mesmas dez colunas de hoje (Nº, TAG, Descrição, Tensão,
   Carga, Ib, Cabos, %R, %P, Critério), agora com bordas de célula,
   cabeçalho em copper e zebra.
4. As legendas de %R, %P e dos critérios, em nota pequena.

Não há cartões de total tipo "potência instalada": os circuitos misturam
modo corrente e modo potência, então somá-los daria um número sem
significado.

### Páginas em retrato — detalhamento

Uma página nova em retrato abre a seção, com o título "Detalhamento por
circuito" (`s.secao`). Cada circuito é uma ficha fechada:

- Barra de título em `copperClaro` com a TAG e a descrição.
- Duas colunas. Esquerda, a entrada: carga, condutores carregados, tensão,
  forma de partida (quando houver) e condutor. Direita, o resultado: Ib,
  capacidade corrigida, as três seções por critério, critério dominante e as
  quedas em regime e na partida.
- Minitabela de trechos: nº, conduto, método, distância, FCT, FCA, I′.
- Faixa em `ok` no rodapé da ficha com a designação dos cabos
  (`designacaoCabos`), ou faixa em `erro` com a mensagem, quando o
  dimensionamento falha. Na ficha com erro, as colunas de resultado e a
  minitabela de trechos não são desenhadas — não há dados.

As duas colunas são o que faz caber duas fichas por folha em retrato. Hoje,
em paisagem e coluna única, cada circuito ocupa meia folha deitada quase
vazia.

Duas por folha é o caso típico, não uma garantia: a ficha tem altura
variável (depende de quantos trechos o circuito tem) e as fichas fluem em
sequência, quebrando a página quando a próxima não couber inteira. Uma ficha
nunca é dividida entre duas páginas — é medida antes de ser desenhada, e a
página vira se faltar espaço.

### Rodapé

Em toda página: nota de norma abreviada à esquerda, "página i / N" à direita.
Hoje a nota de norma sai uma vez só, na última página.

### `exportCircuitoPDF`

O PDF de um circuito só (botão "PDF do circuito" na aba Cabos) passa a usar
a mesma `ficha`, em retrato, uma por página. Hoje ele chama o mesmo
`blocoCircuito` do memorial mas com a apresentação antiga; depois desta
mudança os dois documentos ficam visualmente coerentes de graça.

## Testes

Nenhum dos cinco geradores testa renderização, e este trabalho não introduz
essa prática. Duas peças do módulo, porém, são puras e ganham teste direto em
`src/lib/pdfTema.test.js`:

- **Ajuste de texto por largura** (o `fitWidth` que hoje vive só no
  memorial): texto que cabe volta intacto; texto que não cabe volta truncado
  com reticência e medindo menos que o limite; largura pequena demais não
  entra em laço infinito. O teste injeta um medidor de texto falso, já que
  `doc.getTextWidth` exige um documento jsPDF.
- **Distribuição de colunas**: dada uma lista de larguras em mm e a largura
  útil da página, as posições x saem acumuladas corretamente e a soma não
  ultrapassa a largura útil.

O restante é verificação visual no navegador: gerar o memorial de um quadro
com três circuitos — um simples, um com motor (queda na partida) e um com
erro de dimensionamento — e conferir faixa, tabela, quebra de página,
orientação mista, numeração e as duas fichas por folha. Também gerar o PDF de
circuito único, para confirmar que a ficha funciona sozinha.

## Fora de escopo

- Migrar `spdaPdf`, `capacitorPdf`, `iluminacaoPdf` e `reportPdf` para o
  tema — é o segundo ciclo, com spec próprio.
- Campos de identificação novos (cliente, obra, responsável técnico, CREA,
  revisão) e a interface para preenchê-los.
- Capa dedicada e espaço para assinatura do responsável técnico — decorrem
  dos campos acima, que estão fora.
- Adicionar `jspdf-autotable` ou qualquer dependência nova.
- Fonte embutida (o que levantaria a restrição WinAnsi): aumentaria o bundle
  e não é necessário para os símbolos que o memorial usa.
