export type Exchange = "HOSE" | "HNX" | "UPCoM";

export type DataMode = "live" | "demo" | "unavailable";

export type FreshnessLabel =
  | "LIVE"
  | "DELAYED"
  | "MARKET_OPEN"
  | "MARKET_CLOSED"
  | "DEMO"
  | "UNAVAILABLE";

export type SessionPhase =
  | "preopen"
  | "ato"
  | "continuous_am"
  | "lunch"
  | "continuous_pm"
  | "atc"
  | "put_through"
  | "closed"
  | "weekend";

export type ChartRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export type DataSourceId = "vps" | "yahoo" | "ssi-fastconnect" | "simplize" | "mock" | "composite";

export type FieldOrigin = "quoted" | "derived" | "source" | "unavailable";

export interface DataAttribution {
  mode: DataMode;
  sourceId: DataSourceId;
  sourceLabel: string;
  freshness: FreshnessLabel;
  asOfIso: string;
  asOfIct: string;
  session: SessionPhase;
  caveats: string[];
  quoteSourceId?: DataSourceId;
  fundamentalsSourceId?: DataSourceId;
  fundamentalsAsOf?: string;
  /** Why the primary quote source was skipped. Present only on Yahoo / demo fallback. */
  fallbackReason?: string;
  historySourceId?: DataSourceId;
  historyFallbackReason?: string;
}

export interface SecurityIdentity {
  symbol: string;
  name: string;
  nameVi: string;
  exchange: Exchange;
  sector: string;
  vn30: boolean;
  group: "vn30" | "hose_liquid" | "hnx_mcap" | "upcom_mcap";
}

export interface Quote {
  symbol: string;
  price: number | null;
  reference: number | null;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  turnover: number | null;
  ceiling: number | null;
  floor: number | null;
}

export interface Fundamentals {
  marketCap: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  dividendYield: number | null;
  eps: number | null;
  bookValue: number | null;
  debtToEquity: number | null;
  high52w: number | null;
  low52w: number | null;
  sharesOutstanding: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
}

export interface ScreenerRow extends SecurityIdentity, Quote, Fundamentals {
  averageVolume: number | null;
}

export interface PricePoint {
  time: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndexSnapshot {
  code: string;
  name: string;
  value: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  turnover: number | null;
  advances: number | null;
  declines: number | null;
  unchanged: number | null;
}

export interface SectorSnapshot {
  sector: string;
  count: number;
  avgChangePct: number | null;
  advancers: number;
  decliners: number;
  unchanged: number;
}

export interface MarketOverview {
  attribution: DataAttribution;
  indices: IndexSnapshot[];
  universeSize: number;
  universeLabel: string;
  breadth: {
    scope: "exchange" | "universe";
    label: string;
    advances: number;
    declines: number;
    unchanged: number;
  };
  universeBreadth: {
    scope: "universe";
    label: string;
    advances: number;
    declines: number;
    unchanged: number;
  };
  volume: number | null;
  turnover: number | null;
  sectors: SectorSnapshot[];
  gainers: ScreenerRow[];
  losers: ScreenerRow[];
  active: ScreenerRow[];
}

export interface SecurityDetail {
  attribution: DataAttribution;
  identity: SecurityIdentity;
  quote: Quote;
  fundamentals: Fundamentals;
  history: PricePoint[];
  overview: string;
  overviewVi: string;
  peers: ScreenerRow[];
}

export interface ScreenerFilters {
  query?: string;
  exchanges?: Exchange[];
  sectors?: string[];
  vn30Only?: boolean;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  minChangePct?: number;
  maxChangePct?: number;
  minPe?: number;
  maxPe?: number;
  minPb?: number;
  maxPb?: number;
  minRoe?: number;
  minDividendYield?: number;
  minVolume?: number;
}

export type ScreenerSortKey =
  | "symbol"
  | "name"
  | "sector"
  | "exchange"
  | "price"
  | "changePct"
  | "volume"
  | "turnover"
  | "marketCap"
  | "pe"
  | "pb"
  | "roe"
  | "dividendYield";

export interface MarketDataProvider {
  readonly id: DataSourceId;
  getMarketOverview(): Promise<MarketOverview>;
  getIndices(): Promise<IndexSnapshot[]>;
  getSecurities(filters?: ScreenerFilters): Promise<ScreenerRow[]>;
  getSecurity(symbol: string): Promise<SecurityDetail | null>;
  getPriceHistory(symbol: string, range: ChartRange): Promise<PricePoint[]>;
}

export class ProviderError extends Error {
  readonly code:
    | "not_configured"
    | "rate_limited"
    | "unavailable"
    | "invalid"
    | "not_found";
  constructor(code: ProviderError["code"], message: string) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
  }
}

export interface ProviderStatus {
  configured: boolean;
  mode: DataMode;
  sourceLabel: string;
  message: string;
}
