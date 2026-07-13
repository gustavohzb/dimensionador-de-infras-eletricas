import logo from "../assets/logo.png";

const APP_VERSION = "1.0";

function Card({ children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{children}</h2>;
}

export default function SobreTab() {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <Card>
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
          <div className="rounded-xl px-3 py-1.5 dark:bg-slate-100/90">
            <img src={logo} alt="Dimensionador do Gustavo" className="h-24 w-auto" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Dimensionador do Gustavo
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ferramenta para dimensionamento de infraestruturas elétricas (eletrocalhas, leitos,
              perfilados, aramados e eletrodutos) e de cabos de baixa tensão, conforme a ABNT NBR 5410.
            </p>
            <span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              Versão {APP_VERSION}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>O que ela faz</SectionTitle>
        <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <span className="text-blue-600 dark:text-blue-400">•</span>
            <span>
              <b className="font-semibold text-slate-700 dark:text-slate-200">Infraestrutura — Manual:</b>{" "}
              você escolhe a infraestrutura e as dimensões, monta o trecho de cabos e confere a taxa de
              ocupação e o agrupamento (derating).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 dark:text-blue-400">•</span>
            <span>
              <b className="font-semibold text-slate-700 dark:text-slate-200">Infraestrutura — Auto:</b>{" "}
              a partir dos cabos, o app testa todas as infraestruturas cadastradas e ranqueia as que
              comportam o trecho — com septo divisor quando há Força e Comando juntos.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600 dark:text-blue-400">•</span>
            <span>
              <b className="font-semibold text-slate-700 dark:text-slate-200">Cabos Elétricos:</b>{" "}
              dimensiona a seção dos condutores por capacidade de condução, queda de tensão em regime e
              na partida de motores, com neutro e proteção, num quadro de cargas com vários circuitos.
            </span>
          </li>
        </ul>
      </Card>

      <Card>
        <SectionTitle>Base técnica</SectionTitle>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Cálculos conforme a <b className="font-semibold text-slate-700 dark:text-slate-200">ABNT NBR
          5410</b> — capacidade de condução (Tab. 36/37), métodos de referência (Tab. 33), fatores de
          temperatura (Tab. 40) e de agrupamento (Tab. 42/45), seção do neutro (Tab. 48) e do condutor
          de proteção (Tab. 58). Condutores com isolação EPR/XLPE a 90&deg;C. As bitolas e diâmetros
          externos seguem catálogos comerciais de cabos de potência e de comando.
        </p>
      </Card>

      <Card>
        <SectionTitle>Aviso</SectionTitle>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Esta ferramenta é um apoio ao projeto e não substitui a análise de um profissional
          habilitado nem o projeto executivo. Os resultados não incluem a coordenação com a proteção
          (Ib &le; In &le; Iz) nem a verificação de curto-circuito. Confira sempre os valores contra a
          norma e as condições reais da instalação.
        </p>
      </Card>

      <p className="pb-2 text-center text-xs text-slate-400 dark:text-slate-500">
        Desenvolvido por Gustavo · Dimensionador do Gustavo © {new Date().getFullYear()}
      </p>
    </div>
  );
}
