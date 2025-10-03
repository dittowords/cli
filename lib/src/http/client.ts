import axios, { InternalAxiosRequestConfig } from "axios";
import appContext from "../utils/appContext";
import { CommandMetaFlags } from "./types";

type InterceptorParams = { token?: string; meta?: CommandMetaFlags };

export function defaultInterceptor({ token, meta }: InterceptorParams = {}) {
  return function (config: InternalAxiosRequestConfig) {
    config.baseURL = appContext.apiHost;
    config.headers["x-ditto-client-id"] = appContext.clientId;
    config.headers["x-ditto-app"] =
      meta?.githubActionRequest === "true" ? "github_action" : "cli";
    config.headers.Authorization = token || appContext.apiToken;
    return config;
  };
}

const getHttpClient = (params: InterceptorParams) => {
  const httpClient = axios.create({});
  httpClient.interceptors.request.use(defaultInterceptor(params));
  return httpClient;
};

export default getHttpClient;
