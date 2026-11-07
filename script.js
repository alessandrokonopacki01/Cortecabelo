
/*
 * CorteCabelo — versão multissalões
 * Cada salão possui barbeiros e agendamentos próprios.
 */

const firebaseConfig = {
  apiKey: "AIzaSyA62D2gCNSPGtuZkPcNQxAQCI10T7leF8s",
  authDomain: "cortedoleo-825fa.firebaseapp.com",
  projectId: "cortedoleo-825fa",
  storageBucket: "cortedoleo-825fa.firebasestorage.app",
  messagingSenderId: "120441801182",
  appId: "1:120441801182:web:411d83e4e7fa26d568354f"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

const SESSAO_BARBEIRO = "cortecabelo_barbeiro_v2";
const pagina = document.body.dataset.page;
const slugNaUrl = new URLSearchParams(window.location.search).get("b");

let salaoAtual = null;
let barbeirosAtuais = new Map();
let salaoAdminId = null;
let carregamentoHorarios = 0;
let sessaoAtual = null;

// =====================================
// FUNÇÕES AUXILIARES
// =====================================

function identificadorValido(id) {
  return typeof id === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) &&
    id.length <= 45;
}

function gerarSlug(nome) {
  return nome.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 45)
    .replace(/-$/, "");
}

function hojeLocal() {
  const agora = new Date();

  return `${agora.getFullYear()}-${String(
    agora.getMonth() + 1
  ).padStart(2, "0")}-${String(
    agora.getDate()
  ).padStart(2, "0")}`;
}

function horarioJaPassou(data, hora) {
  if (data < hojeLocal()) return true;
  if (data > hojeLocal()) return false;

  const agora = new Date();
  const [h, m] = hora.split(":").map(Number);

  return h < agora.getHours() ||
    (h === agora.getHours() && m <= agora.getMinutes());
}

function linkPagina(paginaHtml, slug) {
  const url = new URL(paginaHtml, window.location.href);
  url.searchParams.set("b", slug);
  return url.href;
}

function referenciaSalao(slug) {
  return db.collection("saloes").doc(slug);
}

function referenciaBarbeiros(slug) {
  return referenciaSalao(slug).collection("barbeiros");
}

function referenciaAgendamentos(slug) {
  return referenciaSalao(slug).collection("agendamentos");
}

function texto(id, conteudo) {
  const no = document.getElementById(id);
  if (no) no.textContent = conteudo;
}

function criarElemento(tag, classe, conteudo) {
  const el = document.createElement(tag);

  if (classe) el.className = classe;
  if (conteudo !== undefined) el.textContent = conteudo;

  return el;
}

function criarBotao(
  textoBotao,
  acao,
  classe = "btn-pequeno"
) {
  const b = criarElemento("button", classe, textoBotao);

  b.type = "button";
  b.addEventListener("click", acao);

  return b;
}

function mostrarErro(mensagem, erro) {
  if (erro) console.error(mensagem, erro);

  alert(
    mensagem +
    (erro && erro.code === "permission-denied"
      ? " Verifique as permissões do Firestore."
      : "")
  );
}

async function verificarSalao(slug) {
  if (!identificadorValido(slug)) {
    throw new Error("LINK_INVALIDO");
  }

  const doc = await referenciaSalao(slug).get();

  if (!doc.exists) {
    throw new Error("SALAO_NAO_ENCONTRADO");
  }

  const salao = {
    id: doc.id,
    ...doc.data()
  };

  if (salao.ativo === false) {
    throw new Error("SALAO_INATIVO");
  }

  return salao;
}

function mensagemSalaoErro(erro) {
  if (
    ["LINK_INVALIDO", "SALAO_NAO_ENCONTRADO"]
      .includes(erro.message)
  ) {
    return "Link não encontrado. Peça à barbearia o endereço correto.";
  }

  if (erro.message === "SALAO_INATIVO") {
    return "Os agendamentos deste salão estão temporariamente indisponíveis.";
  }

  return "Não foi possível carregar a barbearia. Confira sua conexão e as permissões do Firebase.";
}

// =====================================
// CLIENTE — AGENDAMENTO
// =====================================

