const firebaseConfig = {
  apiKey: "AIzaSyA62D2gCNSPGtuZkPcNQxAQCI10T7leF8s",
  authDomain: "cortedoleo-825fa.firebaseapp.com",
  projectId: "cortedoleo-825fa",
  storageBucket: "cortedoleo-825fa.firebasestorage.app",
  messagingSenderId: "120441801182",
  appId: "1:120441801182:web:411d83e4e7fa26d568354f"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// --- 1. CLIENTE: AGENDAMENTO ---
async function carregarHorarios() {
    const dataInput = document.getElementById("data").value;
    const barbeiroSel = document.getElementById("barbeiro").value;
    const container = document.getElementById("horarios");
    if (!dataInput || !barbeiroSel || !container) return;

    container.innerHTML = "Carregando...";
    const snapshot = await db.collection("agendamentos").where("barbeiro", "==", barbeiroSel).get();
    const ocupados = [];
    snapshot.forEach(doc => {
        const ag = doc.data();
        if (ag.data.startsWith(dataInput) && ag.status !== "cancelado") {
            ocupados.push(ag.data.split("T")[1].substring(0, 5));
        }
    });

    container.innerHTML = "";
    for (let h = 9; h < 18; h++) {
        ["00", "30"].forEach(m => {
            const hora = `${h.toString().padStart(2, "0")}:${m}`;
            const btn = document.createElement("div");
            btn.textContent = hora;
            btn.className = "horario-btn" + (ocupados.includes(hora) ? " ocupado" : "");
            if (!ocupados.includes(hora)) {
                btn.onclick = () => {
                    document.querySelectorAll(".horario-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    document.getElementById("horaSelecionada").value = hora;
                };
            }
            container.appendChild(btn);
        });
    }
}

// --- 2. BARBEIRO: AGENDA ---

// --- 2. BARBEIRO: LOGIN E AGENDA (login.html / barbeiros.html) ---
async function fazerLogin() {
    const loginInput = document.getElementById("userLogin").value;
    const senhaInput = document.getElementById("userSenha").value;

    try {
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
    } catch (error) {
        console.error("Erro no login:", error);
    }
}
async function carregarAgendaDoDia() {
    const container = document.getElementById("listaAgendamentos");
    const barbeiroNome = localStorage.getItem("barbeiroLogado");
    if (!container || !barbeiroNome) return;

    const dataFiltro = document.getElementById("dataFiltro").value || new Date().toISOString().split("T")[0];
    const snapshot = await db.collection("agendamentos").where("barbeiro", "==", barbeiroNome).get();
    
    container.innerHTML = `<h3>Agenda: ${barbeiroNome}</h3>`;
    snapshot.forEach(doc => {
        const ag = doc.data();
        if (ag.data.startsWith(dataFiltro) && ag.status !== "cancelado" && ag.status !== "concluido") {
            const div = document.createElement("div");
            div.className = "card";
            div.innerHTML = `<strong>${ag.data.split("T")[1]} - ${ag.nome}</strong><br>
                <button onclick="mudarStatus('${doc.id}', 'concluido')">✔️</button>
                <button onclick="mudarStatus('${doc.id}', 'cancelado')" style="background:red">❌</button>`;
            container.appendChild(div);
        }
    });
}

async function mudarStatus(id, st) {
    await db.collection("agendamentos").doc(id).update({ status: st });
    carregarAgendaDoDia();
}

// --- 3. ADMIN: GESTÃO ---
async function carregarBarbeiros() {
    const select = document.getElementById("barbeiro");
    const listaAdmin = document.getElementById("listaBarbeirosAdmin");
    const snapshot = await db.collection("barbeiros").get();
    
    if (select) select.innerHTML = '<option value="">Selecione o Barbeiro</option>';
    if (listaAdmin) listaAdmin.innerHTML = "";

    snapshot.forEach(doc => {
        const b = doc.data();
        if (select) {
            const opt = new Option(b.nome, b.nome);
            select.add(opt);
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
    if (confirm("Excluir?")) { await db.collection("barbeiros").doc(id).delete(); location.reload(); }
}

// Inicialização
carregarBarbeiros();
if (document.getElementById("formAgendamento")) {
    document.getElementById("data").addEventListener("change", carregarHorarios);
    document.getElementById("barbeiro").addEventListener("change", carregarHorarios);
}