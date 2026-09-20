import { env } from "@/lib/env.server";
import { LiveMarketDataProvider } from "./live-provider.ts";
import { MockMarketDataProvider } from "./mock-provider.ts";
import { ssiConfigured } from "./ssi.ts";
import type { MarketDataProvider, ProviderStatus } from "./types.ts";

export type ProviderChoice = "auto" | "vps" | "ssi" | "mock";

export function providerChoice(): ProviderChoice {
  const raw = (env("MARKET_DATA_PROVIDER") ?? "auto").toLowerCase();
  if (raw === "vps" || raw === "ssi" || raw === "mock" || raw === "auto") return raw;
  return "auto";
}

let singleton: MarketDataProvider | null = null;
let singletonKey = "";

export function getMarketDataProvider(): MarketDataProvider {
  const choice = providerChoice();
  const key = `${choice}:${ssiConfigured() ? "ssi" : "no-ssi"}`;
  if (singleton && singletonKey === key) return singleton;
  singletonKey = key;
  if (choice === "mock") {
    singleton = new MockMarketDataProvider();
    return singleton;
  }
  if (choice === "ssi" && !ssiConfigured()) {
    // FastConnect is documented but unused without keys. Do not silently
    // pretend VPS quotes are FastConnect.
    singleton = new MockMarketDataProvider();
    return singleton;
  }
  // auto / vps / ssi-with-keys: quotes still cascade VPS → Yahoo delayed.
  // SSI token support exists for a future EOD adapter; it is not a quote source.
  singleton = new LiveMarketDataProvider();
  return singleton;
}

export function describeProvider(): ProviderStatus {
  const choice = providerChoice();
  if (choice === "mock") {
    return {
      configured: true,
      mode: "demo",
      sourceLabel: "Deterministic demo fixture",
      message: "MARKET_DATA_PROVIDER=mock",
    };
  }
  if (choice === "ssi" && !ssiConfigured()) {
    return {
      configured: false,
      mode: "demo",
      sourceLabel: "SSI FastConnect (not configured)",
      message: "Set SSI_CONSUMER_ID and SSI_CONSUMER_SECRET to enable FastConnect. Quotes still require the VPS/Yahoo cascade.",
    };
  }
  return {
    configured: true,
    mode: "live",
    sourceLabel: "VPS public board → Yahoo delayed → demo",
    message: "Primary quotes: VPS public board. Fallback quotes: delayed Yahoo Finance *.VN. EOD overlay: Simplize. Demo only if both quote sources fail.",
  };
}

export function demoProvider(): MarketDataProvider {
  return new MockMarketDataProvider();
}

export function liveProvider(): MarketDataProvider {
  return new LiveMarketDataProvider();
}