async function iniciarCliente() {
  const form = document.getElementById("formAgendamento");
  const seletor = document.getElementById("barbeiro");
  const data = document.getElementById("data");

  data.min = hojeLocal();

  data.addEventListener("change", carregarHorarios);
  seletor.addEventListener("change", carregarHorarios);
  form.addEventListener("submit", salvarAgendamento);

  try {
    salaoAtual = await verificarSalao(slugNaUrl);

    document.title = `Agendamento | ${salaoAtual.nome}`;

    texto("tituloSalao", salaoAtual.nome);

    texto(
      "mensagemSalao",
      "Escolha seu profissional e reserve um horário."
    );

    const link = document.getElementById("linkProfissional");

    link.href = linkPagina("login.html", salaoAtual.id);
    link.hidden = false;
    form.hidden = false;

    await carregarBarbeirosCliente();

  } catch (erro) {
    form.hidden = true;

    texto("mensagemSalao", mensagemSalaoErro(erro));

    console.error(
      "Não foi possível abrir a página do salão:",
      erro
    );
  }
}

async function carregarBarbeirosCliente() {
  const seletor = document.getElementById("barbeiro");

  const snapshot = await referenciaBarbeiros(
    salaoAtual.id
  ).get();

  barbeirosAtuais.clear();

  seletor.replaceChildren(
    new Option("Escolha seu barbeiro", "")
  );

  snapshot.forEach(doc => {
    const barbeiro = doc.data();

    if (barbeiro.ativo === false) return;

    barbeirosAtuais.set(doc.id, barbeiro);

    seletor.add(
      new Option(barbeiro.nome, doc.id)
    );
  });

  if (barbeirosAtuais.size === 0) {
    seletor.replaceChildren(
      new Option("Nenhum barbeiro disponível", "")
    );

    texto(
      "horarios",
      "Este salão ainda não cadastrou profissionais."
    );

    document.getElementById("btnAgendar").disabled = true;

  } else {
    document.getElementById("btnAgendar").disabled = false;
  }
}

async function carregarHorarios() {
  const numeroRequisicao = ++carregamentoHorarios;

  const dia = document.getElementById("data").value;
  const barbeiroId = document.getElementById("barbeiro").value;
  const container = document.getElementById("horarios");

  document.getElementById("horaSelecionada").value = "";

  container.replaceChildren();

  if (!dia || !barbeiroId || !salaoAtual) {
    container.append(
      criarElemento(
        "p",
        "ajuda",
        "Escolha um profissional e uma data."
      )
    );
    return;
  }

  container.append(
    criarElemento("p", "ajuda", "Consultando horários...")
  );

  try {
    const snapshot = await referenciaAgendamentos(
      salaoAtual.id
    )
      .where("barbeiroId", "==", barbeiroId)
      .get();

    if (numeroRequisicao !== carregamentoHorarios) return;

    const ocupados = new Set();

    snapshot.forEach(doc => {
      const agendamento = doc.data();

      if (
        agendamento.data &&
        agendamento.data.startsWith(`${dia}T`) &&
        agendamento.status !== "cancelado"
      ) {
        ocupados.add(
          agendamento.data.split("T")[1]
        );
      }
    });

    container.replaceChildren();

    let totalDisponivel = 0;

    for (let h = 9; h < 18; h++) {
      for (const minuto of ["00", "30"]) {
        const horario =
          `${String(h).padStart(2, "0")}:${minuto}`;

        if (horarioJaPassou(dia, horario)) continue;

        const ocupado = ocupados.has(horario);

        const b = criarElemento(
          "button",
          `horario-btn${ocupado ? " ocupado" : ""}`,
          horario
        );

        b.type = "button";
        b.disabled = ocupado;
        b.setAttribute("aria-pressed", "false");

        if (!ocupado) {
          totalDisponivel++;


b.addEventListener("click", () => {
  const estavaSelecionado = b.classList.contains("selected");

  // Limpa qualquer seleção anterior
  container.querySelectorAll(".horario-btn").forEach(btn => {
    btn.classList.remove("selected");
    btn.setAttribute("aria-pressed", "false");
  });

  const campoHora = document.getElementById("horaSelecionada");

  // Se clicou novamente, desmarca o horário
  if (estavaSelecionado) {
    campoHora.value = "";
    return;
  }

  // Caso contrário, seleciona o novo horário
  b.classList.add("selected");
  b.setAttribute("aria-pressed", "true");
  campoHora.value = horario;
});

        }

        container.appendChild(b);
      }
    }

    if (!totalDisponivel) {
      container.append(
        criarElemento(
          "p",
          "ajuda",
          "Não há horários disponíveis para esta data."
        )
      );
    }

  } catch (erro) {
    if (numeroRequisicao !== carregamentoHorarios) return;

    container.replaceChildren(
      criarElemento(
        "p",
        "ajuda",
        "Não foi possível consultar os horários."
      )
    );

    console.error("Erro ao carregar horários:", erro);
  }
}

