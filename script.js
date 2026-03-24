const firebaseConfig = {
  apiKey: "AIzaSyA62D2gCNSPGtuZkPcNQxAQCI10T7leF8s",
  authDomain: "cortedoleo-825fa.firebaseapp.com",
  projectId: "cortedoleo-825fa",
  storageBucket: "cortedoleo-825fa.firebasestorage.app",
  messagingSenderId: "120441801182",
  appId: "1:120441801182:web:411d83e4e7fa26d568354f"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- FORMULÁRIO DE AGENDAMENTO (index.html) ---
const formAgendamento = document.getElementById("formAgendamento");
if (formAgendamento) {
    formAgendamento.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("nome").value;
        const whatsapp = document.getElementById("whatsapp").value;
        const barbeiro = document.getElementById("barbeiro").value;
        const servico = document.getElementById("servico").value;
        const dataBase = document.getElementById("data").value;
        const hora = document.getElementById("horaSelecionada").value;

        if (!hora) {
            alert("Selecione um horário!");
            return;
        }
        const data = `${dataBase}T${hora}`;

        try {
            await db.collection("agendamentos").add({
                nome,
                whatsapp,
                servico,
                barbeiro,
                data,
                status: "pendente",
                criadoEm: new Date()
            });

            alert("Agendamento realizado!");
            carregarHorarios();
        } catch (erro) {
            console.error(erro);
            alert("Erro ao salvar.");
        }
    });
}

async function carregarHorarios() {
    const dataInput = document.getElementById("data")?.value;
    const barbeiroSelecionado = document.getElementById("barbeiro")?.value;
    const container = document.getElementById("horarios");
    const horaSelectInput = document.getElementById("horaSelecionada");

    if (!dataInput || !barbeiroSelecionado || !container) return;

    container.innerHTML = "";
    horaSelectInput.value = "";

    const abertura = 9;
    const fechamento = 18;
    const horarios = [];

    for (let h = abertura; h < fechamento; h++) {
        horarios.push(`${h.toString().padStart(2, "0")}:00`);
        horarios.push(`${h.toString().padStart(2, "0")}:30`);
    }

    // Filtra agendamentos APENAS do barbeiro selecionado para liberar horários nos outros
    const snapshot = await db.collection("agendamentos")
        .where("barbeiro", "==", barbeiroSelecionado)
        .get();

    const ocupados = [];
    snapshot.forEach(doc => {
        const ag = doc.data();
        if (ag.data.startsWith(dataInput) && ag.status !== "cancelado") {
            const hora = ag.data.split("T")[1].substring(0, 5);
            ocupados.push(hora);
        }
    });

    horarios.forEach(h => {
        const btn = document.createElement("div");
        btn.textContent = h;
        btn.classList.add("horario-btn");

        if (ocupados.includes(h)) {
            btn.classList.add("ocupado");
        } else {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".horario-btn").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                horaSelectInput.value = h;
            });
        }
        container.appendChild(btn);
    });
}

// Ouvintes para atualizar horários
if (document.getElementById("data")) document.getElementById("data").addEventListener("change", carregarHorarios);
if (document.getElementById("barbeiro")) document.getElementById("barbeiro").addEventListener("change", carregarHorarios);

// --- SISTEMA DE LOGIN (login.html) ---
async function fazerLogin() {
    const loginInput = document.getElementById("userLogin").value;
    const senhaInput = document.getElementById("userSenha").value;

    const snapshot = await db.collection("barbeiros")
        .where("login", "==", loginInput)
        .where("senha", "==", senhaInput)
        .get();

    if (!snapshot.empty) {
        const dadosBarbeiro = snapshot.docs[0].data();
        localStorage.setItem("barbeiroLogado", dadosBarbeiro.nome);
        window.location.href = "barbeiros.html";
    } else {
        alert("Login ou senha incorretos!");
    }
}

