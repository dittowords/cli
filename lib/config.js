const fs = require('fs');
const path = require('path');
const url = require('url');

const yaml = require('js-yaml');

function createFileIfMissing(filename) {
  const dir = path.dirname(filename);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  if (!fs.existsSync(filename)) {
    fs.closeSync(fs.openSync(filename, 'w'));
  }
}

function readData(file, defaultData = {}) {
  createFileIfMissing(file);
  const fileContents = fs.readFileSync(file, 'utf8');
  return yaml.safeLoad(fileContents) || defaultData;
}

function writeData(file, data) {
  const yamlStr = yaml.safeDump(data);
  fs.writeFileSync(file, yamlStr, 'utf8');
}

function justTheHost(host) {
  if (!host.includes('://')) return host;
  return url.parse(host).hostname;
}

function saveToken(file, host, token) {
  const data = readData(file);
  const hostParsed = justTheHost(host);
  data[hostParsed] = data[hostParsed] || [];
  const { length } = data[hostParsed];
  data[hostParsed][length] = {};
  data[hostParsed][length].token = token;
  writeData(file, data);
}

function getToken(file, host) {
  const data = readData(file);
  const hostEntry = data[justTheHost(host)];
  if (!hostEntry) return undefined;
  const { length } = hostEntry;
  return hostEntry[length - 1].token;
}

function save(file, key, value) {
  const data = readData(file);
  let current = data;
  const parts = key.split('.');
  parts.slice(0, -1).forEach((part) => {
    if (!(part in current)) {
      current[part] = {};
      current = current[part];
    }
  });
  current[parts.slice(-1)] = value;
  writeData(file, data);
}

module.exports = {
  createFileIfMissing,
  readData,
  writeData,
  justTheHost,
  saveToken,
  getToken,
  save,
};
