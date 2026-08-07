import { describe, it, expect } from "vitest";
import { montarEixos, aplicarEscolhas, atendeNorma, buscarMedidas } from "./spdaBusca";
import { defaultEntrada, avaliarRisco } from "./spdaRisco";
import { EIXOS_FIXOS } from "../data/spdaEsforco";
import {
  RISCO_TOLERAVEL, RISCO_RF, PISO_RT, PROVIDENCIAS_RP,
  SPDA_PB, DPS_PSPD, DPS_PEB, FIACAO_KS3, MEDIDAS_PTA, MEDIDAS_PTU,
} from "../data/spdaNBR5419";

// Galpão padrão com N_G real: reprova em R1 e em F sem proteção nenhuma.
function galpao() {
  const e = defaultEntrada();
  e.estrutura.ng = 14;
  return e;
}

// Fixture com os TRÊS critérios vivos ao mesmo tempo:
//  - explosaoOuRiscoVida traz R_C, R_M, R_W e R_Z para dentro de R1 (nota "a"
//    da Tabela 2). Sem isso os eixos de DPS, fiação e blindagem não mexem em
//    R1 nenhum, e qualquer teste sobre eles vira tautologia;
//  - patrimonioCultural com c_z > 0 faz R3 existir;
//  - o sistema interno padrão já dá uma frequência de danos não nula.
function galpaoComTodosOsCriterios() {
  const e = galpao();
  e.estrutura.explosaoOuRiscoVida = true;
  e.estrutura.patrimonioCultural = true;
  e.estrutura.cz = 1;
  e.estrutura.ct = 1;
  return e;
}

// Estrutura que o catálogo inteiro não resolve: N_G altíssimo, área enorme e
// zona 0 de explosão. Nem com todos os eixos no degrau máximo ela passa, então
// a busca só para no teto de avaliações — é o pior caso de tempo, e o único
// que exercita o teto de verdade.
function inatendivel() {
  const e = defaultEntrada();
  e.estrutura.ng = 100000;
  e.estrutura.L = 200;
  e.estrutura.W = 200;
  e.estrutura.H = 40;
  e.estrutura.riscoIncendio = "explosaoZ0";
  e.estrutura.explosaoOuRiscoVida = true;
  return e;
}

// Estrutura que JÁ tem proteção declarada em todos os eixos onde a busca podia
// recomendar uma retirada. As outras fixtures partem da estrutura nua, e nela o
// degrau zero do catálogo — que força o pior valor de cada eixo — coincide com
// o que já existe: é a única forma em que "a sugestão apaga a proteção" não
// consegue aparecer, e por isso nenhum teste antigo pegava o defeito.
//
// Proteção parcial de propósito nos eixos de DPS e de tensões de toque vindas
// da linha: assim o eixo não colapsa em "manter" e ainda sobra degrau melhor
// para a busca oferecer, o que exercita a filtragem em vez de só o bloqueio.
function galpaoJaProtegido() {
  const e = galpao();
  e.protecoes.spdaNp = "npI";
  e.protecoes.dpsClasseI = "npI";
  e.protecoes.fiacao = "blindado";
  e.protecoes.blindagemContinua = true;
  e.protecoes.medidasPta = ["restricoesFisicas"];
  e.protecoes.medidasPtu = ["avisos", "isolacao"];
  e.estrutura.piso = "britaCarpete";
  e.estrutura.providencias = "manuais";
  return e;
}

// Oráculo independente da implementação: o multiplicador que cada eixo aplica
// à sua probabilidade de dano, lido direto das tabelas normativas. Menor é
// melhor em todos eles. Deliberadamente NÃO reusa os ajudantes da busca — um
// teste que chamasse a mesma função que está sob teste não provaria nada sobre
// o que a norma diz.
const valorNormativo = (tabela, id) => tabela.find((t) => t.id === id).valor;
const produtoNormativo = (tabela, ids) =>
  ids.reduce((acc, id) => acc * valorNormativo(tabela, id), 1);

