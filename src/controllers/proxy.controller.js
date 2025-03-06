// controllers/proxy.controller.js
const http = require("http");
const https = require("https");

const allowedProtocols = ["http:", "https:"];

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

  const client = parsedUrl.protocol === "http:" ? http : https;
  const options = {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0 Safari/537.36"
    }
  };

  client.get(videoUrl, options, (videoRes) => {
    // Copia os headers recebidos e adiciona o header CORS
    const headers = { ...videoRes.headers, "Access-Control-Allow-Origin": "*" };
    res.writeHead(videoRes.statusCode, headers);
    videoRes.pipe(res);
  }).on("error", (err) => {
    console.error("Erro no proxy:", err);
    res.status(500).json({ message: "Erro ao buscar o vídeo." });
  });
};

module.exports = { proxyVideo };
