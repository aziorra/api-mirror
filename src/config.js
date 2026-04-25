let _config = {
  target: "",
  mirrorMode: false,
  latency: 0,
  verbose: false,
  port: 3000,
};

function getConfig() {
  return { ..._config };
}

function setConfig(updates) {
  _config = { ..._config, ...updates };
}

function initConfig(initial) {
  _config = { ..._config, ...initial };
}

module.exports = { getConfig, setConfig, initConfig };
