const express = require("express");
const {
  createProxyMiddleware,
  responseInterceptor,
} = require("http-proxy-middleware");
const { saveResponse, loadResponse } = require("./recorder");
const { createDashboardRouter } = require("./dashboard/router");
const { getConfig } = require("./config");

const SKIP_HEADERS = [
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "access-control-allow-credentials",
  "access-control-expose-headers",
  "access-control-max-age",
];

function serveFromMirror(req, res, verbose) {
  const recording = loadResponse(req);
  if (!recording) return false;
  if (verbose) console.log(`[api-mirror] MIRROR  ${req.method} ${req.path}`);
  res.status(recording.statusCode);
  if (recording.headers) {
    Object.entries(recording.headers).forEach(([k, v]) => {
      if (!SKIP_HEADERS.includes(k.toLowerCase())) {
        try {
          res.set(k, v);
        } catch (_) {}
      }
    });
  }
  res.send(recording.body);
  return true;
}

function createServer() {
  const app = express();
  app.use(express.json());

  // CORS — allow any origin so the frontend port never gets blocked
  app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.set(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] || "Content-Type,Authorization",
    );
    res.set("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Dynamic latency middleware (reads config at request time)
  app.use((req, res, next) => {
    if (req.path.startsWith("/_mirror")) return next();
    const { latency } = getConfig();
    if (latency > 0) {
      setTimeout(next, latency);
    } else {
      next();
    }
  });

  // Dashboard
  app.use("/_mirror", createDashboardRouter());

  // Mirror-only mode: serve all requests from recorded files
  app.use((req, res, next) => {
    const { mirrorMode, verbose } = getConfig();
    if (!mirrorMode) return next();
    const served = serveFromMirror(req, res, verbose);
    if (!served) {
      res.status(404).json({
        error: "No recording found",
        hint: "Run without --mirror to record this request first",
        path: req.path,
        method: req.method,
      });
    }
  });

  // Proxy mode: forward to real API and record 200 responses
  app.use((req, res, next) => {
    const { mirrorMode } = getConfig();
    if (mirrorMode) return next(); // already handled above
    next();
  });

  const proxyMiddleware = createProxyMiddleware({
    // target is resolved dynamically per request
    router: () => getConfig().target,
    changeOrigin: true,
    selfHandleResponse: true,
    on: {
      proxyRes: responseInterceptor(async (responseBuffer, proxyRes, req) => {
        const { verbose } = getConfig();
        if (proxyRes.statusCode === 200) {
          const body = responseBuffer.toString("utf8");
          const filepath = saveResponse(
            req,
            proxyRes.statusCode,
            proxyRes.headers,
            body,
          );
          if (verbose)
            console.log(
              `[api-mirror] RECORDED ${req.method} ${req.path} → ${filepath}`,
            );
        } else {
          if (getConfig().verbose) {
            console.log(
              `[api-mirror] PROXY    ${req.method} ${req.path} → ${proxyRes.statusCode} (not recorded)`,
            );
          }
        }
        return responseBuffer;
      }),
      error: (err, req, res) => {
        const { verbose } = getConfig();
        if (
          ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].includes(
            err.code,
          )
        ) {
          const served = serveFromMirror(req, res, verbose);
          if (!served) {
            res.status(503).json({
              error: "Backend unavailable and no recording found",
              hint: "Start your backend and record requests, or run with --mirror",
              path: req.path,
              method: req.method,
              backendError: err.code,
            });
          }
        } else {
          console.error(`[api-mirror] PROXY ERROR ${err.message}`);
          res.status(500).json({ error: err.message });
        }
      },
    },
  });

  app.use((req, res, next) => {
    const { mirrorMode } = getConfig();
    if (mirrorMode) return next();
    proxyMiddleware(req, res, next);
  });

  return app;
}

module.exports = { createServer };
