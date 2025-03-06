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

  const handleResponse = (videoRes) => {
    console.log("[Proxy] Resposta recebida. Status:", videoRes.statusCode);
    console.log("[Proxy] Cabeçalhos da resposta:", videoRes.headers);

    // Se houver redirecionamento, siga-o
    if (
      videoRes.statusCode >= 300 &&
      videoRes.statusCode < 400 &&
      videoRes.headers.location
    ) {
      const redirectUrl = videoRes.headers.location;
      console.log("[Proxy] Redirecionamento detectado para:", redirectUrl);
      const redirectClient = new URL(redirectUrl).protocol === "http:" ? http : https;
      // Faz nova requisição para a URL de redirecionamento
      redirectClient.get(redirectUrl, options, (redirectRes) => {
        console.log("[Proxy] Resposta do redirecionamento. Status:", redirectRes.statusCode);
        // Trata a resposta redirecionada como se fosse a original
        processResponse(redirectRes);
      }).on("error", (err) => {
        console.error("[Proxy] Erro ao seguir redirecionamento:", err);
        res.status(500).json({
          message: "Erro ao seguir redirecionamento.",
          error: err.message,
          url: redirectUrl,
        });
      });
    } else {
      processResponse(videoRes);
    }
  };

  // Função que processa a resposta, reescrevendo o manifesto se necessário
  const processResponse = (videoRes) => {
    // Define os headers CORS
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
      console.log("[Proxy] Manifest detectado. Iniciando reescrita do manifesto.");
      let data = "";
      videoRes.setEncoding("utf8");
      videoRes.on("data", (chunk) => {
        console.log("[Proxy] Chunk recebido do manifesto. Tamanho:", chunk.length);
        data += chunk;
      });
      videoRes.on("end", () => {
        console.log("[Proxy] Manifest recebido. Tamanho total:", data.length);
        const baseUrl = getBaseUrl(videoUrl);
        console.log("[Proxy] Base URL para resolução de URLs relativas:", baseUrl);
        const proxyBaseUrl = "https://" + req.get("host") + "/api/proxy?url=";
        console.log("[Proxy] Proxy Base URL:", proxyBaseUrl);

        // Reescreve todas as URLs absolutas que comecem com http:// ou https://
        let rewritten = data.replace(/https?:\/\/[^\r\n'"]+/g, (match) => {
          console.log("[Proxy] Reescrevendo URL encontrada:", match);
          return `${proxyBaseUrl}${encodeURIComponent(match)}`;
        });

        console.log("[Proxy] Manifest reescrito. Tamanho:", rewritten.length);
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
  };

  const proxyReq = client.request(videoUrl, options, handleResponse);

  proxyReq.on("error", (err) => {
    console.error("[Proxy] Erro na requisição para URL:", videoUrl, err);
    res.status(500).json({
      message: "Erro ao buscar o recurso.",
      error: err.message,
      url: videoUrl,
    });
  });

  // Se for POST e houver corpo, encaminha o corpo
  if (req.method === "POST" && req.body) {
    console.log("[Proxy] Encaminhando corpo da requisição POST.");
    proxyReq.write(JSON.stringify(req.body));
  }

  proxyReq.end();
};

// Helper para obter a base URL para resolução de URLs relativas
function getBaseUrl(urlString) {
  const parsed = new URL(urlString);
  const pathParts = parsed.pathname.split("/");
  pathParts.pop(); // Remove o nome do arquivo
  const pathWithoutFile = pathParts.join("/");
  return `${parsed.protocol}//${parsed.host}${pathWithoutFile}/`;
}

module.exports = { proxyVideo };