async function salvarAgendamento(evento) {
  evento.preventDefault();

  const botao = document.getElementById("btnAgendar");

  const nome = document.getElementById("nome").value.trim();

  const whatsapp = document.getElementById("whatsapp")
    .value.replace(/\D/g, "");

  const barbeiroId = document.getElementById("barbeiro").value;
  const barbeiro = barbeirosAtuais.get(barbeiroId);
  const servico = document.getElementById("servico").value;
  const dia = document.getElementById("data").value;
  const hora = document.getElementById("horaSelecionada").value;

  if (
    !salaoAtual ||
    !barbeiro ||
    !nome ||
    whatsapp.length < 10 ||
    whatsapp.length > 13 ||
    !dia ||
    !hora
  ) {
    alert(
      "Preencha os dados, confira o WhatsApp e selecione um horário."
    );
    return;
  }

  if (horarioJaPassou(dia, hora)) {
    alert("Este horário já passou. Selecione outro.");
    await carregarHorarios();
    return;
  }

  botao.disabled = true;

  try {
    await verificarSalao(salaoAtual.id);

    const profissional = await referenciaBarbeiros(
      salaoAtual.id
    ).doc(barbeiroId).get();

    if (
      !profissional.exists ||
      profissional.data().ativo === false
    ) {
      throw new Error("BARBEIRO_INATIVO");
    }

    const idAgenda =
      `${barbeiroId}_${dia}_${hora.replace(":", "-")}`;

    const referencia = referenciaAgendamentos(
      salaoAtual.id
    ).doc(idAgenda);

    await db.runTransaction(async transacao => {
      const existente = await transacao.get(referencia);

      if (
        existente.exists &&
        existente.data().status !== "cancelado"
      ) {
        throw new Error("HORARIO_OCUPADO");
      }

      transacao.set(referencia, {
        nome,
        whatsapp,
        barbeiroId,
        barbeiro: barbeiro.nome,
        salaoId: salaoAtual.id,
        servico,
        data: `${dia}T${hora}`,
        status: "pendente",
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    alert("Agendamento realizado! Até breve.");

    document.getElementById("horaSelecionada").value = "";

    await carregarHorarios();

  } catch (erro) {
    if (erro.message === "HORARIO_OCUPADO") {
      alert(
        "Esse horário acabou de ser reservado. Escolha outro!"
      );
      await carregarHorarios();

    } else if (
      erro.message === "SALAO_INATIVO" ||
      erro.message === "BARBEIRO_INATIVO"
    ) {
      alert(
        "Agendamentos indisponíveis para este salão ou profissional."
      );

    } else {
      mostrarErro(
        "Não foi possível salvar seu agendamento.",
        erro
      );
    }

  } finally {
    botao.disabled = false;
  }
}

// =====================================
// LOGIN DOS BARBEIROS
// =====================================

async function iniciarLogin() {
  const form = document.getElementById("formLogin");

  document.getElementById("voltarAgendamento").href =
    identificadorValido(slugNaUrl)
      ? linkPagina("index.html", slugNaUrl)
      : "index.html";

  try {
    salaoAtual = await verificarSalao(slugNaUrl);

    texto("tituloLogin", salaoAtual.nome);

    texto(
      "mensagemLogin",
      "Entre para visualizar sua própria agenda."
    );

    form.hidden = false;

    form.addEventListener("submit", fazerLogin);

  } catch (erro) {
    texto("mensagemLogin", mensagemSalaoErro(erro));
  }
}

async function fazerLogin(evento) {
  if (evento) evento.preventDefault();
  if (!salaoAtual) return;

  const login = document.getElementById(
    "userLogin"
  ).value.trim();

  const senha = document.getElementById("userSenha").value;
  const botao = document.querySelector("#formLogin button");

  botao.disabled = true;

  try {
    const snapshot = await referenciaBarbeiros(
      salaoAtual.id
    )
      .where("login", "==", login)
      .get();

    const selecionado = snapshot.docs.find(doc =>
      doc.data().senha === senha &&
      doc.data().ativo !== false
    );

    if (!selecionado) {
      alert("Login ou senha incorretos!");
      return;
    }

    localStorage.setItem(
      SESSAO_BARBEIRO,
      JSON.stringify({
        salaoId: salaoAtual.id,
        barbeiroId: selecionado.id,
        nome: selecionado.data().nome
      })
    );

    window.location.href = linkPagina(
      "barbeiros.html",
      salaoAtual.id
    );

  } catch (erro) {
    mostrarErro("Erro ao entrar no painel.", erro);

  } finally {
    botao.disabled = false;
  }
}

function lerSessao() {
  try {
    const dados = JSON.parse(
      localStorage.getItem(SESSAO_BARBEIRO)
    );

    if (
      dados &&
      identificadorValido(dados.salaoId) &&
      typeof dados.barbeiroId === "string"
    ) {
      return dados;
    }

  } catch (erro) {
    console.error("Sessão inválida:", erro);
  }

  return null;
}

// =====================================
// AGENDA INDIVIDUAL DO BARBEIRO
// =====================================

async function iniciarAgenda() {
  sessaoAtual = lerSessao();

  if (
    !sessaoAtual ||
    (slugNaUrl && slugNaUrl !== sessaoAtual.salaoId)
  ) {
    window.location.replace(
      identificadorValido(slugNaUrl)
        ? linkPagina("login.html", slugNaUrl)
        : "login.html"
    );
    return;
  }

  document.getElementById("dataFiltro").value = hojeLocal();

  document.getElementById("dataFiltro")
    .addEventListener("change", carregarAgendaDoDia);

  document.getElementById("btnSair")
    .addEventListener("click", () => {
      localStorage.removeItem(SESSAO_BARBEIRO);

      window.location.href = linkPagina(
        "login.html",
        sessaoAtual.salaoId
      );
    });

  try {
    salaoAtual = await verificarSalao(sessaoAtual.salaoId);

    const barbeiroDoc = await referenciaBarbeiros(
      sessaoAtual.salaoId
    ).doc(sessaoAtual.barbeiroId).get();

    if (
      !barbeiroDoc.exists ||
      barbeiroDoc.data().ativo === false
    ) {
      throw new Error("BARBEIRO_INATIVO");
    }

    texto("nomeSalaoAgenda", salaoAtual.nome);

    texto(
      "tituloAgenda",
      `Agenda de ${barbeiroDoc.data().nome}`
    );

    texto(
      "mensagemAgenda",
      "Acompanhe seus atendimentos por dia."
    );

    await carregarAgendaDoDia();

  } catch (erro) {
    texto("mensagemAgenda", mensagemSalaoErro(erro));

    texto(
      "listaAgendamentos",
      "Não foi possível acessar a agenda. Peça ao administrador para conferir o acesso."
    );
  }
}

async function carregarAgendaDoDia() {
  const lista = document.getElementById("listaAgendamentos");

  if (!lista || !sessaoAtual || !salaoAtual) return;

  const dia = document.getElementById("dataFiltro").value ||
    hojeLocal();

  texto("listaAgendamentos", "Carregando atendimentos...");

  try {
    const snapshot = await referenciaAgendamentos(
      sessaoAtual.salaoId
    )
      .where("barbeiroId", "==", sessaoAtual.barbeiroId)
      .get();

    const atendimentos = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(item =>
        item.data &&
        item.data.startsWith(`${dia}T`) &&
        item.status !== "cancelado"
      )
      .sort((a, b) => a.data.localeCompare(b.data));

    lista.replaceChildren();

    if (!atendimentos.length) {
      lista.append(
        criarElemento(
          "p",
          "ajuda",
          "Nenhum agendamento nesta data."
        )
      );
      return;
    }

    atendimentos.forEach(ag => {
      const card = criarElemento("div", "card");

      card.append(
        criarElemento(
          "div",
          "card-titulo",
          `${ag.data.split("T")[1]} — ${ag.nome}`
        )
      );

      card.append(
        criarElemento(
          "p",
          "",
          `Serviço: ${ag.servico || "Não informado"}`
        )
      );

      card.append(
        criarElemento(
          "p",
          "",
          `Status: ${
            ag.status === "concluido"
              ? "Concluído"
              : "Pendente"
          }`
        )
      );

      const digits = String(ag.whatsapp || "")
        .replace(/\D/g, "");

      if (digits) {
        const contato = criarElemento("p");

        const a = criarElemento(
          "a",
          "",
          `WhatsApp: ${digits}`
        );

        a.style.color = "#d4af37";

        a.href = `https://wa.me/${
          digits.startsWith("55")
            ? digits
            : "55" + digits
        }`;

        a.target = "_blank";
        a.rel = "noopener noreferrer";

        contato.append(a);
        card.append(contato);
      }

      if (ag.status !== "concluido") {
        const botoes = criarElemento("div", "linha-acoes");

        botoes.append(
          criarBotao(
            "✓ Concluir",
            () => mudarStatus(ag.id, "concluido")
          )
        );

        botoes.append(
          criarBotao(
            "✕ Cancelar",
            () => mudarStatus(ag.id, "cancelado"),
            "btn-pequeno btn-perigo"
          )
        );

        card.append(botoes);
      }

      lista.append(card);
    });

  } catch (erro) {
    texto(
      "listaAgendamentos",
      "Erro ao consultar agenda. Verifique o Firebase."
    );

    console.error("Erro ao consultar agenda:", erro);
  }
}

async function mudarStatus(id, status) {
  if (
    !["concluido", "cancelado"].includes(status) ||
    !sessaoAtual
  ) {
    return;
  }

  if (
    status === "cancelado" &&
    !confirm("Deseja cancelar este horário?")
  ) {
    return;
  }

  try {
    const ref = referenciaAgendamentos(
      sessaoAtual.salaoId
    ).doc(id);

    const doc = await ref.get();

    if (
      !doc.exists ||
      doc.data().barbeiroId !== sessaoAtual.barbeiroId
    ) {
      alert("Agendamento não pertence a esta agenda.");
      return;
    }

    await ref.update({ status });

    await carregarAgendaDoDia();

  } catch (erro) {
    mostrarErro(
      "Não foi possível alterar o agendamento.",
      erro
    );
  }
}

// =====================================
// ADMIN — GESTÃO DE SALÕES
// =====================================

async function iniciarAdmin() {
  if (!window.adminLiberado) return;

  document.getElementById("painelAdmin").hidden = false;

  const nome = document.getElementById("nomeSalao");
  const slug = document.getElementById("slugSalao");

  let alterouSlug = false;

  slug.addEventListener("input", () => {
    alterouSlug = true;
  });

  nome.addEventListener("input", () => {
    if (!alterouSlug) {
      slug.value = gerarSlug(nome.value);
    }
  });

  document.getElementById("formSalao")
    .addEventListener("submit", cadastrarSalao);

  document.getElementById("formBarbeiro")
    .addEventListener("submit", cadastrarBarbeiro);

  document.getElementById("btnMigrarAntigo")
    .addEventListener("click", migrarAntigos);

  await carregarSaloes();
}

async function cadastrarSalao(evento) {
  evento.preventDefault();

  const nome = document.getElementById(
    "nomeSalao"
  ).value.trim();

  const id = document.getElementById(
    "slugSalao"
  ).value.trim().toLowerCase();

  if (nome.length < 2 || !identificadorValido(id)) {
    alert(
      "Informe um nome e um identificador sem espaços nem acentos (ex.: barbearia-central)."
    );
    return;
  }

  const botao = document.querySelector(
    "#formSalao button[type=submit]"
  );

  botao.disabled = true;

  try {
    const ref = referenciaSalao(id);

    await db.runTransaction(async tx => {
      const existe = await tx.get(ref);

      if (existe.exists) {
        throw new Error("SLUG_DUPLICADO");
      }

      tx.set(ref, {
        nome,
        ativo: true,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    document.getElementById("formSalao").reset();

    alert("Barbearia cadastrada!");

    await carregarSaloes();
    await abrirSalaoAdmin(id);

  } catch (erro) {
    if (erro.message === "SLUG_DUPLICADO") {
      alert(
        "Este endereço já pertence a outra barbearia. Escolha outro."
      );

    } else {
      mostrarErro(
        "Não foi possível cadastrar o salão.",
        erro
      );
    }

  } finally {
    botao.disabled = false;
  }
}

async function carregarSaloes() {
  const lista = document.getElementById("listaSaloes");

  texto("listaSaloes", "Carregando salões...");

  try {
    const snapshot = await db.collection("saloes").get();

    const saloes = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR")
      );

    lista.replaceChildren();

    if (!saloes.length) {
      lista.append(
        criarElemento(
          "p",
          "ajuda",
          "Nenhum salão cadastrado. Comece pelo formulário acima."
        )
      );
      return;
    }

    saloes.forEach(salao => {
      const card = criarElemento("div", "card");

      const titulo = criarElemento(
        "div",
        "card-titulo",
        salao.nome
      );

      titulo.append(
        criarElemento(
          "span",
          `estado${salao.ativo === false ? " inativo" : ""}`,
          salao.ativo === false ? "Bloqueado" : "Ativo"
        )
      );

      card.append(titulo);

      card.append(
        criarElemento(
          "p",
          "ajuda",
          `Link: ?b=${salao.id}`
        )
      );

      const acoes = criarElemento("div", "linha-acoes");

      acoes.append(
        criarBotao(
          "Gerenciar barbeiros",
          () => abrirSalaoAdmin(salao.id)
        )
      );

      acoes.append(
        criarBotao(
          "Copiar link",
          () => copiarLink(
            linkPagina("index.html", salao.id)
          ),
          "btn-pequeno btn-secundario"
        )
      );

      acoes.append(
        criarBotao(
          salao.ativo === false
            ? "Desbloquear"
            : "Bloquear",

          () => mudarStatusSalao(salao),

          salao.ativo === false
            ? "btn-pequeno"
            : "btn-pequeno btn-perigo"
        )
      );

      
acoes.append(
  criarBotao(
    "🗑️ Excluir salão",
    () => excluirSalao(salao),
    "btn-pequeno btn-perigo"
  )
);


      card.append(acoes);
      lista.append(card);
    });

  } catch (erro) {
    texto(
      "listaSaloes",
      "Erro ao carregar salões."
    );

    mostrarErro(
      "Não foi possível carregar os salões.",
      erro
    );
  }
}

async function copiarLink(link) {
  try {
    await navigator.clipboard.writeText(link);

    alert("Link copiado!\n" + link);

  } catch (erro) {
    window.prompt("Copie o link:", link);
  }
}

async function mudarStatusSalao(salao) {
  const bloquear = salao.ativo !== false;

  if (
    !confirm(
      bloquear
        ? `Bloquear a barbearia ${salao.nome}?`
        : `Desbloquear a barbearia ${salao.nome}?`
    )
  ) {
    return;
  }

  try {
    await referenciaSalao(salao.id).update({
      ativo: !bloquear
    });

    await carregarSaloes();

    if (salaoAdminId === salao.id) {
      await abrirSalaoAdmin(salao.id);
    }

  } catch (erro) {
    mostrarErro(
      "Não foi possível mudar o status do salão.",
      erro
    );
  }
}


async function excluirSalao(salao) {
  const confirmacao = prompt(
    `Para excluir "${salao.nome}", digite o identificador:\n${salao.id}`
  );

  if (confirmacao !== salao.id) {
    if (confirmacao !== null) {
      alert("Identificador incorreto. Exclusão cancelada.");
    }
    return;
  }

  try {
    const [barbeiros, agendamentos] = await Promise.all([
      referenciaBarbeiros(salao.id).limit(1).get(),
      referenciaAgendamentos(salao.id).limit(1).get()
    ]);

    if (!barbeiros.empty || !agendamentos.empty) {
      alert(
        "Este salão possui barbeiros ou agendamentos. " +
        "Remova os dados antes de excluir o salão. " +
        "Você também pode bloqueá-lo."
      );
      return;
    }

    await referenciaSalao(salao.id).delete();

    if (salaoAdminId === salao.id) {
      salaoAdminId = null;
      document.getElementById("painelSalao").hidden = true;
    }

    alert("Salão excluído com sucesso!");
    await carregarSaloes();

  } catch (erro) {
    mostrarErro("Não foi possível excluir o salão.", erro);
  }
}


async function abrirSalaoAdmin(id) {
  salaoAdminId = id;

  const painel = document.getElementById("painelSalao");

  painel.hidden = false;

  try {
    const doc = await referenciaSalao(id).get();

    if (!doc.exists) {
      throw new Error("SALAO_NAO_ENCONTRADO");
    }

    texto(
      "tituloPainelSalao",
      `3. Profissionais: ${doc.data().nome}`
    );

    const links = document.getElementById("linksSalao");

    links.replaceChildren();

    const paginas = [
      ["Link para clientes", "index.html"],
      ["Login dos barbeiros", "login.html"]
    ];

    for (const [rotulo, paginaDestino] of paginas) {
      const bloco = criarElemento("p");

      bloco.append(
        criarElemento(
          "strong",
          "",
          `${rotulo}: `
        )
      );

      const a = criarElemento(
        "a",
        "",
        linkPagina(paginaDestino, id)
      );

      a.href = a.textContent;
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      bloco.append(a);
      links.append(bloco);
    }

    await carregarBarbeirosAdmin(id);

    painel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (erro) {
    mostrarErro(
      "Não foi possível abrir este salão.",
      erro
    );
  }
}

// =====================================
// ADMIN — GESTÃO DOS BARBEIROS
// =====================================

async function carregarBarbeirosAdmin(id) {
  const lista = document.getElementById(
    "listaBarbeirosAdmin"
  );

  texto(
    "listaBarbeirosAdmin",
    "Carregando profissionais..."
  );

  try {
    const snapshot = await referenciaBarbeiros(id).get();

    lista.replaceChildren();

    if (snapshot.empty) {
      lista.append(
        criarElemento(
          "p",
          "ajuda",
          "Nenhum barbeiro cadastrado neste salão."
        )
      );
      return;
    }

    snapshot.forEach(doc => {
      const b = doc.data();

      const card = criarElemento("div", "card");

      card.append(
        criarElemento(
          "div",
          "card-titulo",
          b.nome
        )
      );

      card.append(
        criarElemento(
          "p",
          "ajuda",
          `Login: ${b.login}`
        )
      );

      const acoes = criarElemento("div", "linha-acoes");

      acoes.append(
        criarBotao(
          "Excluir barbeiro",
          () => excluirBarbeiro(
            id,
            doc.id,
            b.nome
          ),
          "btn-pequeno btn-perigo"
        )
      );

      card.append(acoes);
      lista.append(card);
    });

  } catch (erro) {
    texto(
      "listaBarbeirosAdmin",
      "Não foi possível listar os barbeiros."
    );

    console.error(erro);
  }
}

async function cadastrarBarbeiro(evento) {
  evento.preventDefault();

  if (!salaoAdminId) {
    alert("Primeiro selecione o salão.");
    return;
  }

  const nome = document.getElementById(
    "nomeBarbeiro"
  ).value.trim();

  const login = document.getElementById(
    "loginBarbeiro"
  ).value.trim();

  const senha = document.getElementById(
    "senhaBarbeiro"
  ).value;

  if (!nome || !login || !senha) {
    alert("Preencha todos os campos.");
    return;
  }

  const botao = document.querySelector(
    "#formBarbeiro button[type=submit]"
  );

  botao.disabled = true;

  try {
    const salao = await referenciaSalao(
      salaoAdminId
    ).get();

    if (!salao.exists) {
      throw new Error("SALAO_NAO_ENCONTRADO");
    }

    const repetidos = await referenciaBarbeiros(
      salaoAdminId
    )
      .where("login", "==", login)
      .get();

    if (!repetidos.empty) {
      alert("Este login já está sendo usado neste salão.");
      return;
    }

    await referenciaBarbeiros(salaoAdminId).add({
      nome,
      login,
      senha,
      ativo: true
    });

    document.getElementById("formBarbeiro").reset();

    alert("Barbeiro cadastrado neste salão!");

    await carregarBarbeirosAdmin(salaoAdminId);

  } catch (erro) {
    mostrarErro(
      "Não foi possível cadastrar o barbeiro.",
      erro
    );

  } finally {
    botao.disabled = false;
  }
}

async function excluirBarbeiro(
  salaoId,
  barbeiroId,
  nome
) {
  if (
    !confirm(
      `Excluir ${nome}? Os agendamentos anteriores ficarão registrados, mas não poderão ser gerenciados pelo profissional.`
    )
  ) {
    return;
  }

  try {
    await referenciaBarbeiros(salaoId)
      .doc(barbeiroId)
      .delete();

    await carregarBarbeirosAdmin(salaoId);

  } catch (erro) {
    mostrarErro(
      "Não foi possível excluir o barbeiro.",
      erro
    );
  }
}

// =====================================
// IMPORTAÇÃO DO SISTEMA ANTIGO
// =====================================

async function migrarAntigos() {
  const id = salaoAdminId;

  if (!id || !identificadorValido(id)) {
    alert("Selecione um salão.");
    return;
  }

  if (
    !confirm(
      "Importar barbeiros e agendamentos antigos para este salão?\n\nUse somente um salão novo e vazio. O sistema antigo NÃO será apagado."
    )
  ) {
    return;
  }

  const botao = document.getElementById(
    "btnMigrarAntigo"
  );

  botao.disabled = true;

  try {
    const [
      atuais,
      atendimentosAtuais,
      antigos,
      agendamentosAntigos
    ] = await Promise.all([
      referenciaBarbeiros(id).get(),
      referenciaAgendamentos(id).get(),
      db.collection("barbeiros").get(),
      db.collection("agendamentos").get()
    ]);

    if (!atuais.empty || !atendimentosAtuais.empty) {
      alert(
        "Este salão já possui dados. A importação só é permitida para um salão vazio."
      );
      return;
    }

    if (antigos.empty) {
      alert("Não existem barbeiros no cadastro antigo.");
      return;
    }

    const nomeParaId = new Map();
    const nomesDuplicados = new Set();

    antigos.forEach(doc => {
      const nome = String(
        doc.data().nome || ""
      ).trim().toLocaleLowerCase("pt-BR");

      if (nomeParaId.has(nome)) {
        nomesDuplicados.add(nome);
      }

      nomeParaId.set(nome, doc.id);
    });

    if (nomesDuplicados.size) {
      alert(
        "Existem barbeiros antigos com nomes repetidos. Não importei nada, pois não seria possível atribuir os agendamentos corretamente. Confira o cadastro antes de tentar novamente."
      );
      return;
    }

    const operacoes = [];

    antigos.forEach(doc => {
      operacoes.push({
        ref: referenciaBarbeiros(id).doc(doc.id),
        dados: {
          ...doc.data(),
          ativo: doc.data().ativo !== false
        }
      });
    });

    let semProfissional = 0;
    let conflitos = 0;

    const agendaPorHorario = new Map();

    agendamentosAntigos.forEach(doc => {
      const ag = doc.data();

      const barbeiroId = nomeParaId.get(
        String(ag.barbeiro || "")
          .trim()
          .toLocaleLowerCase("pt-BR")
      );

      const data = String(ag.data || "");

      if (
        !barbeiroId ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data)
      ) {
        semProfissional++;
        return;
      }

      const chave =
        `${barbeiroId}_${data.slice(0, 10)}_${data.slice(11).replace(":", "-")}`;

      const dados = {
        ...ag,
        salaoId: id,
        barbeiroId
      };

      if (agendaPorHorario.has(chave)) {
        conflitos++;

        if (
          agendaPorHorario.get(chave).status === "cancelado" &&
          ag.status !== "cancelado"
        ) {
          agendaPorHorario.set(chave, dados);
        }

      } else {
        agendaPorHorario.set(chave, dados);
      }
    });

    agendaPorHorario.forEach((dados, chave) => {
      operacoes.push({
        ref: referenciaAgendamentos(id).doc(chave),
        dados
      });
    });

    for (let i = 0; i < operacoes.length; i += 400) {
      const batch = db.batch();

      operacoes.slice(i, i + 400).forEach(
        ({ ref, dados }) => {
          batch.set(ref, dados);
        }
      );

      await batch.commit();
    }

    alert(
      `Importação realizada!\n${antigos.docs.length} barbeiro(s) e ${agendaPorHorario.size} agendamento(s) copiados.\n${semProfissional} agendamento(s) sem profissional identificável e ${conflitos} horário(s) duplicado(s) não foram copiados separadamente.\nOs dados originais continuam intactos.`
    );

    await carregarBarbeirosAdmin(id);

  } catch (erro) {
    mostrarErro(
      "Falha na importação. Confira o Firebase antes de tentar novamente; pode ter ocorrido uma importação parcial.",
      erro
    );

  } finally {
    botao.disabled = false;
  }
}

// =====================================
// INICIALIZAÇÃO DAS PÁGINAS
// =====================================

if (pagina === "cliente") {
  iniciarCliente();
} else if (pagina === "login") {
  iniciarLogin();
} else if (pagina === "barbeiro") {
  iniciarAgenda();
} else if (pagina === "admin") {
  iniciarAdmin();
}
