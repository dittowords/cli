import axios from "axios";
import appContext from "../utils/appContext";

const httpClient = axios.create({
  headers: {
    "x-ditto-app": "cli",
  },
});

httpClient.interceptors.request.use((config) => {
  config.baseURL = appContext.apiHost;
  config.headers["x-ditto-client-id"] = appContext.clientId;
  config.headers.Authorization = appContext.apiToken;
  return config;
});

export default httpClient;
