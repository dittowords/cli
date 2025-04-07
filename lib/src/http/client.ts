import axios from "axios";
import appContext from "../appContext";

const httpClient = axios.create({
  baseURL: appContext.API_HOST,
  headers: {
    "x-ditto-app": "cli",
    "x-ditto-client-id": appContext.CLIENT_ID,
  },
});

httpClient.interceptors.request.use((config) => {
  config.headers.Authorization = appContext.API_TOKEN;
  return config;
});

export default httpClient;
