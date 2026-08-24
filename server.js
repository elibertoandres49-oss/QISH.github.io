/**
 * QISH 本地静态服务 + Bangumi API 代理缓存
 * 用法：在站点根目录 node server.js
 * 访问 http://localhost:8765
 *
 * Bangumi 要求带 User-Agent，浏览器直连易 403，故搜索必须走本代理。
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const dir = __dirname;
const PORT = 8765;
const CACHE_MS = 90 * 60 * 1000;
const BGM_HOST = "api.bgm.tv";
const UA = "QISH/1.0 (personal anime board; contact local)";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

/** @type {Map<string, { t: number, body: string, status: number }>} */
const memCache = new Map();

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function bgmRequest(apiPath, method, bodyStr) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BGM_HOST,
      path: apiPath,
      method: method || "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
      },
      timeout: 25000,
    };
    if (bodyStr) {
      opts.headers["Content-Type"] = "application/json";
      opts.headers["Content-Length"] = Buffer.byteLength(bodyStr);
    }
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolve({
          status: res.statusCode || 500,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function handleBgmProxy(req, res, urlObj) {
  let apiPath = urlObj.pathname.replace(/^\/api\/bgm/, "") || "/";
  if (urlObj.search) apiPath += urlObj.search;

  const method = (req.method || "GET").toUpperCase();
  let bodyStr = null;
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      bodyStr = await readBody(req);
    } catch (_) {
      bodyStr = "";
    }
  }

  const cacheKey = method + ":" + apiPath + (bodyStr ? ":" + bodyStr : "");
  const hit = memCache.get(cacheKey);
  if (hit && Date.now() - hit.t < CACHE_MS) {
    res.writeHead(hit.status, {
      "Content-Type": "application/json; charset=utf-8",
      "X-QISH-Cache": "HIT",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    });
    res.end(hit.body);
    return;
  }

  try {
    const result = await bgmRequest(apiPath, method, bodyStr);
    if (result.status >= 200 && result.status < 300) {
      memCache.set(cacheKey, {
        t: Date.now(),
        body: result.body,
        status: result.status,
      });
    }
    res.writeHead(result.status, {
      "Content-Type": "application/json; charset=utf-8",
      "X-QISH-Cache": "MISS",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    });
    res.end(result.body);
  } catch (e) {
    res.writeHead(502, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ error: "proxy_failed", message: String(e.message || e) }));
  }
}

http
  .createServer((req, res) => {
    try {
      const urlObj = new URL(req.url || "/", "http://localhost");
      if (urlObj.pathname.startsWith("/api/bgm")) {
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Accept, Content-Type",
          });
          res.end();
          return;
        }
        handleBgmProxy(req, res, urlObj);
        return;
      }

      let p = decodeURIComponent(urlObj.pathname);
      if (p === "/") p = "/index.html";
      const fp = path.join(dir, p);
      if (!fp.startsWith(dir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      fs.readFile(fp, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ext = path.extname(fp).toLowerCase();
        res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
        res.end(data);
      });
    } catch (e) {
      res.writeHead(500);
      res.end("Server error");
    }
  })
  .listen(PORT, () => {
    console.log("QISH server http://localhost:" + PORT);
    console.log("Bangumi proxy /api/bgm/* (GET+POST) cache " + CACHE_MS / 60000 + " min");
  });
