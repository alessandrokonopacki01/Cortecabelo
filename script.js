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
  const data = document.getElementById("data").value;

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