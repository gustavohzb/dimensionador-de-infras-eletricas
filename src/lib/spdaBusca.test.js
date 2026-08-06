import { describe, it, expect } from "vitest";
import { montarEixos, aplicarEscolhas, atendeNorma, buscarMedidas } from "./spdaBusca";
import { defaultEntrada, avaliarRisco } from "./spdaRisco";
import { EIXOS_FIXOS } from "../data/spdaEsforco";
import { RISCO_TOLERAVEL } from "../data/spdaNBR5419";

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

  it("termina dentro do orçamento de um render no pior caso", () => {
    // O painel roda a busca dentro de um useMemo, no mesmo quadro em que o
    // usuário digita. Acima de ~100 ms a digitação começa a engasgar. O caso
    // que importa é o que vai até o teto: o galpão comum para muito antes.
    const e = inatendivel();
    const inicio = performance.now();
    const r = buscarMedidas(e);
    const ms = performance.now() - inicio;

    expect(r.esgotou, "a fixture tem de bater no teto, senão não mede o pior caso").toBe(true);
    expect(r.avaliadas).toBeGreaterThan(5000);
    expect(r.combinacoes).toHaveLength(0);
    expect(ms, `${r.avaliadas} avaliações em ${ms.toFixed(1)} ms`).toBeLessThan(100);
  });

  it("termina dentro do orçamento de um render no caso comum", () => {
    const e = galpao();
    const inicio = performance.now();
    const r = buscarMedidas(e);
    const ms = performance.now() - inicio;
    expect(r.esgotou).toBe(false); // achou as três sem esbarrar no teto
    expect(ms, `${r.avaliadas} avaliações em ${ms.toFixed(1)} ms`).toBeLessThan(100);
  });
});
