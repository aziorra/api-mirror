const express = require("express");
const path = require("path");
const {
  listRecordings,
  getRecording,
  updateRecording,
  deleteRecording,
} = require("../recorder");
const { getConfig, setConfig } = require("../config");

function createDashboardRouter() {
  const router = express.Router();
  router.use(express.json());

  router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  router.get("/api/list", (req, res) => {
    res.json(listRecordings());
  });

  router.get("/api/get/:filename", (req, res) => {
    const record = getRecording(req.params.filename);
    if (!record) return res.status(404).json({ error: "Not found" });
    res.json(record);
  });

  router.put("/api/update/:filename", (req, res) => {
    try {
      updateRecording(req.params.filename, req.body.body);
      res.json({ ok: true });
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  });

  router.delete("/api/delete/:filename", (req, res) => {
    try {
      deleteRecording(req.params.filename);
      res.json({ ok: true });
    } catch (e) {
      res.status(404).json({ error: e.message });
    }
  });

  router.get("/api/config", (req, res) => {
    res.json(getConfig());
  });

  router.put("/api/config", (req, res) => {
    const allowed = ["latency", "mirrorMode", "verbose"];
    const updates = {};
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }
    setConfig(updates);
    res.json(getConfig());
  });

  return router;
}

module.exports = { createDashboardRouter };