function fatoresPorEixo({ estrutura, protecoes }) {
  return {
    spdaNp: valorNormativo(SPDA_PB, protecoes.spdaNp),
    dpsNp: valorNormativo(DPS_PSPD, protecoes.dpsNp),
    dpsClasseI: valorNormativo(DPS_PEB, protecoes.dpsClasseI),
    fiacao: valorNormativo(FIACAO_KS3, protecoes.fiacao),
    medidasPta: produtoNormativo(MEDIDAS_PTA, protecoes.medidasPta),
    medidasPtu: produtoNormativo(MEDIDAS_PTU, protecoes.medidasPtu),
    blindagem: protecoes.blindagemContinua
      ? 1e-4
      : Math.min(1, protecoes.larguraMalha ? 0.12 * Number(protecoes.larguraMalha) : 1),
    piso: valorNormativo(PISO_RT, estrutura.piso),
    providencias: valorNormativo(PROVIDENCIAS_RP, estrutura.providencias),
  };
}

describe("a busca nunca recomenda retirar proteção já declarada", () => {
  it("monta todo eixo com 'manter como está' de patch vazio no degrau zero", () => {
    // O degrau zero do catálogo força o PIOR valor do eixo ("Sem SPDA",
    // "larguraMalha: null"). Aplicá-lo sem olhar o estado fazia a linha de
    // partida da busca ser a estrutura despida do que o engenheiro informou.
    for (const eixo of montarEixos(galpaoJaProtegido())) {
      expect(eixo.opcoes[0].id, eixo.id).toBe("manter");
      expect(eixo.opcoes[0].patch, eixo.id).toEqual({});
      expect(eixo.opcoes[0].esforco, eixo.id).toBe(0);
    }
  });

  it("o degrau zero devolve exatamente a estrutura declarada", () => {
    const e = galpaoJaProtegido();
    const eixos = montarEixos(e);
    const partida = aplicarEscolhas(e, eixos, eixos.map(() => 0));
    expect(partida.protecoes).toEqual(e.protecoes);
    expect(partida.estrutura).toEqual(e.estrutura);
  });

  it("só oferece degraus estritamente melhores que o declarado", () => {
    const e = galpaoJaProtegido();
    const eixos = montarEixos(e);
    const base = fatoresPorEixo(e);
    const zero = eixos.map(() => 0);

    for (let i = 0; i < eixos.length; i++) {
      for (let j = 1; j < eixos[i].opcoes.length; j++) {
        const indices = [...zero];
        indices[i] = j;
        const fatores = fatoresPorEixo(aplicarEscolhas(e, eixos, indices));
        const onde = `${eixos[i].id} degrau ${j} (${eixos[i].opcoes[j].id})`;
        expect(fatores[eixos[i].id], onde).toBeLessThan(base[eixos[i].id]);
        // E mexer num eixo não pode mexer em outro.
        for (const chave of Object.keys(base)) {
          if (chave === eixos[i].id) continue;
          expect(fatores[chave], `${onde} alterou ${chave}`).toBe(base[chave]);
        }
      }
    }
  });

  it("colapsa em 'manter' o eixo que já está no melhor degrau", () => {
    const e = galpaoJaProtegido();
    const eixos = montarEixos(e);
    // fiação blindada (K_S3 = 10⁻⁴), blindagem contínua e restrições físicas
    // (P_TA = 0) são o topo de suas tabelas: não há o que oferecer.
    for (const id of ["fiacao", "blindagem", "medidasPta"]) {
      const eixo = eixos.find((x) => x.id === id);
      expect(eixo.opcoes.map((o) => o.id), id).toEqual(["manter"]);
    }
    // E o SPDA, que está em NP I, só pode subir para os dois degraus acima.
    expect(eixos.find((x) => x.id === "spdaNp").opcoes.map((o) => o.id)).toEqual([
      "manter",
      "npIDescidaNatural",
      "coberturaMetalica",
    ]);
  });

  it("nenhuma combinação devolvida é pior que o declarado, em nenhum eixo", () => {
    // A invariante do módulo inteiro. O defeito media assim: a estrutura abaixo
    // era oferecida uma "Opção 1" que apagava SPDA, fiação blindada, blindagem
    // contínua e restrições físicas, não listava nenhuma dessas remoções (todas
    // custam esforço zero) e multiplicava R1 por oito.
    const e = galpaoJaProtegido();
    const base = fatoresPorEixo(e);
    const rBase = avaliarRisco(e);
    const r = buscarMedidas(e);
    expect(r.combinacoes.length).toBeGreaterThan(0);

    const folga = 1 + 1e-12;
    for (const [i, c] of r.combinacoes.entries()) {
      const fatores = fatoresPorEixo(c.entrada);
      for (const chave of Object.keys(base)) {
        expect(fatores[chave], `opção ${i + 1} piorou ${chave}`).toBeLessThanOrEqual(base[chave]);
      }
      expect(c.r1, `R1 da opção ${i + 1}`).toBeLessThanOrEqual(rBase.r1 * folga);
      for (const f of avaliarRisco(c.entrada).frequencias) {
        const antes = rBase.frequencias.find((x) => x.id === f.id);
        expect(f.maior, `F da opção ${i + 1}`).toBeLessThanOrEqual(antes.maior * folga);
      }
    }
  });

  it("lista toda alteração que a sugestão faz, e nenhuma dela é remoção", () => {
    // `descreverEscolhas` filtrava por esforço > 0, e uma remoção custa zero:
    // era o que escondia as retiradas da lista mostrada na tela.
    const e = galpaoJaProtegido();
    const eixos = montarEixos(e);
    for (const c of buscarMedidas(e).combinacoes) {
      const mexidos = eixos
        .map((eixo, i) => ({ eixo, i }))
        .filter(({ i }) => c.indices[i] > 0)
        .map(({ eixo }) => eixo.label);
      expect(c.escolhas.map((x) => x.eixo)).toEqual(mexidos);
    }
  });

  it("também não retira proteção quando o parcial é tudo o que ela acha", () => {
    // O bloco "melhor encontrado" do painel vem daqui, e cai no mesmo defeito:
    // sem a correção, o parcial de uma estrutura protegida era ela despida.
    const e = galpaoJaProtegido();
    const base = fatoresPorEixo(e);
    const r = buscarMedidas(e, { teto: 1 });
    expect(r.combinacoes).toHaveLength(0);
    const fatores = fatoresPorEixo(r.melhorParcial.entrada);
    for (const chave of Object.keys(base)) {
      expect(fatores[chave], chave).toBe(base[chave]);
    }
  });
});

