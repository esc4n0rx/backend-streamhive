// controllers/proxy.controller.js
const http = require("http");
const https = require("https");

const allowedProtocols = ["http:", "https:"];

const proxyVideo = (req, res) => {
  const videoUrl = req.query.url;
  console.log("[Proxy] Requisição recebida para URL:", videoUrl);
  
  if (!videoUrl) {
    console.error("[Proxy] Parâmetro 'url' não fornecido.");
    return res.status(400).json({ message: "Parâmetro 'url' é obrigatório." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(videoUrl);
    console.log("[Proxy] URL parseada com sucesso:", parsedUrl.href);
  } catch (err) {
    console.error("[Proxy] Erro ao parsear URL:", err);
    return res.status(400).json({ message: "URL inválido." });
  }

  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    console.error("[Proxy] Protocolo não permitido:", parsedUrl.protocol);
    return res.status(400).json({ message: "Protocolo não permitido." });
  }

  const client = parsedUrl.protocol === "http:" ? http : https;
  const options = {
    method: req.method,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0 Safari/537.36",
      "Referer": parsedUrl.origin,
      "Origin": parsedUrl.origin,
    },
  };

  console.log("[Proxy] Iniciando requisição com as opções:", options);
  
  const proxyReq = client.request(videoUrl, options, (videoRes) => {
    console.log("[Proxy] Resposta recebida. Status:", videoRes.statusCode);
    console.log("[Proxy] Cabeçalhos originais da resposta:", videoRes.headers);
    
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

    const contentType = videoRes.headers["content-type"] || "";
    console.log("[Proxy] Content-Type da resposta:", contentType);

    if (
      contentType.includes("application/vnd.apple.mpegurl") ||
      contentType.includes("application/x-mpegURL") ||
      videoUrl.endsWith(".m3u8") ||
      contentType.includes("application/dash+xml") ||
      videoUrl.endsWith(".mpd")
    ) {
      console.log("[Proxy] Manifest HLS/DASH detectado. Iniciando reescrita.");
      let data = "";
      videoRes.setEncoding("utf8");
      videoRes.on("data", (chunk) => {
        console.log("[Proxy] Recebido chunk do manifesto. Tamanho:", chunk.length);
        data += chunk;
      });
      
      videoRes.on("end", () => {
        console.log("[Proxy] Final do manifesto recebido. Tamanho total:", data.length);
        const baseUrl = getBaseUrl(videoUrl);
        console.log("[Proxy] Base URL para resolução de URLs relativas:", baseUrl);
        const proxyBaseUrl = "https://" + req.get("host") + "/api/proxy?url=";
        console.log("[Proxy] Proxy Base URL:", proxyBaseUrl);

        // Reescreve todas as URLs que começam com "http://" (ou "https://") no manifesto
        const rewritten = data.replace(/https?:\/\/[^\r\n'"]+/g, (match) => {
          console.log("[Proxy] Reescrevendo URL:", match);
          return `${proxyBaseUrl}${encodeURIComponent(match)}`;
        });
        
        console.log("[Proxy] Manifest reescrito. Tamanho:", rewritten.length);
        // Remove content-length pois o tamanho pode ter mudado
        const headers = { ...videoRes.headers };
        delete headers["content-length"];
        res.writeHead(videoRes.statusCode, headers);
        res.end(rewritten);
      });
    } else {
      console.log("[Proxy] Conteúdo não é manifesto. Encaminhando dados sem modificação.");
      res.writeHead(videoRes.statusCode, videoRes.headers);
      videoRes.pipe(res);
    }
  });

  proxyReq.on("error", (err) => {
    console.error("[Proxy] Erro na requisição para URL:", videoUrl, err);
    res.status(500).json({ 
      message: "Erro ao buscar o recurso.",
      error: err.message,
      url: videoUrl
    });
  });

  // Se for um método POST e houver corpo, encaminha o corpo
  if (req.method === "POST" && req.body) {
    console.log("[Proxy] Encaminhando corpo da requisição POST.");
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
};

// Função auxiliar para obter a base URL (usada para reescrever URLs relativas)
function getBaseUrl(urlString) {
  const parsed = new URL(urlString);
  const pathParts = parsed.pathname.split("/");
  pathParts.pop(); // remove o nome do arquivo
  const pathWithoutFile = pathParts.join("/");
  return `${parsed.protocol}//${parsed.host}${pathWithoutFile}/`;
}

module.exports = { proxyVideo };
