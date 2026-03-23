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
      data,
      criadoEm: new Date()
    });

    alert("Agendamento realizado!");
carregarHorarios();
  } catch (erro) {
    console.error(erro);
    alert("Erro ao salvar.");
  }
});

async function carregarHorarios() {
  document.getElementById("horaSelecionada").value = "";
  const dataInput = document.getElementById("data").value;
  const container = document.getElementById("horarios");

  if (!dataInput) return;

  container.innerHTML = "";

  const abertura = 9;
  const fechamento = 18;

  const horarios = [];

  for (let h = abertura; h < fechamento; h++) {
    horarios.push(`${h.toString().padStart(2, "0")}:00`);
    horarios.push(`${h.toString().padStart(2, "0")}:30`);
  }

  const snapshot = await db.collection("agendamentos").get();

  const ocupados = [];

  snapshot.forEach(doc => {
    const ag = doc.data();

    if (ag.data.startsWith(dataInput)) {
      const hora = ag.data.split("T")[1].substring(0,5);
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
        document.querySelectorAll(".horario-btn")
          .forEach(b => b.classList.remove("selected"));

        btn.classList.add("selected");
        document.getElementById("horaSelecionada").value = h;
      });
    }

    container.appendChild(btn);
  });
}

//pagina dos barbeiros

document.getElementById("data")
  .addEventListener("change", carregarHorarios);

  async function carregarAgendaDoDia() {
  const container = document.getElementById("listaAgendamentos");

  if (!container) return; // evita erro na outra página

  container.innerHTML = "";

  const hoje = new Date().toISOString().split("T")[0];

  const snapshot = await db.collection("agendamentos").get();

  const lista = [];

  snapshot.forEach(doc => {
    const ag = doc.data();

    if (ag.data.startsWith(hoje)) {
      lista.push(ag);
    }
  });

  // ordena por horário
  lista.sort((a, b) => a.data.localeCompare(b.data));

  lista.forEach(ag => {
    const hora = ag.data.split("T")[1].substring(0,5);

    const div = document.createElement("div");
    div.classList.add("card");

    div.innerHTML = `
      <strong>${hora}</strong><br>
      ${ag.nome}<br>
      ${ag.servico}<br>
      <a href="https://wa.me/${ag.whatsapp}" target="_blank">WhatsApp</a>
    `;

    container.appendChild(div);
  });
}