describe("a busca não credita providências proibidas em zona de explosão", () => {
  // Tabela C.4: a primeira linha é "Nenhuma providência, OU zona com risco de
  // explosão", r_p = 1. Extintores e alarme não reduzem nada ali.
  const explosivas = RISCO_RF.filter((r) => r.id.startsWith("explosao")).map((r) => r.id);

  it("a fixture cobre todas as zonas de explosão da Tabela C.5", () => {
    expect(explosivas).toEqual(["explosaoZ0", "explosaoZ1", "explosaoZ2"]);
  });

  it("trava o eixo de providências em toda zona de explosão", () => {
    for (const id of explosivas) {
      const e = galpao();
      e.estrutura.riscoIncendio = id;
      const eixo = montarEixos(e).find((x) => x.id === "providencias");
      expect(eixo.opcoes.map((o) => o.id), id).toEqual(["manter"]);
    }
  });

  it("continua oferecendo providências fora de zona de explosão", () => {
    // Guarda contra a trava virar bloqueio geral e matar um eixo legítimo.
    const e = galpao();
    e.estrutura.riscoIncendio = "incendioAlto";
    const eixo = montarEixos(e).find((x) => x.id === "providencias");
    expect(eixo.opcoes.map((o) => o.id)).toEqual(["manter", "manuais", "automaticas"]);
  });

  it("não devolve recomendação que dependa de crédito por providências", () => {
    // O caso medido: galpão padrão, N_G = 6, zona 1 de explosão, sem linhas
    // externas. A busca devolvia "SPDA NP IV + extintores/alarme manual" a
    // R1 = 9,44 × 10⁻⁶ e marcava como conforme; com o r_p = 1 que a norma
    // exige, o mesmo projeto dá R1 ≈ 1,88 × 10⁻⁵, quase o dobro do limite.
    const e = defaultEntrada();
    e.estrutura.ng = 6;
    e.estrutura.riscoIncendio = "explosaoZ1";
    e.linhas = [];
    e.protecoes.sistemas = [];

    const r = buscarMedidas(e);
    expect(r.combinacoes.length).toBeGreaterThan(0);
    for (const c of r.combinacoes) {
      expect(c.entrada.estrutura.providencias).toBe("nenhuma");
      expect(c.escolhas.map((x) => x.eixo)).not.toContain("Providências contra incêndio");
      // E o R1 prometido é o que a norma dá com r_p = 1.
      expect(avaliarRisco(c.entrada).r1).toBeLessThanOrEqual(RISCO_TOLERAVEL.R1);
    }
  });
});

