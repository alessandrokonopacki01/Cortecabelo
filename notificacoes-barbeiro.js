
/*
  CORTE CABELO
  Notificações do barbeiro — etapa 1
*/

(() => {
  const botaoAtivar = document.getElementById(
    "btnAtivarNotificacoes"
  );

  const botaoTestar = document.getElementById(
    "btnTestarNotificacoes"
  );

  const status = document.getElementById(
    "statusNotificacoes"
  );

  if (
    !botaoAtivar ||
    !botaoTestar ||
    !status
  ) {
    return;
  }

  function informar(mensagem) {
    status.textContent = mensagem;
  }

  function suportado() {
    return (
      "Notification" in window &&
      "serviceWorker" in navigator &&
      window.isSecureContext
    );
  }

  function atualizarInterface() {
    if (!suportado()) {
      informar(
        "Este dispositivo ou navegador não " +
        "oferece o suporte necessário."
      );

      botaoAtivar.disabled = true;
      botaoTestar.hidden = true;
      return;
    }

    if (Notification.permission === "granted") {
      informar(
        "✅ Notificações permitidas neste dispositivo."
      );

      botaoAtivar.textContent =
        "Notificações ativadas";

      botaoTestar.hidden = false;
      return;
    }

    if (Notification.permission === "denied") {
      informar(
        "❌ As notificações estão bloqueadas. " +
        "Altere a permissão nas configurações " +
        "do navegador ou aplicativo."
      );

      botaoAtivar.disabled = true;
      botaoTestar.hidden = true;
      return;
    }

    informar(
      "Toque no botão para permitir notificações."
    );

    botaoTestar.hidden = true;
  }

  async function obterRegistro() {
    const registro =
      await navigator.serviceWorker.register(
        "/sw.js",
        {
          scope: "/"
        }
      );

    await navigator.serviceWorker.ready;

    return registro;
  }

  async function ativarNotificacoes() {
    if (!suportado()) {
      atualizarInterface();
      return;
    }

    botaoAtivar.disabled = true;

    try {
      // Solicitação realizada a partir
      // do clique do usuário.
      const permissao =
        await Notification.requestPermission();

      if (permissao !== "granted") {
        atualizarInterface();
        return;
      }

      await obterRegistro();

      informar(
        "✅ Permissão concedida! " +
        "Agora você pode testar os avisos."
      );

    } catch (erro) {
      console.error(erro);

      informar(
        "Não foi possível ativar as notificações."
      );

    } finally {
      botaoAtivar.disabled = false;
      atualizarInterface();
    }
  }

  async function testarNotificacao() {
    if (Notification.permission !== "granted") {
      informar(
        "Permita as notificações primeiro."
      );
      return;
    }

    botaoTestar.disabled = true;

    try {
      const registro = await obterRegistro();

      const parametros =
        new URLSearchParams(location.search);

      const salao =
        parametros.get("b");

      const url = salao
        ? `/barbeiros.html?b=${encodeURIComponent(salao)}`
        : "/barbeiros.html";

      await registro.showNotification(
        "CorteCabelo 💈",
        {
          body:
            "Teste realizado! Seu próximo " +
            "cliente será avisado aqui 5 minutos " +
            "antes do atendimento.",

          icon: "/img/pwa-192.png",
          badge: "/img/pwa-192.png",

          tag: "teste-cortecabelo",

          data: {
            url
          }
        }
      );

      informar(
        "✅ Notificação de teste enviada " +
        "ao dispositivo."
      );

    } catch (erro) {
      console.error(erro);

      informar(
        "Não foi possível enviar a notificação."
      );

    } finally {
      botaoTestar.disabled = false;
    }
  }

  botaoAtivar.addEventListener(
    "click",
    ativarNotificacoes
  );

  botaoTestar.addEventListener(
    "click",
    testarNotificacao
  );

  atualizarInterface();
})();
