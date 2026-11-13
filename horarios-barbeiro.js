
/*
 * CorteCabelo — Horários individuais
 * Compatível com Firebase Firestore v8.
 */

(function () {
  "use strict";

  const DIAS = [
    ["1", "Segunda-feira"],
    ["2", "Terça-feira"],
    ["3", "Quarta-feira"],
    ["4", "Quinta-feira"],
    ["5", "Sexta-feira"],
    ["6", "Sábado"],
    ["0", "Domingo"]
  ];

  function horarioPadrao() {
    const dias = {};

    for (const [id] of DIAS) {
      dias[id] = {
        ativo: true,
        periodos: [
          { inicio: "09:00", fim: "18:00" }
        ]
      };
    }

    return dias;
  }

  function minutos(hora) {
    if (!/^\d{2}:\d{2}$/.test(hora || "")) {
      return NaN;
    }

    const [h, m] = hora.split(":").map(Number);

    if (
      h < 0 || h > 23 ||
      m < 0 || m > 59
    ) {
      return NaN;
    }

    return h * 60 + m;
  }

  function formatarHora(total) {
    const h = Math.floor(total / 60);
    const m = total % 60;

    return (
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0")
    );
  }

  function obterDia(dias, dataISO) {
    const data = new Date(
      `${dataISO}T12:00:00`
    );

    if (Number.isNaN(data.getTime())) {
      return null;
    }

    const indice = String(data.getDay());

    if (!dias || !dias[indice]) {
      return horarioPadrao()[indice];
    }

    return dias[indice];
  }

  function listarHorarios(dias, dataISO) {
    const dia = obterDia(dias, dataISO);

    if (!dia || dia.ativo === false) {
      return [];
    }

    const resultado = new Set();

    for (const periodo of dia.periodos || []) {
      const inicio = minutos(periodo.inicio);
      const fim = minutos(periodo.fim);

      if (
        !Number.isFinite(inicio) ||
        !Number.isFinite(fim) ||
        fim <= inicio
      ) {
        continue;
      }

      for (
        let minuto = inicio;
        minuto + 30 <= fim;
        minuto += 30
      ) {
        resultado.add(formatarHora(minuto));
      }
    }

    return [...resultado].sort();
  }

  function horarioPermitido(
    dias,
    dataISO,
    hora
  ) {
    return listarHorarios(
      dias,
      dataISO
    ).includes(hora);
  }

  function validarConfiguracao(dias) {
    for (const [id, nome] of DIAS) {
      const dia = dias[id];

      if (!dia || !dia.ativo) continue;

      if (
        !Array.isArray(dia.periodos) ||
        dia.periodos.length < 1 ||
        dia.periodos.length > 2
      ) {
        throw new Error(
          `${nome}: configure um ou dois períodos.`
        );
      }

      let fimAnterior = -1;

      for (const periodo of dia.periodos) {
        const inicio = minutos(periodo.inicio);
        const fim = minutos(periodo.fim);

        if (
          !Number.isFinite(inicio) ||
          !Number.isFinite(fim) ||
          inicio % 30 !== 0 ||
          fim % 30 !== 0 ||
          fim <= inicio
        ) {
          throw new Error(
            `${nome}: informe horários válidos ` +
            "em intervalos de 30 minutos."
          );
        }

        if (inicio < fimAnterior) {
          throw new Error(
            `${nome}: os períodos não podem se sobrepor.`
          );
        }

        if (fim - inicio < 30) {
          throw new Error(
            `${nome}: cada período precisa ` +
            "ter pelo menos 30 minutos."
          );
        }

        fimAnterior = fim;
      }
    }
  }

  // Funções utilizadas também pela agenda
  // do cliente, no arquivo script.js.
  window.HorariosCorte = {
    horarioPadrao,
    listarHorarios,
    horarioPermitido,
    validarConfiguracao
  };

  if (
    document.body.dataset.page !== "barbeiro"
  ) {
    return;
  }

  const sessaoChave =
    "cortecabelo_barbeiro_v2";

  let referencia = null;
  let formulario = null;
  let status = null;
  let botaoSalvar = null;

  function criar(tag, propriedades = {}, texto = "") {
    const elemento = document.createElement(tag);

    for (const [chave, valor] of Object.entries(
      propriedades
    )) {
      if (chave === "className") {
        elemento.className = valor;
      } else if (chave === "type") {
        elemento.type = valor;
      } else {
        elemento.setAttribute(chave, valor);
      }
    }

    if (texto) {
      elemento.textContent = texto;
    }

    return elemento;
  }

  function selecionarHorario(valor) {
    const campo = criar("input", {
      type: "time",
      step: "1800",
      required: ""
    });

    campo.value = valor;

    return campo;
  }

  function criarLinhaDia(
    id,
    nome,
    configuracao
  ) {
    const card = criar("div", {
      className: "hc-dia"
    });

    card.dataset.dia = id;

    const cabecalho = criar("label", {
      className: "hc-cabecalho"
    });

    const ativo = criar("input", {
      type: "checkbox",
      className: "hc-ativo"
    });

    ativo.checked =
      configuracao.ativo !== false;

    cabecalho.append(
      ativo,
      criar("strong", {}, nome)
    );

    const periodos = criar("div", {
      className: "hc-periodos"
    });

    function adicionarPeriodo(
      inicio = "13:00",
      fim = "18:00"
    ) {
      if (periodos.children.length >= 2) {
        return;
      }

      const linha = criar("div", {
        className: "hc-periodo"
      });

      const entrada = selecionarHorario(inicio);
      const saida = selecionarHorario(fim);

      entrada.className = "hc-inicio";
      saida.className = "hc-fim";

      const remover = criar("button", {
        type: "button",
        className: "hc-remover"
      }, "Remover");

      remover.addEventListener("click", () => {
        if (periodos.children.length <= 1) {
          return;
        }

        linha.remove();
        atualizar();
      });

      const grupoEntrada = criar("label");
      grupoEntrada.textContent = "Das";
      grupoEntrada.append(entrada);

      const grupoSaida = criar("label");
      grupoSaida.textContent = "Até";
      grupoSaida.append(saida);

      linha.append(
        grupoEntrada,
        grupoSaida,
        remover
      );

      periodos.append(linha);
      atualizar();
    }

    const adicionar = criar("button", {
      type: "button",
      className: "hc-adicionar"
    }, "+ Intervalo / segundo período");

    function atualizar() {
      const aberto = ativo.checked;

      periodos.hidden = !aberto;
      adicionar.hidden =
        !aberto || periodos.children.length >= 2;

      for (const campo of periodos.querySelectorAll(
        "input"
      )) {
        campo.disabled = !aberto;
      }
    }

    ativo.addEventListener(
      "change",
      atualizar
    );

    adicionar.addEventListener("click", () => {
      const ultima = periodos.lastElementChild;

      const fimAnterior = ultima
        ?.querySelector(".hc-fim")
        ?.value || "12:00";

      const novaEntrada =
        fimAnterior === "12:00"
          ? "13:00"
          : fimAnterior;

      adicionarPeriodo(
        novaEntrada,
        "18:00"
      );
    });

    const lista = configuracao.periodos?.length
      ? configuracao.periodos
      : [
          { inicio: "09:00", fim: "18:00" }
        ];

    for (const periodo of lista.slice(0, 2)) {
      adicionarPeriodo(
        periodo.inicio,
        periodo.fim
      );
    }

    card.append(
      cabecalho,
      periodos,
      adicionar
    );

    atualizar();

    return card;
  }


function preencher(dias) {
  formulario.querySelectorAll(".hc-dia").forEach(
    elemento => elemento.remove()
  );

  for (const [id, nome] of DIAS) {
    formulario.insertBefore(
      criarLinhaDia(
        id,
        nome,
        dias?.[id] || horarioPadrao()[id]
      ),
      botaoSalvar
    );
  }
}


 
function coletar() {
  const dias = {};

  // Percorre apenas os cartões dos dias.
  const cartoes = formulario.querySelectorAll(".hc-dia");

  for (const card of cartoes) {
    const id = card.dataset.dia;

    const checkbox = card.querySelector(".hc-ativo");

    if (!id || !checkbox) {
      continue;
    }

    const ativo = checkbox.checked;

    const periodos = [
      ...card.querySelectorAll(".hc-periodo")
    ].map(linha => ({
      inicio: linha.querySelector(".hc-inicio").value,
      fim: linha.querySelector(".hc-fim").value
    }));

    periodos.sort((a, b) =>
      a.inicio.localeCompare(b.inicio)
    );

    dias[id] = {
      ativo,
      periodos
    };
  }

  return dias;
}


  async function salvar(evento) {
    evento.preventDefault();

    if (!referencia) return;

    try {
      const dias = coletar();

      validarConfiguracao(dias);

      botaoSalvar.disabled = true;
      status.textContent = "Salvando...";

      await referencia.update({
        horariosFuncionamento: dias,
        horariosAtualizadosEm:
          firebase.firestore.FieldValue
            .serverTimestamp()
      });

      status.textContent =
        "✅ Horários salvos com sucesso!";

    } catch (erro) {
      console.error(erro);

      status.textContent =
        "❌ " + (
          erro.message ||
          "Erro ao salvar horários."
        );

    } finally {
      botaoSalvar.disabled = false;
    }
  }

  async function iniciar() {
    const principal = document.querySelector(
      "main.container"
    );

    if (!principal) return;

    const estilo = document.createElement("style");

    estilo.textContent = `
      .hc-painel {
        background: #252525;
        border: 1px solid #d4af37;
        padding: 18px;
        border-radius: 12px;
        margin: 20px 0;
      }

      .hc-painel h2 {
        margin-bottom: 8px;
      }

      .hc-painel p {
        font-size: 13px;
        color: #ccc;
        line-height: 1.6;
      }

      .hc-dia {
        border-bottom: 1px solid #444;
        padding: 12px 0;
      }

      .hc-cabecalho {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 0;
      }

      .hc-ativo {
        width: 18px;
        height: 18px;
        min-height: auto;
        accent-color: #d4af37;
      }

      .hc-periodos {
        margin-top: 10px;
      }

      .hc-periodo {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 12px;
      }

      .hc-periodo label {
        margin: 0;
        font-size: 12px;
      }

      .hc-periodo input {
        margin-top: 5px;
        padding: 8px;
        width: 100%;
      }

      .hc-remover {
        grid-column: 1 / -1;
        background: #673636;
        color: white;
        padding: 8px;
      }

      .hc-adicionar {
        background: #414141;
        color: white;
        font-size: 12px;
        margin-top: 6px;
      }

      .hc-salvar {
        margin-top: 18px;
      }

      .hc-status {
        min-height: 20px;
      }

      .hc-painel [hidden] {
        display: none !important;
      }

.hc-resumo {
  cursor: pointer;
  font-size: 17px;
  font-weight: 700;
  color: #d4af37;
  padding: 6px 0;
  list-style-position: inside;
}

.hc-resumo::marker {
  color: #d4af37;
}

.hc-conteudo {
  padding-top: 16px;
  border-top: 1px solid #444;
  margin-top: 12px;
}

.hc-painel[open] .hc-resumo {
  margin-bottom: 4px;
}

    `;

    document.head.append(estilo);


const painel = criar("details", {
  className: "hc-painel"
});

const cabecalhoRetratil = criar(
  "summary",
  {
    className: "hc-resumo"
  },
  "🕒 Meus horários de funcionamento"
);

const conteudoRetratil = criar("div", {
  className: "hc-conteudo"
});


    const titulo = criar(
      "h2",
      {},
      "🕒 Meus horários"
    );

    const descricao = criar(
      "p",
      {},
      "Escolha seus dias e períodos de " +
      "atendimento. Os clientes verão apenas " +
      "os horários disponíveis."
    );

    formulario = criar("form");

    botaoSalvar = criar("button", {
      type: "submit",
      className: "hc-salvar"
    }, "Salvar meus horários");

    status = criar("p", {
      className: "hc-status"
    }, "Carregando horários...");

    formulario.append(
      botaoSalvar,
      status
    );

    formulario.addEventListener(
      "submit",
      salvar
    );


conteudoRetratil.append(
  descricao,
  formulario
);

painel.append(
  cabecalhoRetratil,
  conteudoRetratil
);


    const assinatura = document.getElementById(
      "painelAssinatura"
    );

    if (assinatura) {
      assinatura.after(painel);
    } else {
      principal.prepend(painel);
    }

    try {
      const sessao = JSON.parse(
        localStorage.getItem(sessaoChave) ||
        "null"
      );

      if (
        !sessao?.salaoId ||
        !sessao?.barbeiroId
      ) {
        throw new Error(
          "Entre novamente na sua conta."
        );
      }

      referencia = firebase.firestore()
        .collection("saloes")
        .doc(sessao.salaoId)
        .collection("barbeiros")
        .doc(sessao.barbeiroId);

      const snapshot = await referencia.get();

      if (
        !snapshot.exists ||
        snapshot.data().ativo === false
      ) {
        throw new Error(
          "Barbeiro não encontrado ou inativo."
        );
      }

      preencher(
        snapshot.data().horariosFuncionamento ||
        horarioPadrao()
      );

      status.textContent =
        "Configure e salve seu expediente.";

    } catch (erro) {
      console.error(erro);

      botaoSalvar.disabled = true;

      status.textContent =
        erro.message ||
        "Não foi possível carregar os horários.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      iniciar
    );
  } else {
    iniciar();
  }
})();
