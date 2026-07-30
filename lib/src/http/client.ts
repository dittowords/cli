import axios, { InternalAxiosRequestConfig } from "axios";
import appContext from "../utils/appContext";
import { getAccessToken } from "../services/oauth/credential";
import { CommandMetaFlags } from "./types";

type InterceptorParams = { token?: string; meta?: CommandMetaFlags };

/**
 * A static API key goes over the wire bare; an OAuth access token needs the
 * `Bearer` scheme, which is also how the API tells the two apart.
 */
async function resolveAuthorization(token?: string) {
  if (token) return token;

  const credential = appContext.oauthCredential;
  if (credential) return `Bearer ${await getAccessToken(credential)}`;

  return appContext.apiToken;
}

export function defaultInterceptor({ token, meta }: InterceptorParams = {}) {
  return async function (config: InternalAxiosRequestConfig) {
    config.baseURL = appContext.apiHost;
    config.headers["x-ditto-client-id"] = appContext.clientId;
    config.headers["x-ditto-app"] =
      meta?.githubActionRequest === "true" ? "github_action" : "cli";
    config.headers.Authorization = await resolveAuthorization(token);
    return config;
  };
}

const getHttpClient = (params: InterceptorParams) => {
  const httpClient = axios.create({});
  httpClient.interceptors.request.use(defaultInterceptor(params));
  return httpClient;
};

export default getHttpClient;
