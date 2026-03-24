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
    
    // Busca agendamentos existentes para marcar como ocupado
    const snapshot = await db.collection("agendamentos").where("barbeiro", "==", barbeiroSel).get();
    const ocupados = [];
    snapshot.forEach(doc => {
        const ag = doc.data();
        if (ag.data.startsWith(dataInput) && ag.status !== "cancelado") {
            ocupados.push(ag.data.split("T")[1].substring(0, 5));
        }
    });

    container.innerHTML = ""; // Limpa o texto "Carregando..."

    // --- BLOQUEIO DE HORÁRIOS PASSADOS ---
    const agora = new Date();
    // Formata a data de hoje para comparação (Ano-Mês-Dia)
    const hojeData = agora.getFullYear() + "-" + 
                     String(agora.getMonth() + 1).padStart(2, '0') + "-" + 
                     String(agora.getDate()).padStart(2, '0');
    
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    for (let h = 9; h < 18; h++) {
        ["00", "30"].forEach(m => {
            const horaOpcao = `${h.toString().padStart(2, "0")}:${m}`;
            
            // Se o dia selecionado for HOJE, verifica se o horário já passou
            if (dataInput === hojeData) {
                const hNum = parseInt(h);
                const mNum = parseInt(m);
                // Se a hora for menor que a atual, ou se for a mesma hora mas o minuto já passou, IGNORE
                if (hNum < horaAtual || (hNum === horaAtual && mNum <= minutoAtual)) {
                    return; // Este 'return' faz o código pular para a próxima opção sem criar o botão
                }
            }

            const btn = document.createElement("div");
            btn.textContent = horaOpcao;
            
            // Verifica se está ocupado no Firebase
            if (ocupados.includes(horaOpcao)) {
                btn.className = "horario-btn ocupado";
            } else {
                btn.className = "horario-btn";
                btn.onclick = () => {
                    document.querySelectorAll(".horario-btn").forEach(b => b.classList.remove("selected"));
                    btn.classList.add("selected");
                    document.getElementById("horaSelecionada").value = horaOpcao;
                };
            }
            container.appendChild(btn);
        });
    }

    // Mensagem de feedback caso não sobre nenhum horário para hoje
    if (container.innerHTML === "" && dataInput === hojeData) {
        container.innerHTML = "<p style='color:#888; font-size:13px;'>Expediente encerrado por hoje.</p>";
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
window.onload = () => {
    carregarBarbeiros(); // Garante que a lista de barbeiros apareça
    
    const campoData = document.getElementById("data");
    const campoBarbeiro = document.getElementById("barbeiro");

    // Bloqueia datas passadas no calendário
    if (campoData) {
        campoData.min = new Date().toISOString().split("T")[0];
        
        // Adiciona os eventos para carregar horários quando mudar a data ou barbeiro
        campoData.addEventListener("change", carregarHorarios);
    }
    
    if (campoBarbeiro) {
        campoBarbeiro.addEventListener("change", carregarHorarios);
    }
};

// --- FUNÇÃO DE SALVAR AGENDAMENTO (Faltava no seu código) ---
if (document.getElementById("formAgendamento")) {
    document.getElementById("formAgendamento").addEventListener("submit", async (e) => {
        e.preventDefault();

        const nome = document.getElementById("nome").value;
        const whatsapp = document.getElementById("whatsapp").value;
        const barbeiro = document.getElementById("barbeiro").value;
        const servico = document.getElementById("servico").value;
        const data = document.getElementById("data").value;
        const hora = document.getElementById("horaSelecionada").value;

        if (!hora) return alert("Selecione um horário!");

        try {
            await db.collection("agendamentos").add({
                nome,
                whatsapp,
                barbeiro,
                servico,
                data: `${data}T${hora}`, // Salva no formato ISO simples para o filtro funcionar
                status: "pendente"
            });

            alert("Agendamento realizado com sucesso!");
            location.reload();
        } catch (error) {
            console.error("Erro ao agendar:", error);
            alert("Erro ao salvar agendamento.");
        }
    });
}