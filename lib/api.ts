import axios from "axios";
import axiosRetry from "axios-retry";

import config from "./config";
import consts from "./consts";

export function createApiClient(token?: string) {
  const client = axios.create({
    baseURL: consts.API_HOST,
    headers: {
      Authorization: `token ${
        token || config.getToken(consts.CONFIG_FILE, consts.API_HOST)
      }`,
    },
  });
  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
  });
  return client;
}
