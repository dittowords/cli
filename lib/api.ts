const axios = require("axios").default;

const config = require("./config");
const consts = require("./consts");

export const create = (token: string) => {
  return axios.create({
    baseURL: consts.API_HOST,
    headers: {
      Authorization: `token ${token}`,
    },
  });
};

export default create(config.getToken(consts.CONFIG_FILE, consts.API_HOST));
