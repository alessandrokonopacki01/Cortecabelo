
/*
  CORTE CABELO
  Service Worker do PWA

  Responsável por:
  - Instalação
  - Ativação
  - Recebimento de notificações push
  - Abertura da agenda
*/

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    self.clients.claim()
  );
});

// =====================================
// RECEBER NOTIFICAÇÕES PUSH
// =====================================

self.addEventListener("push", event => {
  let dados = {};

  try {
    dados = event.data
      ? event.data.json()
      : {};
  } catch (erro) {
    dados = {
      body: event.data
        ? event.data.text()
        : "Você tem um novo aviso."
    };
  }

  const mensagem = dados.data || dados;

  const titulo =
    mensagem.title ||
    mensagem.titulo ||
    "CorteCabelo 💈";

  const corpo =
    mensagem.body ||
    mensagem.mensagem ||
    "Você tem um próximo atendimento.";

  const endereco =
    mensagem.url ||
    "/barbeiros.html";

  event.waitUntil(
    self.registration.showNotification(
      titulo,
      {
        body: corpo,
        icon: "/img/pwa-192.png",
        badge: "/img/pwa-192.png",
        tag: mensagem.tag || "cortecabelo-aviso",
        data: {
          url: endereco
        }
      }
    )
  );
});

// =====================================
// CLICAR NA NOTIFICAÇÃO
// =====================================

self.addEventListener(
  "notificationclick",
  event => {
    event.notification.close();

    const destino = new URL(
      event.notification.data?.url ||
      "/barbeiros.html",
      self.location.origin
    );

    // Não abrir destinos externos.
    if (destino.origin !== self.location.origin) {
      return;
    }

    event.waitUntil(
      (async () => {
        const janelas =
          await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true
          });

        for (const janela of janelas) {
          if (
            new URL(janela.url).pathname ===
            destino.pathname
          ) {
            await janela.focus();
            return;
          }
        }

        await self.clients.openWindow(
          destino.href
        );
      })()
    );
  }
);