describe("o catálogo não é confundido com a norma", () => {
  // Estrutura em que os degraus de SPDA que o catálogo omitia são a diferença
  // entre "nenhuma combinação resolve" e resolver. Com o SPDA parando em NP I
  // (P_B = 0,02), o melhor arranjo de toda a grade dava R1 = 1,19 × 10⁻⁵ e a
  // busca varria tudo para responder que nada resolvia — sendo que a Tabela B.2
  // ainda tem duas linhas mais fortes.
  function galpaoQueExigeDescidaNatural() {
    const e = defaultEntrada();
    e.estrutura.ng = 32;
    e.estrutura.L = 100;
    e.estrutura.W = 60;
    e.estrutura.H = 20;
    e.estrutura.riscoIncendio = "incendioAlto";
    e.protecoes.sistemas = [];
    return e;
  }

  it("resolve o que o catálogo antigo declarava insolúvel", () => {
    const e = galpaoQueExigeDescidaNatural();
    const eixos = montarEixos(e);
    const iSpda = eixos.findIndex((x) => x.id === "spdaNp");

    // O topo do catálogo ANTIGO — SPDA em NP I, todo o resto no máximo — de
    // fato não atende. Sem isto o teste abaixo não provaria que a fixture
    // exercita a lacuna.
    const topo = eixos.map((x) => x.opcoes.length - 1);
    const comNpI = [...topo];
    comNpI[iSpda] = eixos[iSpda].opcoes.findIndex((o) => o.id === "npI");
    expect(atendeNorma(avaliarRisco(aplicarEscolhas(e, eixos, comNpI)))).toBe(false);

    const r = buscarMedidas(e);
    expect(r.combinacoes.length).toBeGreaterThan(0);
    // E toda solução precisa de uma das duas linhas que faltavam.
    for (const c of r.combinacoes) {
      expect(["npIDescidaNatural", "coberturaMetalica"]).toContain(c.entrada.protecoes.spdaNp);
      expect(atendeNorma(avaliarRisco(c.entrada))).toBe(true);
    }
  });

  it("mantém o esforço não decrescente depois de ganhar degraus", () => {
    // A otimalidade da busca depende disso, e os degraus novos entraram no meio
    // e no fim das escadas.
    for (const eixo of montarEixos(galpao())) {
      const esforcos = eixo.opcoes.map((o) => o.esforco);
      expect(esforcos, eixo.id).toEqual([...esforcos].sort((a, b) => a - b));
    }
  });
});

