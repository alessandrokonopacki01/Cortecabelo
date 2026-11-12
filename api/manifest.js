
module.exports = function handler(req, res) {
  const slug = typeof req.query.b === "string"
    ? req.query.b
    : "";

  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 45
  ) {
    return res.status(400).json({
      error: "Identificador de barbearia inválido"
    });
  }

  const informado = typeof req.query.nome === "string"
    ? req.query.nome.trim()
    : "";

  const nome = informado.slice(0, 70) ||
    slug.replace(/-/g, " ");

  const inicio = `/index.html?b=${encodeURIComponent(slug)}`;

  res.setHeader(
    "Content-Type",
    "application/manifest+json; charset=utf-8"
  );

  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    id: inicio,
    name: nome,
    short_name: nome.slice(0, 22),
    description: `Agendamentos online - ${nome}`,
    start_url: inicio,
    scope: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    lang: "pt-BR",
    icons: [
      {
        src: "/img/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/img/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  });
};
