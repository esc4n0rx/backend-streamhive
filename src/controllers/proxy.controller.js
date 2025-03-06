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
    const contentType = videoRes.headers["content-type"] || "";
    // Adiciona o header CORS para permitir requisições do seu frontend
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (contentType.includes("application/vnd.apple.mpegurl")) {
      // Se for um manifesto HLS, capture e modifique seu conteúdo
      let data = "";
      videoRes.setEncoding("utf8");
      videoRes.on("data", (chunk) => {
        data += chunk;
      });
      videoRes.on("end", () => {
        // Reescreve URLs que começam com "http://" para que sejam encaminhadas pelo proxy
        // Exemplo: substitui "http://exemplo.com/segment.ts" por "https://backend-streamhive.onrender.com/api/proxy?url=http%3A%2F%2Fexemplo.com%2Fsegment.ts"
        const rewritten = data.replace(/(http:\/\/[^\s]+)/g, (match) => {
          return `https://backend-streamhive.onrender.com/api/proxy?url=${encodeURIComponent(match)}`;
        });
        res.writeHead(videoRes.statusCode, videoRes.headers);
        res.end(rewritten);
      });
    } else {
      // Se não for um manifesto, repassa os dados normalmente
      res.writeHead(videoRes.statusCode, videoRes.headers);
      videoRes.pipe(res);
    }
  }).on("error", (err) => {
    console.error("Erro no proxy:", err);
    res.status(500).json({ message: "Erro ao buscar o vídeo." });
  });
};

module.exports = { proxyVideo };
