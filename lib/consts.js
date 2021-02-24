const homedir = require('os').homedir();

const path = require('path');

module.exports.API_HOST = process.env.DITTO_API_HOST || 'https://api.dittowords.com';
module.exports.CONFIG_FILE = process.env.DITTO_CONFIG_FILE || path.join(homedir, '.config', 'ditto');
module.exports.PROJECT_CONFIG_FILE = path.normalize(path.join('ditto', 'config.yml'));
module.exports.TEXT_FILE = path.normalize(path.join('ditto', 'text.json'));
