const firebaseConfig = {
  apiKey: "AIzaSyA62D2gCNSPGtuZkPcNQxAQCI10T7leF8s",
  authDomain: "cortedoleo-825fa.firebaseapp.com",
  projectId: "cortedoleo-825fa",
  storageBucket: "cortedoleo-825fa.firebasestorage.app",
  messagingSenderId: "120441801182",
  appId: "1:120441801182:web:411d83e4e7fa26d568354f"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// 🔥 ESSA LINHA ESTAVA FALTANDO
const db = firebase.firestore();

// Formulário
document.getElementById("formAgendamento")
.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const servico = document.getElementById("servico").value;
  const dataBase = document.getElementById("data").value;
  const hora = document.getElementById("horarios").value;

const data = `${dataBase}T${hora}`;

  try {
    await db.collection("agendamentos").add({
      nome,
      whatsapp,
      servico,
      data,
      criadoEm: new Date()
    });

    alert("Agendamento realizado!");
  } catch (erro) {
    console.error(erro);
    alert("Erro ao salvar.");
  }
});

function gerarHorarios() {
  const horarios = [];
  const abertura = 9;
  const fechamento = 18;

  for (let h = abertura; h < fechamento; h++) {
    horarios.push(`${h.toString().padStart(2, "0")}:00`);
    horarios.push(`${h.toString().padStart(2, "0")}:30`);
  }

  return horarios;
}

async function carregarHorarios() {
  const dataInput = document.getElementById("data").value;
  const select = document.getElementById("horarios");

  if (!dataInput) return;

  select.innerHTML = "";

  const todosHorarios = gerarHorarios();

  // busca agendamentos do dia
  const snapshot = await db.collection("agendamentos").get();

  const ocupados = [];

  snapshot.forEach(doc => {
    const ag = doc.data();

    if (ag.data.startsWith(dataInput)) {
      const hora = ag.data.split("T")[1].substring(0,5);
      ocupados.push(hora);
    }
  });

  const livres = todosHorarios.filter(h => !ocupados.includes(h));

  livres.forEach(h => {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = h;
    select.appendChild(option);
  });
}

document.getElementById("data")
.addEventListener("change", carregarHorarios);