import axios from "axios";

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

  if (process.env.DEBUG_CLI) {
    console.debug(`Host: ${consts.API_HOST}`);

    client.interceptors.request.use((request) => {
      console.debug("Starting Request", request.url);
      return request;
    });

    client.interceptors.response.use(response => {
      console.debug('Response:', response);
      return response;
    });
  }

  return client;
}
