// controllers/proxy.controller.js
const http = require("http");
const https = require("https");
const url = require("url");
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
    method: req.method,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0 Safari/537.36",
      // Forward additional headers that might be necessary for some sources
      "Referer": parsedUrl.origin,
      "Origin": parsedUrl.origin
    }
  };

  const proxyReq = client.request(videoUrl, options, (videoRes) => {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    
    const contentType = videoRes.headers["content-type"] || "";
    
    // Handle HLS manifests (.m3u8) and DASH manifests (.mpd)
    if (contentType.includes("application/vnd.apple.mpegurl") || 
        contentType.includes("application/x-mpegURL") ||
        videoUrl.endsWith(".m3u8") ||
        contentType.includes("application/dash+xml") ||
        videoUrl.endsWith(".mpd")) {
      
      let data = "";
      videoRes.setEncoding("utf8");
      videoRes.on("data", (chunk) => {
        data += chunk;
      });
      
      videoRes.on("end", () => {
        const baseUrl = getBaseUrl(videoUrl);
        const proxyBaseUrl = "https://" + req.get('host') + "/api/proxy?url=";

        // Replace both absolute and relative URLs in the manifest
        let rewritten = data;
        
        // Replace absolute HTTP URLs
        rewritten = rewritten.replace(/(https?:\/\/[^\s'"]+)/g, (match) => {
          return `${proxyBaseUrl}${encodeURIComponent(match)}`;
        });
        
        // Replace relative URLs (without protocol/host)
        rewritten = rewritten.replace(/^([^#][^\s'"]+\.(ts|m3u8|mpd|mp4|m4s))/gm, (match) => {
          const absoluteUrl = new URL(match, baseUrl).href;
          return `${proxyBaseUrl}${encodeURIComponent(absoluteUrl)}`;
        });
        
        // Copy necessary headers but remove content-length which may be incorrect after our modifications
        const headers = { ...videoRes.headers };
        delete headers['content-length'];
        res.writeHead(videoRes.statusCode, headers);
        res.end(rewritten);
      });
    } else {
      // For non-manifest files (segments, MP4s, etc.), pass through with original headers
      res.writeHead(videoRes.statusCode, videoRes.headers);
      videoRes.pipe(res);
    }
  });

  proxyReq.on("error", (err) => {
    console.error("Erro no proxy:", err);
    res.status(500).json({ 
      message: "Erro ao buscar o recurso.",
      error: err.message,
      url: videoUrl
    });
  });

  // If this is a POST, write the body
  if (req.method === 'POST' && req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  proxyReq.end();
};

// Helper function to get base URL for relative path resolution
function getBaseUrl(urlString) {
  const parsed = new URL(urlString);
  const pathParts = parsed.pathname.split('/');
  pathParts.pop(); // Remove the filename
  const pathWithoutFile = pathParts.join('/');
  return `${parsed.protocol}//${parsed.host}${pathWithoutFile}/`;
}

module.exports = { proxyVideo };