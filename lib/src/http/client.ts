import axios, { InternalAxiosRequestConfig } from "axios";
import appContext from "../utils/appContext";

export function defaultInterceptor(token?: string) {
  return function (config: InternalAxiosRequestConfig) {
    config.baseURL = appContext.apiHost;
    config.headers["x-ditto-client-id"] = appContext.clientId;
    config.headers["x-ditto-app"] = "cli";
    config.headers.Authorization = token || appContext.apiToken;
    return config;
  };
}

const httpClient = axios.create({});

httpClient.interceptors.request.use(defaultInterceptor());

export default httpClient;
