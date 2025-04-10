import axios from "axios";
import appContext from "../utils/appContext";

const httpClient = axios.create({
  baseURL: appContext.apiHost,
  headers: {
    "x-ditto-app": "cli",
    "x-ditto-client-id": appContext.clientId,
  },
});

httpClient.interceptors.request.use((config) => {
  config.headers.Authorization = appContext.apiToken;
  return config;
});

export default httpClient;
