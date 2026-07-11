# Dimensionador do Gustavo

Ferramenta web para dimensionar infraestruturas elétricas (eletrocalha, perfilado, leito, aramado e eletroduto) conforme a **NBR 5410**, verificando se um conjunto de cabos cabe fisicamente dentro do limite de ocupação permitido — com uma visualização por empacotamento físico (gravidade), não só uma conta de área percentual.

## O que o app faz

- **Dimensionador (aba Força / Comando)**: escolhe uma infraestrutura e dimensões, adiciona cabos (catálogo Corfio HEPR para força, CABLIE para comando/controle) e vê se eles cabem, com uma visualização realista de como os cabos se acomodariam dentro da estrutura.
- **Buscar Infraestrutura (modo reverso)**: parte de uma lista de cabos e testa contra *todas* as infraestruturas e normas cadastradas, retornando as que realmente comportam os cabos — confirmado fisicamente pelo motor de empacotamento, não só pela % de área. Suporta um limite de camadas de empilhamento (relevante para dissipação térmica/derating).
- **Importação de memorial de cálculo**: cola linhas de um memorial (formato `N#ESPECmm²`, o mesmo padrão usado nos memoriais da Eletromindy) e o app reconhece a seção de cada cabo automaticamente, sem precisar cadastrar um por um.
- **Trifólio**: suporte a feixes de 3 condutores unipolares agrupados (arranjo físico real, não só 3 cabos soltos).
- **Septo divisor**: para trechos que misturam cabos de Força e Comando na mesma calha/perfilado/leito, exigido pela NBR 5410.
- **Projetos**: salvar/carregar configurações (infraestrutura + cabos) via Supabase, opcional.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

Outros scripts:

```bash
npm run build    # build de produção (dist/)
npm run preview  # serve o build de produção localmente
npm run lint      # oxlint
```

## Configuração opcional (Supabase)

Salvar/carregar projetos é opcional — sem configurar, o app funciona normalmente, só sem persistência. Para habilitar, crie um `.env.local` na raiz:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

## Estrutura do projeto

```
src/
  App.jsx                 # layout principal, abas (Força / Comando / Buscar Infraestrutura)
  components/
    TrayVisualization.jsx # desenho SVG da infraestrutura + cabos empacotados
    ReverseMode.jsx        # aba "Buscar Infraestrutura" (modo reverso)
    ImportarPlanilha.jsx   # importação de memorial de cálculo colado
    CableForm.jsx, ComandoCableForm.jsx, CableList.jsx, ...
  hooks/
    useCableTray.js        # estado da lista de cabos + infraestrutura atual
    useProjects.js         # CRUD de projetos no Supabase
    useDarkMode.js
  lib/
    packing.js             # motor de empacotamento físico por gravidade (retangular, circular, com septo)
    occupancy.js            # cálculo de ocupação % e limite conforme NBR 5410
    reverseSearch.js        # busca de infraestruturas compatíveis (modo reverso)
    importCables.js         # parser do memorial de cálculo colado
  data/
    corfioHEPR.js           # diâmetros de cabos — catálogo Corfio HEPR 90°C 0,6/1kV
    cablieComando.js        # diâmetros de cabos de comando — catálogo CABLIE
```

## Detalhes técnicos relevantes

- **Motor de empacotamento** (`lib/packing.js`): simula os cabos "caindo" por gravidade dentro da infraestrutura (retangular ou circular), incluindo o repouso no fundo, uns sobre os outros, e o arranjo rígido do trifólio. É o mesmo motor usado tanto na visualização quanto para confirmar fisicamente os resultados do modo reverso — a % de área da NBR 5410 é necessária mas não suficiente (cabos podem "não caber" geometricamente mesmo com área sobrando).
- **Camadas de empilhamento** (`countLayers`): conta quantos cabos estão apoiados uns sobre os outros (não sobre o fundo/parede direto). Um feixe de trifólio conta como **uma unidade** — mesmo sendo fisicamente 2 condutores embaixo + 1 em cima, ele é manuseado como uma peça só.
- **Diâmetros de cabo nunca têm fallback silencioso**: se uma combinação seção/tipo não existe no catálogo, a função lança erro em vez de inventar uma medida — evita desenhos com medidas erradas.

## Deploy

Deploy contínuo no [Vercel](https://vercel.com) a partir do branch `master`.
