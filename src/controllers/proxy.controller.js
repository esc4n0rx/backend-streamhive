// controllers/proxy.controller.js
const http = require("http");
const https = require("https");

const allowedProtocols = ["http:", "https:"];
const MAX_REDIRECTS = 5; // Limite de redirecionamentos

/**
 * Função recursiva que realiza a requisição e segue redirecionamentos até o recurso final.
 * Retorna uma Promise que resolve com o objeto de resposta final.
 */
const handleRequest = (videoUrl, options, redirCount = 0) => {
  return new Promise((resolve, reject) => {
    const parsed = new URL(videoUrl);
    const client = parsed.protocol === "http:" ? http : https;
    console.log(`[Proxy] Realizando requisição para: ${videoUrl} (Redirecionamento: ${redirCount})`);
    const req = client.request(videoUrl, options, (res) => {
      console.log(`[Proxy] Recebido status: ${res.statusCode} para: ${videoUrl}`);
      // Se o status for redirecionamento e houver header location, siga-o
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirCount >= MAX_REDIRECTS) {
          return reject(new Error("Número máximo de redirecionamentos atingido."));
        }
        const redirectUrl = res.headers.location;
        console.log("[Proxy] Redirecionamento detectado para:", redirectUrl);
        // Recursivamente segue o redirecionamento
        handleRequest(redirectUrl, options, redirCount + 1)
          .then(resolve)
          .catch(reject);
      } else {
        resolve(res);
      }
    });
    req.on("error", (err) => {
      reject(err);
    });
    req.end();
  });
};

/**
 * Helper para obter a base URL para resolução de URLs relativas
 */
function getBaseUrl(urlString) {
  const parsed = new URL(urlString);
  const pathParts = parsed.pathname.split("/");
  pathParts.pop(); // Remove o nome do arquivo
  const pathWithoutFile = pathParts.join("/");
  return `${parsed.protocol}//${parsed.host}${pathWithoutFile}/`;
}

/**
 * Função principal do proxy.
 * Faz a requisição (seguindo redirecionamentos), processa a resposta e reescreve manifests se necessário.
 */
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

  const options = {
    method: req.method,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0 Safari/537.36",
      "Referer": parsedUrl.origin,
      "Origin": parsedUrl.origin,
    },
  };

  console.log("[Proxy] Iniciando requisição com as opções:", options);

  handleRequest(videoUrl, options)
    .then((finalRes) => {
      console.log("[Proxy] Resposta final recebida. Status:", finalRes.statusCode);
      console.log("[Proxy] Cabeçalhos da resposta final:", finalRes.headers);

      // Adiciona os headers CORS na resposta
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
      res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

      const contentType = finalRes.headers["content-type"] || "";
      console.log("[Proxy] Content-Type da resposta final:", contentType);

      // Se for um manifesto (HLS ou DASH), processa e reescreve as URLs
      if (
        contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("application/x-mpegURL") ||
        videoUrl.endsWith(".m3u8") ||
        contentType.includes("application/dash+xml") ||
        videoUrl.endsWith(".mpd")
      ) {
        console.log("[Proxy] Manifest detectado. Iniciando reescrita do manifesto.");
        let data = "";
        finalRes.setEncoding("utf8");
        finalRes.on("data", (chunk) => {
          console.log("[Proxy] Chunk recebido do manifesto. Tamanho:", chunk.length);
          data += chunk;
        });
        finalRes.on("end", () => {
          console.log("[Proxy] Manifest recebido. Tamanho total:", data.length);
          const baseUrl = getBaseUrl(videoUrl);
          console.log("[Proxy] Base URL para resolução de URLs relativas:", baseUrl);
          const proxyBaseUrl = "https://" + req.get("host") + "/api/proxy?url=";
          console.log("[Proxy] Proxy Base URL:", proxyBaseUrl);
  
          // Reescreve todas as URLs absolutas que começam com http:// ou https://
          const rewritten = data.replace(/https?:\/\/[^\r\n'"]+/g, (match) => {
            console.log("[Proxy] Reescrevendo URL encontrada:", match);
            return `${proxyBaseUrl}${encodeURIComponent(match)}`;
          });
  
          console.log("[Proxy] Manifest reescrito. Tamanho:", rewritten.length);
          // Remove content-length pois o tamanho pode ter mudado
          const headers = { ...finalRes.headers };
          delete headers["content-length"];
          res.writeHead(finalRes.statusCode, headers);
          res.end(rewritten);
        });
      } else {
        console.log("[Proxy] Conteúdo não é manifesto. Encaminhando dados sem modificação.");
        res.writeHead(finalRes.statusCode, finalRes.headers);
        finalRes.pipe(res);
      }
    })
    .catch((err) => {
      console.error("[Proxy] Erro na requisição:", err);
      res.status(500).json({
        message: "Erro ao buscar o recurso.",
        error: err.message,
        url: videoUrl,
      });
    });
};

module.exports = { proxyVideo };
