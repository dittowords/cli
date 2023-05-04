import axios from "axios";

import config from "./config";
import consts from "./consts";

export function createApiClient(token?: string) {
  return axios.create({
    baseURL: consts.API_HOST,
    headers: {
      Authorization: `token ${
        token || config.getToken(consts.CONFIG_FILE, consts.API_HOST)
      }`,
    },
  });
}
