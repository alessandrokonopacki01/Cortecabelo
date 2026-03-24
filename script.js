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

// ==========================================
// 1. CLIENTE: AGENDAMENTO (index.html)
// ==========================================

async function carregarHorarios() {
    const dataElement = document.getElementById("data");
    const barbeiroElement = document.getElementById("barbeiro");
    const container = document.getElementById("horarios");
    const horaSelectInput = document.getElementById("horaSelecionada");

    if (!dataElement || !barbeiroElement || !container) return;

    const dataInput = dataElement.value;
    const barbeiroSelecionado = barbeiroElement.value;

    container.innerHTML = "";
    if (horaSelectInput) horaSelectInput.value = "";

    // Só mostra horários se houver data E barbeiro selecionado
    if (!dataInput || !barbeiroSelecionado) {
        container.innerHTML = "<p style='font-size:12px; color:#888;'>Escolha o barbeiro e a data para ver horários.</p>";
        return;
    }

    const horariosOpcoes = [];
    for (let h = 9; h < 18; h++) {
        horariosOpcoes.push(`${h.toString().padStart(2, "0")}:00`);
        horariosOpcoes.push(`${h.toString().padStart(2, "0")}:30`);
    }

    try {
        // Busca apenas agendamentos do barbeiro escolhido para não bloquear os outros
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

        horariosOpcoes.forEach(h => {
            const btn = document.createElement("div");
            btn.textContent = h;
            btn.classList.add("horario-btn");

            if (ocupados.includes(h)) {
                btn.classList.add("ocupado");
            } else {
                btn.addEventListener("click", () => {
                    document.querySelectorAll(".horario-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    if (horaSelectInput) horaSelectInput.value = h;
                });
            }
            container.appendChild(btn);
        });
    } catch (e) { console.error("Erro horários:", e); }
}

// Eventos da página inicial
if (document.getElementById("formAgendamento")) {
    document.getElementById("data").addEventListener("change", carregarHorarios);
    document.getElementById("barbeiro").addEventListener("change", carregarHorarios);

    document.getElementById("formAgendamento").addEventListener("submit", async (e) => {
        e.preventDefault();
        const nome = document.getElementById("nome").value;
        const whatsapp = document.getElementById("whatsapp").value;
        const barbeiro = document.getElementById("barbeiro").value;
        const servico = document.getElementById("servico").value;
        const dataBase = document.getElementById("data").value;
        const hora = document.getElementById("horaSelecionada").value;

        if (!hora) return alert("Selecione um horário!");

        try {
            await db.collection("agendamentos").add({
                nome, whatsapp, servico, barbeiro,
                data: `${dataBase}T${hora}`,
                status: "pendente",
                criadoEm: new Date()
            });
            alert("Agendamento realizado!");
            carregarHorarios();
        } catch (erro) { alert("Erro ao agendar."); }
    });
}

// ==========================================
// 2. BARBEIRO: LOGIN E AGENDA (barbeiros.html / login.html)
// ==========================================

async function fazerLogin() {
    const loginInput = document.getElementById("userLogin").value;
    const senhaInput = document.getElementById("userSenha").value;

    const snapshot = await db.collection("barbeiros")
        .where("login", "==", loginInput)
        .where("senha", "==", senhaInput)
        .get();

    if (!snapshot.empty) {
        localStorage.setItem("barbeiroLogado", snapshot.docs[0].data().nome);
        window.location.href = "barbeiros.html";
    } else {
        alert("Login ou senha incorretos!");
    }
}

async function carregarAgendaDoDia() {
    const container = document.getElementById("listaAgendamentos");
    if (!container) return;

    const barbeiroNome = localStorage.getItem("barbeiroLogado");
    if (!barbeiroNome) {
        window.location.href = "login.html";
        return;
    }

    const dataFiltro = document.getElementById("dataFiltro").value;
    const diaBusca = dataFiltro || new Date().toISOString().split("T")[0];

    const snapshot = await db.collection("agendamentos")
        .where("barbeiro", "==", barbeiroNome)
        .get();

    container.innerHTML = `<h2>Agenda: ${barbeiroNome}</h2>`;
    let encontrou = false;

    snapshot.forEach(doc => {
        const ag = doc.data();
        if (ag.data.startsWith(diaBusca)) {
            encontrou = true;
            const hora = ag.data.split("T")[1].substring(0, 5);
            const div = document.createElement("div");
            div.classList.add("card");
            div.innerHTML = `
                <strong>${hora} - ${ag.nome}</strong><br>
                ${ag.servico} | WhatsApp: ${ag.whatsapp}<br>
                Status: ${ag.status}<br>
                <button onclick="mudarStatus('${doc.id}', 'concluido')">✔️</button>
                <button onclick="mudarStatus('${doc.id}', 'cancelado')" style="background:red">❌</button>
            `;
            container.appendChild(div);
        }
    });
    if (!encontrou) container.innerHTML += "<p>Nenhum agendamento.</p>";
}

async function mudarStatus(id, novoStatus) {
    await db.collection("agendamentos").doc(id).update({ status: novoStatus });
    carregarAgendaDoDia();
}

// ==========================================
// 3. ADMIN: GESTÃO DE BARBEIROS (admin.html)
// ==========================================

async function carregarBarbeiros() {
    const select = document.getElementById("barbeiro"); // index.html
    const listaAdmin = document.getElementById("listaBarbeirosAdmin"); // admin.html
    
    const snapshot = await db.collection("barbeiros").get();
    
    if (select) select.innerHTML = '<option value="">Selecione o Barbeiro</option>';
    if (listaAdmin) listaAdmin.innerHTML = "";

    snapshot.forEach(doc => {
        const b = doc.data();
        if (select) {
            const opt = document.createElement("option");
            opt.value = b.nome; opt.textContent = b.nome;
            select.appendChild(opt);
        }
        if (listaAdmin) {
            const div = document.createElement("div");
            div.innerHTML = `${b.nome} <button onclick="excluirBarbeiro('${doc.id}')">Excluir</button>`;
            listaAdmin.appendChild(div);
        }
    });
}

async function cadastrarBarbeiro() {
    const nome = document.getElementById("nomeBarbeiro").value;
    const login = document.getElementById("loginBarbeiro").value;
    const senha = document.getElementById("senhaBarbeiro").value;
    if (!nome || !login || !senha) return alert("Preencha tudo!");

    await db.collection("barbeiros").add({ nome, login, senha });
    alert("Cadastrado!");
    location.reload();
}

async function excluirBarbeiro(id) {
    if (confirm("Excluir barbeiro?")) {
        await db.collection("barbeiros").doc(id).delete();
        location.reload();
    }
}

// INICIALIZAÇÃO GERAL
carregarBarbeiros();
if (document.getElementById("listaAgendamentos")) carregarAgendaDoDia();