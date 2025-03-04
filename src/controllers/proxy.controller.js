// controllers/proxy.controller.js
const http = require("http");
const https = require("https");

const allowedProtocols = ["http:", "https:"]; // ajuste se necessário

const proxyVideo = (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ message: "Parâmetro 'url' é obrigatório." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(videoUrl);
  } catch (err) {
    return res.status(400).json({ message: "URL inválido." });
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return res.status(400).json({ message: "Protocolo não permitido." });
  }

  // Se desejar, você pode adicionar validações extras (por exemplo, limitar a certos domínios)

  const client = parsedUrl.protocol === "http:" ? http : https;
  client
    .get(videoUrl, (videoRes) => {
      // Transfere os cabeçalhos do recurso remoto para o cliente
      res.writeHead(videoRes.statusCode, videoRes.headers);
      videoRes.pipe(res);
    })
    .on("error", (err) => {
      console.error("Erro no proxy:", err);
      res.status(500).json({ message: "Erro ao buscar o vídeo." });
    });
};

module.exports = { proxyVideo };
