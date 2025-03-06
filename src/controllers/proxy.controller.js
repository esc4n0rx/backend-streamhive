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

  // Opções para a requisição, incluindo um User-Agent válido
  const options = {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0 Safari/537.36"
    }
  };

  client.get(videoUrl, options, (videoRes) => {
    // Transfere os cabeçalhos do recurso remoto para o cliente
    res.writeHead(videoRes.statusCode, videoRes.headers);
    videoRes.pipe(res);
  }).on("error", (err) => {
    console.error("Erro no proxy:", err);
    res.status(500).json({ message: "Erro ao buscar o vídeo." });
  });
};

module.exports = { proxyVideo };