// --- PAINEL DO BARBEIRO (barbeiros.html) ---
async function carregarAgendaDoDia() {
    const container = document.getElementById("listaAgendamentos");
    if (!container) return;

    const barbeiroNome = localStorage.getItem("barbeiroLogado");
    if (!barbeiroNome) {
        window.location.href = "login.html";
        return;
    }

    const dataFiltro = document.getElementById("dataFiltro").value;
    const hoje = dataFiltro || new Date().toISOString().split("T")[0];

    const snapshot = await db.collection("agendamentos")
        .where("barbeiro", "==", barbeiroNome) 
        .get();

    container.innerHTML = `<h3>Agenda de: ${barbeiroNome}</h3>`;
    
    let listaAgendas = [];
    snapshot.forEach(doc => {
        const ag = doc.data();
        if (ag.data.startsWith(hoje)) {
            listaAgendas.push({ id: doc.id, ...ag });
        }
    });

    // Ordenar por hora
    listaAgendas.sort((a, b) => a.data.localeCompare(b.data));

    if (listaAgendas.length === 0) {
        container.innerHTML += "<p>Nenhum agendamento para este dia.</p>";
        return;
    }

    listaAgendas.forEach(ag => {
        const hora = ag.data.split("T")[1].substring(0, 5);
        const div = document.createElement("div");
        div.classList.add("card");
        div.innerHTML = `
            <strong>${hora} - ${ag.nome}</strong><br>
            Serviço: ${ag.servico}<br>
            WhatsApp: ${ag.whatsapp}<br>
            Status: <span class="status-${ag.status}">${ag.status || "pendente"}</span><br><br>
            <button onclick="concluir('${ag.id}')" style="width:45%; display:inline-block;">✔️</button>
            <button onclick="cancelar('${ag.id}')" style="width:45%; display:inline-block; background:#ff4444;">❌</button>
        `;
        container.appendChild(div);
    });
}

async function concluir(id) {
    await db.collection("agendamentos").doc(id).update({ status: "concluido" });
    carregarAgendaDoDia();
}

async function cancelar(id) {
    if(confirm("Deseja cancelar este horário?")) {
        await db.collection("agendamentos").doc(id).update({ status: "cancelado" });
        carregarAgendaDoDia();
    }
}

if (document.getElementById("dataFiltro")) {
    document.getElementById("dataFiltro").addEventListener("change", carregarAgendaDoDia);
}

// --- ADMINISTRAÇÃO ---
async function carregarBarbeiros() {
    const select = document.getElementById("barbeiro");
    if (!select) return;

    const snapshot = await db.collection("barbeiros").get();
    select.innerHTML = '<option value="">Selecione o Barbeiro</option>';
    snapshot.forEach(doc => {
        const b = doc.data();
        const option = document.createElement("option");
        option.value = b.nome;
        option.textContent = b.nome;
        select.appendChild(option);
    });
}

async function cadastrarBarbeiro() {
    const nome = document.getElementById("nomeBarbeiro").value;
    const login = document.getElementById("loginBarbeiro").value;
    const senha = document.getElementById("senhaBarbeiro").value;

    if (!nome || !login || !senha) {
        alert("Preencha todos os campos!");
        return;
    }

    try {
        await db.collection("barbeiros").add({ nome, login, senha });
        alert("Barbeiro cadastrado!");
        location.reload();
    } catch (e) {
        alert("Erro ao cadastrar.");
    }
}

async function excluirBarbeiro(id) {
    if (confirm("Tem certeza?")) {
        await db.collection("barbeiros").doc(id).delete();
        location.reload();
    }
}

async function carregarBarbeirosParaExclusao() {
    const container = document.getElementById("listaBarbeirosAdmin");
    if (!container) return;
    const snapshot = await db.collection("barbeiros").get();
    container.innerHTML = "";
    snapshot.forEach(doc => {
        const b = doc.data();
        const div = document.createElement("div");
        div.classList.add("card");
        div.innerHTML = `<strong>${b.nome}</strong><br><button onclick="excluirBarbeiro('${doc.id}')" style="background:#ff4444; color:white;">Excluir</button>`;
        container.appendChild(div);
    });
}

// Inicializações
carregarBarbeiros();
carregarBarbeirosParaExclusao();
if (window.location.pathname.includes("barbeiros.html")) {
    carregarAgendaDoDia();
}