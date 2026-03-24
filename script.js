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
    let agendamentosFiltrados = [];

    snapshot.forEach(doc => {
        const ag = doc.data();
        
        // FILTRO: Só entra na lista se for o dia certo E NÃO for cancelado E NÃO for concluído
        if (ag.data.startsWith(diaBusca) && ag.status !== "cancelado" && ag.status !== "concluido") {
            agendamentosFiltrados.push({ id: doc.id, ...ag });
            encontrou = true;
        }
    });

    // Ordenar por horário (do mais cedo para o mais tarde)
    agendamentosFiltrados.sort((a, b) => a.data.localeCompare(b.data));

    agendamentosFiltrados.forEach(ag => {
        const hora = ag.data.split("T")[1].substring(0, 5);
        const div = document.createElement("div");
        div.classList.add("card");
        div.innerHTML = `
            <strong>${hora} - ${ag.nome}</strong><br>
            ${ag.servico} | WhatsApp: ${ag.whatsapp}<br><br>
            <button onclick="mudarStatus('${ag.id}', 'concluido')" style="width:45%; display:inline-block;">✔️ Concluir</button>
            <button onclick="mudarStatus('${ag.id}', 'cancelado')" style="width:45%; display:inline-block; background:#ff4444; color:white;">❌ Cancelar</button>
        `;
        container.appendChild(div);
    });

    if (!encontrou) {
        container.innerHTML += "<p>Nenhum agendamento pendente para este dia.</p>";
    }
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