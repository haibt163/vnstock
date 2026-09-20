/**
 * Optional SSI FastConnect Data adapter.
 * Official, documented, credentialed. Not used unless SSI_CONSUMER_ID and
 * SSI_CONSUMER_SECRET are present. REST endpoints are EOD-oriented;
 * realtime streaming is out of scope for this app.
 *
 * Docs: https://guide.ssi.com.vn/ssi-products/tieng-viet/fastconnect-data
 */
import { env } from "@/lib/env.server";
import { ProviderError } from "./types.ts";

const TOKEN_URL = "https://fc-data.ssi.com.vn/api/v2/Market/AccessToken";

export function ssiConfigured(): boolean {
  return Boolean(env("SSI_CONSUMER_ID") && env("SSI_CONSUMER_SECRET"));
}

export async function ssiAccessToken(): Promise<string> {
  const id = env("SSI_CONSUMER_ID");
  const secret = env("SSI_CONSUMER_SECRET");
  if (!id || !secret) {
    throw new ProviderError("not_configured", "SSI FastConnect credentials are not set.");
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumerID: id, consumerSecret: secret }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new ProviderError("not_configured", "SSI FastConnect rejected the credentials.");
  }
  if (!res.ok) {
    throw new ProviderError("unavailable", `SSI FastConnect token error (${res.status}).`);
  }
  const json = (await res.json()) as { accessToken?: string; data?: { accessToken?: string } };
  const token = json.accessToken ?? json.data?.accessToken;
  if (!token) throw new ProviderError("unavailable", "SSI FastConnect returned no access token.");
  return token;
}