describe("busca de medidas de proteção", () => {
  it("monta os eixos fixos mais piso e providências", () => {
    const ids = montarEixos(galpao()).map((x) => x.id);
    expect(ids).toContain("spdaNp");
    expect(ids).toContain("piso");
    expect(ids).toContain("providencias");
  });

  it("não oferece piso pior do que o já informado", () => {
    const e = galpao();
    e.estrutura.piso = "asfaltoMadeira"; // o melhor da Tabela C.3
    const piso = montarEixos(e).find((x) => x.id === "piso");
    expect(piso.opcoes).toHaveLength(1); // só "manter como está"
    expect(piso.opcoes[0].esforco).toBe(0);
  });

  it("ordena os degraus de piso e de providências do mais barato ao mais caro", () => {
    // Sem isto, inverter o comparador de `eixoQueMelhora` passaria despercebido
    // e a busca rotularia a troca mais cara de piso como a mais barata.
    const eixos = montarEixos(galpao()); // piso "terraConcreto", providências "nenhuma"
    const piso = eixos.find((x) => x.id === "piso");
    expect(piso.opcoes.map((o) => o.id)).toEqual([
      "manter",
      "marmoreCeramica",
      "britaCarpete",
      "asfaltoMadeira",
    ]);
    expect(piso.opcoes.map((o) => o.esforco)).toEqual([0, 3, 4, 5]);

    const providencias = eixos.find((x) => x.id === "providencias");
    expect(providencias.opcoes.map((o) => o.id)).toEqual(["manter", "manuais", "automaticas"]);
    expect(providencias.opcoes.map((o) => o.esforco)).toEqual([0, 3, 6]);
  });

  it("só oferece 'manter' quando o id atual está fora da tabela", () => {
    // Projeto salvo com um id que o catálogo não tem mais. Tratar o
    // desconhecido como o pior valor possível faria o eixo oferecer a tabela
    // inteira como melhoria — inclusive opções que PIORAM o risco.
    const e = galpao();
    e.estrutura.piso = "pisoDeUmProjetoAntigo";
    e.estrutura.providencias = "providenciaQueSaiuDaNorma";
    const eixos = montarEixos(e);
    const piso = eixos.find((x) => x.id === "piso");
    const providencias = eixos.find((x) => x.id === "providencias");

    expect(piso.opcoes.map((o) => o.id)).toEqual(["manter"]);
    expect(providencias.opcoes.map((o) => o.id)).toEqual(["manter"]);

    // E, com isso, nenhum degrau desses eixos aumenta R1.
    const base = eixos.map(() => 0);
    const r1Base = avaliarRisco(aplicarEscolhas(e, eixos, base)).r1;
    for (const eixo of [piso, providencias]) {
      const i = eixos.indexOf(eixo);
      for (let j = 1; j < eixo.opcoes.length; j++) {
        const indices = [...base];
        indices[i] = j;
        expect(avaliarRisco(aplicarEscolhas(e, eixos, indices)).r1).toBeLessThanOrEqual(r1Base);
      }
    }
  });

  it("aplica as escolhas nas duas partes do estado", () => {
    const e = galpao();
    const eixos = montarEixos(e);
    // Um degrau em cada lado: SPDA fica em `protecoes`, providências contra
    // incêndio ficam em `estrutura`.
    const indices = eixos.map((x) => {
      if (x.id === "spdaNp") return 3;
      if (x.id === "providencias") return 2;
      return 0;
    });
    const nova = aplicarEscolhas(e, eixos, indices);

    expect(nova.protecoes.spdaNp).toBe("npII");
    expect(nova.estrutura.providencias).toBe("automaticas");

    // E a entrada original fica intacta nos dois lados, sem compartilhar objeto.
    expect(e.protecoes.spdaNp).toBe("nenhum");
    expect(e.estrutura.providencias).toBe("nenhuma");
    expect(nova.protecoes).not.toBe(e.protecoes);
    expect(nova.estrutura).not.toBe(e.estrutura);
  });

  it("não devolve estado que compartilhe array com o catálogo", () => {
    // O `entrada` de uma combinação vai para a tela para o usuário aplicar. Se
    // ele apontasse para o array do catálogo, o primeiro push corromperia
    // EIXOS_FIXOS pela sessão inteira.
    const e = galpao();
    const eixos = montarEixos(e);
    const pta = eixos.find((x) => x.id === "medidasPta");
    const degrau = pta.opcoes.findIndex((o) => o.id === "avisosIsolacao");
    const indices = eixos.map((x) => (x.id === "medidasPta" ? degrau : 0));
    const nova = aplicarEscolhas(e, eixos, indices);

    const doCatalogo = EIXOS_FIXOS.find((x) => x.id === "medidasPta").opcoes[degrau].patch.medidasPta;
    expect(nova.protecoes.medidasPta).toEqual(doCatalogo);
    expect(nova.protecoes.medidasPta).not.toBe(doCatalogo);

    nova.protecoes.medidasPta.push("restricoesFisicas");
    expect(doCatalogo).toEqual(["avisos", "isolacaoDescidas"]);

    // E o catálogo está congelado, para que um aliasing futuro estoure alto.
    expect(Object.isFrozen(doCatalogo)).toBe(true);
  });

  it("recusa um eixo cujo alvo ela não sabe copiar", () => {
    // `aplicarEscolhas` só copia `estrutura` e `protecoes`. Um alvo fora disso
    // seria escrito direto no objeto do chamador.
    const e = galpao();
    const eixoTorto = {
      id: "invalido",
      label: "Eixo com alvo estranho",
      alvo: "linhas",
      opcoes: [{ id: "manter", label: "Manter", esforco: 0, patch: {} }],
    };
    expect(() => aplicarEscolhas(e, [eixoTorto], [0])).toThrow(/alvo desconhecido/);
  });

  it("subir um degrau nunca piora R1, R3 nem a frequência de danos", () => {
    // A poda da busca ("quem atende não é expandido") só é válida se os TRÊS
    // critérios forem monótonos, não só R1.
    const e = galpaoComTodosOsCriterios();
    const eixos = montarEixos(e);
    const base = eixos.map(() => 0);
    const rBase = avaliarRisco(aplicarEscolhas(e, eixos, base));

    // A fixture precisa mesmo exercitar os três critérios e as componentes de
    // sistemas internos, senão o teste vira tautologia.
    expect(rBase.chavesR1).toEqual(expect.arrayContaining(["RC", "RM", "RW", "RZ"]));
    expect(rBase.r3).toBeGreaterThan(0);
    expect(rBase.frequencias.length).toBeGreaterThan(0);
    expect(rBase.frequencias.every((f) => f.maior > 0)).toBe(true);

    const folga = 1 + 1e-12;
    for (let i = 0; i < eixos.length; i++) {
      for (let j = 1; j < eixos[i].opcoes.length; j++) {
        const indices = [...base];
        indices[i] = j;
        const r = avaliarRisco(aplicarEscolhas(e, eixos, indices));
        const onde = `${eixos[i].id} degrau ${j}`;
        expect(r.r1, `R1 em ${onde}`).toBeLessThanOrEqual(rBase.r1 * folga);
        expect(r.r3, `R3 em ${onde}`).toBeLessThanOrEqual(rBase.r3 * folga);
        for (const f of r.frequencias) {
          const antes = rBase.frequencias.find((x) => x.id === f.id);
          expect(f.maior, `F do sistema ${f.id} em ${onde}`).toBeLessThanOrEqual(antes.maior * folga);
        }
      }
    }
  });

  it("os eixos de DPS, fiação e blindagem realmente mexem em R1 na fixture", () => {
    // Guarda contra a monotonicidade voltar a ser vacuosa: se um dia estes
    // eixos deixarem de influenciar R1 na fixture, o teste acima não estará
    // mais provando nada sobre eles — e `dpsNp` é justamente o eixo que a
    // recomendação vencedora usa.
    const e = galpaoComTodosOsCriterios();
    const eixos = montarEixos(e);
    const base = eixos.map(() => 0);
    const r1Base = avaliarRisco(aplicarEscolhas(e, eixos, base)).r1;

    for (const id of ["dpsNp", "fiacao", "blindagem"]) {
      const i = eixos.findIndex((x) => x.id === id);
      const indices = [...base];
      indices[i] = eixos[i].opcoes.length - 1;
      expect(avaliarRisco(aplicarEscolhas(e, eixos, indices)).r1, id).toBeLessThan(r1Base);
    }
  });

  it("devolve combinações que realmente atendem, em ordem de esforço", () => {
    const r = buscarMedidas(galpao());
    expect(r.combinacoes.length).toBeGreaterThan(0);

    for (const c of r.combinacoes) {
      expect(atendeNorma(avaliarRisco(c.entrada))).toBe(true);
    }
    const esforcos = r.combinacoes.map((c) => c.esforco);
    expect(esforcos).toEqual([...esforcos].sort((a, b) => a - b));
  });

  it("não repete uma recomendação anterior com medida sobrando", () => {
    // Não expandir quem atende fecha só o caminho direto até o supersete; pela
    // volta, por outro pai, ele ainda chega à fila. Sem a poda de dominadas, a
    // terceira recomendação saía como a primeira mais uma medida inútil.
    const r = buscarMedidas(galpao());
    expect(r.combinacoes.length).toBeGreaterThan(1);

    for (let i = 1; i < r.combinacoes.length; i++) {
      for (let j = 0; j < i; j++) {
        const sobra = r.combinacoes[i].indices.every((v, k) => v >= r.combinacoes[j].indices[k]);
        expect(sobra, `a #${i + 1} é a #${j + 1} com medida a mais`).toBe(false);
      }
    }
  });

  it("promete o R1 que a combinação de fato produz", () => {
    const [c] = buscarMedidas(galpao()).combinacoes;
    expect(avaliarRisco(c.entrada).r1).toBeCloseTo(c.r1, 15);
  });

  it("lista só os eixos que saíram do degrau zero", () => {
    const [c] = buscarMedidas(galpao()).combinacoes;
    expect(c.escolhas.length).toBeGreaterThan(0);
    expect(c.escolhas.every((x) => x.esforco > 0)).toBe(true);
  });

  it("não recomenda nada quando a estrutura já atende", () => {
    const e = galpao();
    e.estrutura.nz = 0; // ninguém na zona: R1 = 0
    e.protecoes.sistemas = [];
    const r = buscarMedidas(e);
    expect(r.combinacoes).toHaveLength(1);
    expect(r.combinacoes[0].esforco).toBe(0);
    expect(r.combinacoes[0].escolhas).toEqual([]);
    // A busca respondeu tudo o que tinha a responder: não foi truncada.
    expect(r.esgotou).toBe(false);
  });

  it("não recomenda nada enquanto não houver N_G", () => {
    const e = defaultEntrada(); // ng nulo: nenhum município escolhido ainda
    // Sem N_G todo número de eventos é zero e a estrutura sem proteção
    // nenhuma "passa" na norma — daí o risco de a busca dizer que não falta
    // nada. É exatamente o que a guarda impede.
    expect(atendeNorma(avaliarRisco(e))).toBe(true);

    const r = buscarMedidas(e);
    expect(r.semNg).toBe(true);
    expect(r.combinacoes).toEqual([]);
    expect(r.melhorParcial).toBeNull();
    expect(r.avaliadas).toBe(0);

    expect(buscarMedidas(galpao()).semNg).toBe(false);
  });

  it("avisa quando para sem achar solução, com o melhor parcial", () => {
    // Teto de 1 avaliação: só o degrau zero é testado, e o galpão sem
    // proteção reprova. Força o caminho "não achei" de forma determinística,
    // sem depender de uma estrutura extrema que o catálogo talvez resolvesse.
    const r = buscarMedidas(galpao(), { teto: 1 });
    expect(r.combinacoes).toHaveLength(0);
    expect(r.esgotou).toBe(true); // truncada pelo teto
    expect(r.melhorParcial).not.toBeNull();
    expect(r.melhorParcial.r1).toBeGreaterThan(0);
    expect(r.melhorParcial.escolhas).toEqual([]);
  });

  it("escolhe o melhor parcial pelo pior excesso normalizado", () => {
    // O critério da busca são os três limites juntos, então o parcial mostrado
    // é o que chegou mais perto de passar em todos — e não o de menor R1, que
    // podia estar reprovando feio na frequência de danos.
    const r = buscarMedidas(galpao(), { teto: 40 });
    expect(r.combinacoes).toHaveLength(0);

    const res = avaliarRisco(r.melhorParcial.entrada);
    const esperado = Math.max(
      res.r1 / RISCO_TOLERAVEL.R1,
      ...res.frequencias.map((f) => f.maior / f.ft)
    );
    expect(r.melhorParcial.excesso).toBe(esperado);
    expect(r.melhorParcial.excesso).toBeGreaterThan(1); // ainda reprova em algo
  });

  it("para exatamente no teto de avaliações", () => {
    // O galpão precisa de bem mais de 50 avaliações até a primeira solução, e
    // a busca tem de parar na 50ª — nem antes, nem uma depois.
    const r = buscarMedidas(galpao(), { teto: 50 });
    expect(r.avaliadas).toBe(50);
    expect(r.combinacoes).toHaveLength(0);
    expect(r.esgotou).toBe(true);
  });

  it("varre a grade inteira no pior caso, sem se declarar truncada", () => {
    // O painel roda a busca num botão, não a cada tecla, então o orçamento é o
    // da espera de quem clicou — segundos, não milissegundos. O que precisa
    // valer é que "nenhuma combinação resolve" só saia depois de olhar tudo:
    // uma busca truncada não pode se passar por uma varredura completa.
    const e = inatendivel();
    const inicio = performance.now();
    const r = buscarMedidas(e);
    const ms = performance.now() - inicio;

    expect(r.combinacoes).toHaveLength(0);
    expect(r.esgotou, "varreu tudo, então não foi truncada").toBe(false);
    // Nenhum arranjo desta fixture atende, então a busca só para quando acaba a
    // fila — ou seja, avalia a grade inteira. O tamanho é conferido contra os
    // eixos de verdade em vez de escrito à mão: a grade muda quando o catálogo
    // ganha degraus (SPDA e medidas de toque ganharam) e quando o estado
    // declarado tira degraus da mesa (esta fixture é zona 0 de explosão, onde a
    // Tabela C.4 proíbe crédito por providências contra incêndio).
    const grade = montarEixos(e).reduce((acc, x) => acc * x.opcoes.length, 1);
    expect(r.avaliadas).toBe(grade);
    expect(ms, `${r.avaliadas} avaliações em ${ms.toFixed(0)} ms`).toBeLessThan(6000);
  });

  it("responde o caso comum em poucos milissegundos", () => {
    // Continua importando: é o caminho que o usuário percorre quase sempre, e
    // ele não pode ficar refém do custo do pior caso.
    const e = galpao();
    const inicio = performance.now();
    const r = buscarMedidas(e);
    const ms = performance.now() - inicio;
    expect(r.combinacoes).toHaveLength(3);
    expect(r.esgotou).toBe(false);
    expect(ms, `${r.avaliadas} avaliações em ${ms.toFixed(1)} ms`).toBeLessThan(200);
  });

  it("acha recomendações onde o teto baixo de antes não achava", () => {
    // Caso real que motivou a mudança: com teto de 6 000 avaliações este
    // galpão voltava com zero recomendações e o painel dizia que nada
    // resolvia. Ele precisa de ~30 000 avaliações para reunir as três.
    const e = galpao();
    e.estrutura.ng = 32;
    e.estrutura.L = 120;
    e.estrutura.W = 80;
    e.estrutura.H = 25;

    expect(buscarMedidas(e, { teto: 6000 }).combinacoes).toHaveLength(0);

    const r = buscarMedidas(e);
    expect(r.combinacoes).toHaveLength(3);
    expect(r.esgotou).toBe(false);
  });
});
