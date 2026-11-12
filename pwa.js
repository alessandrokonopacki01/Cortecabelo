
(() => {
  const slug = new URLSearchParams(
    window.location.search
  ).get("b");

  if (
    !slug ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 45
  ) return;

  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  document.head.appendChild(manifest);

  const appleTitle = document.createElement("meta");
  appleTitle.name = "apple-mobile-web-app-title";
  document.head.appendChild(appleTitle);

  function atualizar(nome) {
    const titulo = String(
      nome || slug.replace(/-/g, " ")
    ).trim().slice(0, 70);

    const params = new URLSearchParams({
      b: slug,
      nome: titulo
    });

    manifest.href = `/api/manifest?${params}`;
    appleTitle.content = titulo;
  }

  atualizar();

  window.configurarPwaSalao = (salao) => {
    if (salao && salao.id === slug && salao.nome) {
      atualizar(salao.nome);
    }
  };

  if (
    "serviceWorker" in navigator &&
    location.protocol === "https:"
  ) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(console.warn);
    });
  }
})();
