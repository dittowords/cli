const axios = require("axios").default;

const config = require("./config");
const consts = require("./consts");

function create(token) {
  return axios.create({
    baseURL: consts.API_HOST,
    headers: {
      Authorization: `token ${token}`,
    },
  });
}

module.exports = { create };
module.exports.default = create(
  config.getToken(consts.CONFIG_FILE, consts.API_HOST)
);
