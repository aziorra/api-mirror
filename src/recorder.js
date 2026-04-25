const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function getMirrorDir() {
  return path.resolve(process.cwd(), ".api-mirror");
}

function getFilename(method, urlPath, query) {
  const queryStr = Object.keys(query).length ? JSON.stringify(query) : "";
  const raw = `${method}:${urlPath}:${queryStr}`;
  const hash = crypto.createHash("md5").update(raw).digest("hex").slice(0, 8);
  const safePath =
    urlPath
      .replace(/\//g, "_")
      .replace(/^_/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "") || "root";
  return `${method}_${safePath}_${hash}.json`;
}

function saveResponse(req, statusCode, headers, body) {
  const dir = getMirrorDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = getFilename(req.method, req.path, req.query);
  const filepath = path.join(dir, filename);

  const record = {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    statusCode,
    headers,
    body,
    recordedAt: new Date().toISOString(),
  };

  fs.writeFileSync(filepath, JSON.stringify(record, null, 2));
  return filepath;
}

function loadResponse(req) {
  const dir = getMirrorDir();
  const filename = getFilename(req.method, req.path, req.query);
  const filepath = path.join(dir, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch {
    return null;
  }
}

function listRecordings() {
  const dir = getMirrorDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        return {
          filename: f,
          method: data.method,
          url: data.url,
          path: data.path,
          statusCode: data.statusCode,
          recordedAt: data.recordedAt,
          editedAt: data.editedAt,
        };
      } catch {
        return { filename: f, error: "Could not parse file" };
      }
    })
    .sort((a, b) => (b.recordedAt || "").localeCompare(a.recordedAt || ""));
}

function getRecording(filename) {
  const dir = getMirrorDir();
  const filepath = path.join(dir, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, "utf8"));
}

function updateRecording(filename, body) {
  const dir = getMirrorDir();
  const filepath = path.join(dir, filename);
  if (!fs.existsSync(filepath)) throw new Error("Recording not found");
  const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
  data.body = body;
  data.editedAt = new Date().toISOString();
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function deleteRecording(filename) {
  const dir = getMirrorDir();
  const filepath = path.join(dir, filename);
  if (!fs.existsSync(filepath)) throw new Error("Recording not found");
  fs.unlinkSync(filepath);
}

module.exports = {
  saveResponse,
  loadResponse,
  listRecordings,
  getRecording,
  updateRecording,
  deleteRecording,
  getMirrorDir,
};
