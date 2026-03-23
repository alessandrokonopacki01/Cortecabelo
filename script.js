// CONFIG FIREBASE (cole o seu aqui)
const firebaseConfig = {
  apiKey: "SUA_KEY",
  authDomain: "SEU_DOMINIO",
  projectId: "SEU_ID",
};

// Inicializar
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.getElementById("formAgendamento")
.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.getElementById("nome").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const servico = document.getElementById("servico").value;
  const data = document.getElementById("data").value;

  await db.collection("agendamentos").add({
    nome,
    whatsapp,
    servico,
    data,
    criadoEm: new Date()
  });

  alert("Agendamento realizado!");
});