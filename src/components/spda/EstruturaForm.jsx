import { Field } from "../cabos/CircuitoForm";
import {
  LOCALIZACAO_CD, CONSTRUCAO_RS, TIPO_ESTRUTURA_LF, PISO_RT,
  RISCO_RF, PROVIDENCIAS_RP, PERIGO_HZ, LO_POR_ESTRUTURA,
} from "../../data/spdaNBR5419";
import { horasPorAno } from "../../lib/spdaRisco";
import CampoNG from "./CampoNG";

const inputCls =
  "w-full rounded-xs border border-slate-300 bg-white px-2.5 py-1.5 text-sm tabular-nums text-slate-800 focus:outline-none focus:ring-2 focus:ring-copper-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

// Cada bloco de campos vem com uma linha dizendo o que aquele grupo controla no
// resultado — sem isso o formulário vira uma lista de siglas da norma.
function Grupo({ titulo, explicacao, children }) {
  return (
    <section className="mt-4 first:mt-0">
      <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-copper-700 dark:text-copper-400">
        {titulo}
      </h3>
      <p className="mb-2 mt-0.5 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">
        {explicacao}
      </p>
      {children}
    </section>
  );
}

function Selecao({ label, tip, tabela, value, onChange }) {
  return (
    <Field label={label} tip={tip}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {tabela.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>
    </Field>
  );
}

function Numero({ label, tip, value, onChange }) {
  return (
    <Field label={label} tip={tip}>
      <input
        type="number"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={inputCls}
      />
    </Field>
  );
}

export default function EstruturaForm({ value: e, onChange: set }) {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
        Estrutura
      </h2>

      <Grupo
        titulo="Geometria"
        explicacao="Dimensões externas da edificação. Elas definem a área de exposição: uma estrutura maior e mais alta atrai mais descargas, e a altura pesa mais que a planta porque a área de captação cresce com o triplo dela."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Numero label="Comprimento L (m)" value={e.L} onChange={(v) => set({ L: v })} />
          <Numero label="Largura W (m)" value={e.W} onChange={(v) => set({ W: v })} />
          <Numero label="Altura H (m)" value={e.H} onChange={(v) => set({ H: v })} />
          <Numero
            label="Saliência H_P (m)"
            tip="Altura de uma saliência na cobertura — torre, chaminé, casa de máquinas, antena. Deixe vazio se a cobertura for plana. Havendo saliência, a norma manda usar a maior das duas áreas: a da estrutura ou a do círculo em volta da saliência (equações A.1 e A.2)."
            value={e.Hp}
            onChange={(v) => set({ Hp: v })}
          />
        </div>
      </Grupo>

      <Grupo
        titulo="Exposição"
        explicacao="Quantas descargas caem na região e o quanto a vizinhança abriga ou expõe a estrutura. Juntos, definem quantos eventos perigosos por ano ela recebe."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CampoNG ng={e.ng} uf={e.uf} municipio={e.municipio} onChange={set} />
          <Selecao
            label="Localização relativa (C_D)"
            tip="O que existe em volta, num raio de três vezes a altura da estrutura. Prédios mais altos ao redor funcionam como para-raios e reduzem o fator a 0,25; já um galpão isolado no alto de um morro dobra a exposição (Tabela A.1)."
            tabela={LOCALIZACAO_CD}
            value={e.cd}
            onChange={(v) => set({ cd: v })}
          />
        </div>
      </Grupo>

      <Grupo
        titulo="Características da edificação"
        explicacao="Não mudam quantas descargas caem, e sim o tamanho do estrago quando uma cai: quanto se perde por choque elétrico e por incêndio."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Selecao
            label="Tipo de construção (r_S)"
            tip="Do que a edificação é feita. Madeira ou alvenaria simples dobra a perda em relação a estrutura metálica ou concreto armado, que resistem melhor ao dano (Tabela C.7)."
            tabela={CONSTRUCAO_RS}
            value={e.construcao}
            onChange={(v) => set({ construcao: v })}
          />
          <Selecao
            label="Uso da edificação (L_F)"
            tip="Para que a edificação serve. Define quantas vítimas um dano físico costuma causar: um hospital ou escola pesa dez vezes mais que um galpão industrial, porque há mais gente e menos capacidade de sair (Tabela C.2)."
            tabela={TIPO_ESTRUTURA_LF}
            value={e.tipoEstrutura}
            onChange={(v) => set({ tipoEstrutura: v })}
          />
          <Selecao
            label="Piso da área ocupada (r_t)"
            tip="De que é feito o chão onde as pessoas pisam. Quanto mais isolante, menor a corrente que passa pelo corpo numa tensão de passo: asfalto ou madeira protegem mil vezes mais que terra ou concreto (Tabela C.3)."
            tabela={PISO_RT}
            value={e.piso}
            onChange={(v) => set({ piso: v })}
          />
          <Selecao
            label="Risco de incêndio ou explosão (r_f)"
            tip="Classificação pela carga de incêndio, em MJ/m²: alto acima de 800, normal entre 400 e 800, baixo abaixo de 400. Havendo atmosfera explosiva, use a zona correspondente — é o fator que mais pesa na perda por danos físicos (Tabela C.5)."
            tabela={RISCO_RF}
            value={e.riscoIncendio}
            onChange={(v) => set({ riscoIncendio: v })}
          />
          <Selecao
            label="Combate a incêndio (r_p)"
            tip="O que existe instalado para conter o fogo. Se houver mais de uma providência, a norma manda usar a de menor valor — ou seja, a mais eficaz. Em estrutura com risco de explosão o fator é sempre 1, sem redução (Tabela C.4)."
            tabela={PROVIDENCIAS_RP}
            value={e.providencias}
            onChange={(v) => set({ providencias: v })}
          />
          <Selecao
            label="Perigo especial (h_z)"
            tip="Condições que agravam a evacuação e multiplicam a perda: pânico em eventos com muita gente, ou pessoas que não conseguem sair sozinhas, como em hospitais. Um evento com mais de mil pessoas multiplica a perda por dez (Tabela C.6)."
            tabela={PERIGO_HZ}
            value={e.perigoEspecial}
            onChange={(v) => set({ perigoEspecial: v })}
          />
        </div>
      </Grupo>

      <Grupo
        titulo="Ocupação"
        explicacao="Quantas pessoas ficam expostas e por quanto tempo. A perda por vidas humanas é proporcional às duas coisas: metade das pessoas, metade da perda; metade do tempo, metade da perda."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Numero
            label="Pessoas na zona (n_z)"
            tip="Quantas pessoas ficam na parte da estrutura que está sendo analisada. Nesta versão a estrutura inteira é uma zona só, então normalmente este número é igual ao de baixo."
            value={e.nz}
            onChange={(v) => set({ nz: v })}
          />
          <Numero
            label="Pessoas na estrutura (n_t)"
            tip="Total de pessoas na edificação inteira. Serve de referência: a perda da zona é proporcional à fração n_z / n_t, ou seja, ao pedaço das pessoas que está na área analisada."
            value={e.nt}
            onChange={(v) => set({ nt: v })}
          />
          <Numero
            label="Horas por dia ocupada"
            tip="Duração do expediente na zona. Um turno são 8 h, dois turnos 16 h, operação contínua 24 h."
            value={e.horasDia}
            onChange={(v) => set({ horasDia: v })}
          />
          <Numero
            label="Dias por semana"
            tip="Quantos dias por semana a zona é ocupada. Fábrica de segunda a sexta: 5. Operação contínua: 7."
            value={e.diasSemana}
            onChange={(v) => set({ diasSemana: v })}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          Equivale a{" "}
          <b className="font-mono font-semibold text-slate-700 dark:text-slate-200">
            {Math.round(horasPorAno(e)).toLocaleString("pt-BR")} h/ano
          </b>{" "}
          das 8.760 h do ano ({Math.round((horasPorAno(e) / 8760) * 100)}%) — é o t_z que a norma
          pede na equação C.3. As pessoas presentes valem{" "}
          <b className="font-mono font-semibold text-slate-700 dark:text-slate-200">
            {e.nt ? Math.round(((e.nz || 0) / e.nt) * 100) : 0}%
          </b>{" "}
          do total da estrutura.
        </p>
      </Grupo>

      <Grupo
        titulo="Situações especiais"
        explicacao="Duas condições que mudam quais riscos são avaliados. Deixe desmarcadas no caso comum de uma edificação sem atmosfera explosiva e sem acervo protegido."
      >
        <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={e.explosaoOuRiscoVida}
            onChange={(ev) => set({ explosaoOuRiscoVida: ev.target.checked })}
            className="mt-0.5 h-3.5 w-3.5 accent-copper-600"
          />
          <span>
            <b>Risco de explosão</b>, ou a falha dos sistemas internos põe em risco imediato a vida
            humana ou o meio ambiente. Marque para instalações com atmosfera explosiva, hospitais
            com equipamento de suporte à vida ou processos cuja parada libera algo perigoso. Só com
            esta marcação as quatro componentes de falha de sistemas internos (R_C, R_M, R_W e R_Z)
            passam a somar em R1 — é a nota "a" da Tabela 2.
          </span>
        </label>

        {e.explosaoOuRiscoVida && (
          <div className="mt-2">
            <Selecao
              label="Consequência da falha dos sistemas internos (L_O)"
              tip="Quantas vítimas a falha de um sistema interno costuma causar. A norma só tabela os três casos em que essas componentes entram em R1 (Tabela C.2)."
              tabela={LO_POR_ESTRUTURA}
              value={e.loEstrutura}
              onChange={(v) => set({ loEstrutura: v })}
            />
          </div>
        )}

        <label className="mt-2 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={e.patrimonioCultural}
            onChange={(ev) => set({ patrimonioCultural: ev.target.checked })}
            className="mt-0.5 h-3.5 w-3.5 accent-copper-600"
          />
          <span>
            <b>Abriga patrimônio cultural</b> — museu, igreja, acervo tombado. Marque para o app
            avaliar também o risco R3, que só considera danos físicos e tem limite tolerável dez
            vezes maior que o de vidas humanas.
          </span>
        </label>

        {e.patrimonioCultural && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Numero
              label="Valor do acervo na zona (c_z)"
              tip="Quanto vale o patrimônio cultural que está na área analisada. Use a mesma moeda do campo ao lado — só a razão entre os dois entra na conta, então a unidade não importa desde que seja a mesma."
              value={e.cz}
              onChange={(v) => set({ cz: v })}
            />
            <Numero
              label="Valor total da edificação e do conteúdo (c_t)"
              tip="Valor da edificação somado a tudo que há dentro dela, incluindo o acervo. É a referência contra a qual o valor da zona é comparado (equação C.7)."
              value={e.ct}
              onChange={(v) => set({ ct: v })}
            />
          </div>
        )}
      </Grupo>
    </div>
  );
}
