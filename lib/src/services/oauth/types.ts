export interface OAuthCredential {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds, so a stored credential survives across CLI runs. */
  expiresAt: number;
}
