import type { Exchange, SecurityIdentity } from "./types.ts";

/**
 * Universe construction (quality over a forced 69):
 *
 * VN30 — SSIAM VN30 ETF creation basket dated 2026-09-15
 *   https://ssiam.com.vn/quy-etf-ssiam-vn30
 *   Same 30 names as the 2026-08-31 basket. ETF baskets can differ slightly
 *   from official HOSE VN30 due to cash substitution.
 *
 * HOSE extras — next 26 HOSE names by market cap on vonhoa.com as of 2026-09-15,
 *   excluding VN30. Liquid large/mid names that the VPS board actually returns.
 *
 * HNX extras — top 10 HNX names by market cap (stockanalysis.com / vonhoa, 2026-09-15).
 *
 * UPCoM extras — top 3 UPCoM names by market cap (VGI, ACV, MVN).
 *
 * A listed symbol stays in the screener even when the live board has no last print.
 * Quote fields stay null. Nothing is fabricated, and nothing is filled with zero.
 */
export const VN30_SOURCE = {
  name: "SSIAM VN30 ETF creation basket",
  url: "https://ssiam.com.vn/quy-etf-ssiam-vn30",
  asOf: "2026-09-15",
  note: "ETF baskets can differ slightly from the official HOSE VN30 due to cash substitution. HOSE's official constituent file was not freely accessible from this environment.",
};

export const UNIVERSE_SOURCE = {
  hoseMcap: { name: "vonhoa.com market-cap ranking", asOf: "2026-09-15" },
  hnxMcap: { name: "HNX / vonhoa.com market-cap ranking", asOf: "2026-09-15" },
  upcomMcap: { name: "vonhoa.com market-cap ranking", asOf: "2026-09-15" },
};

type Group = SecurityIdentity["group"];

const U = (
  symbol: string,
  name: string,
  nameVi: string,
  exchange: Exchange,
  sector: string,
  vn30: boolean,
  group: Group,
): SecurityIdentity => ({ symbol, name, nameVi, exchange, sector, vn30, group });

export const UNIVERSE: SecurityIdentity[] = [
  U("ACB", "Asia Commercial Bank", "Ngân hàng Á Châu", "HOSE", "Banks", true, "vn30"),
  U("BID", "BIDV", "Ngân hàng Đầu tư và Phát triển Việt Nam", "HOSE", "Banks", true, "vn30"),
  U("BSR", "Binh Son Refining", "Lọc hóa dầu Bình Sơn", "HOSE", "Energy", true, "vn30"),
  U("CTG", "VietinBank", "Ngân hàng Công thương Việt Nam", "HOSE", "Banks", true, "vn30"),
  U("FPT", "FPT Corporation", "Tập đoàn FPT", "HOSE", "Technology", true, "vn30"),
  U("GAS", "PetroVietnam Gas", "Tổng công ty Khí Việt Nam", "HOSE", "Energy", true, "vn30"),
  U("GVR", "Vietnam Rubber Group", "Tập đoàn Công nghiệp Cao su Việt Nam", "HOSE", "Materials", true, "vn30"),
  U("HDB", "HDBank", "Ngân hàng Phát triển TP.HCM", "HOSE", "Banks", true, "vn30"),
  U("HPG", "Hoa Phat Group", "Tập đoàn Hòa Phát", "HOSE", "Materials", true, "vn30"),
  U("LPB", "LPBank", "Ngân hàng TMCP Bưu điện Liên Việt", "HOSE", "Banks", true, "vn30"),
  U("MBB", "MBBank", "Ngân hàng Quân đội", "HOSE", "Banks", true, "vn30"),
  U("MCH", "Masan Consumer", "Masan Consumer", "HOSE", "Consumer Staples", true, "vn30"),
  U("MSN", "Masan Group", "Tập đoàn Masan", "HOSE", "Consumer Staples", true, "vn30"),
  U("MWG", "Mobile World", "Thế Giới Di Động", "HOSE", "Consumer Discretionary", true, "vn30"),
  U("SAB", "SABECO", "Tổng công ty Bia – Rượu – Nước giải khát Sài Gòn", "HOSE", "Consumer Staples", true, "vn30"),
  U("SHB", "Saigon-Hanoi Bank", "Ngân hàng Sài Gòn – Hà Nội", "HOSE", "Banks", true, "vn30"),
  U("SSB", "SeABank", "Ngân hàng Đông Nam Á", "HOSE", "Banks", true, "vn30"),
  U("SSI", "SSI Securities", "Chứng khoán SSI", "HOSE", "Financials", true, "vn30"),
  U("STB", "Sacombank", "Ngân hàng Sài Gòn Thương Tín", "HOSE", "Banks", true, "vn30"),
  U("TCB", "Techcombank", "Ngân hàng Kỹ thương Việt Nam", "HOSE", "Banks", true, "vn30"),
  U("TCX", "Techcom Securities", "Chứng khoán Techcom", "HOSE", "Financials", true, "vn30"),
  U("VCB", "Vietcombank", "Ngân hàng Ngoại thương Việt Nam", "HOSE", "Banks", true, "vn30"),
  U("VHM", "Vinhomes", "Vinhomes", "HOSE", "Real Estate", true, "vn30"),
  U("VIB", "VIBBank", "Ngân hàng Quốc tế", "HOSE", "Banks", true, "vn30"),
  U("VIC", "Vingroup", "Tập đoàn Vingroup", "HOSE", "Real Estate", true, "vn30"),
  U("VJC", "Vietjet", "Vietjet Aviation", "HOSE", "Industrials", true, "vn30"),
  U("VNM", "Vinamilk", "Sữa Việt Nam", "HOSE", "Consumer Staples", true, "vn30"),
  U("VPB", "VPBank", "Ngân hàng Việt Nam Thịnh Vượng", "HOSE", "Banks", true, "vn30"),
  U("VPL", "Vinpearl", "Vinpearl", "HOSE", "Consumer Discretionary", true, "vn30"),
  U("VRE", "Vincom Retail", "Vincom Retail", "HOSE", "Real Estate", true, "vn30"),
  U("VCK", "VPS Securities", "Chứng khoán VPS", "HOSE", "Financials", false, "hose_liquid"),
  U("HVN", "Vietnam Airlines", "Vietnam Airlines", "HOSE", "Industrials", false, "hose_liquid"),
  U("BVH", "Bao Viet Holdings", "Tập đoàn Bảo Việt", "HOSE", "Financials", false, "hose_liquid"),
  U("PLX", "Petrolimex", "Tập đoàn Xăng dầu Việt Nam", "HOSE", "Energy", false, "hose_liquid"),
  U("VPX", "VPBank Securities", "Chứng khoán VPBank", "HOSE", "Financials", false, "hose_liquid"),
  U("BCM", "Becamex", "Becamex IDC", "HOSE", "Real Estate", false, "hose_liquid"),
  U("MSB", "MSB", "Ngân hàng Hàng Hải", "HOSE", "Banks", false, "hose_liquid"),
  U("TPB", "TPBank", "Ngân hàng Tiên Phong", "HOSE", "Banks", false, "hose_liquid"),
  U("POW", "PV Power", "Tổng công ty Điện lực Dầu khí Việt Nam", "HOSE", "Utilities", false, "hose_liquid"),
  U("GMD", "Gemadept", "Gemadept", "HOSE", "Logistics", false, "hose_liquid"),
  U("VIX", "VIX Securities", "Chứng khoán VIX", "HOSE", "Financials", false, "hose_liquid"),
  U("EIB", "Eximbank", "Ngân hàng Xuất Nhập khẩu Việt Nam", "HOSE", "Banks", false, "hose_liquid"),
  U("OCB", "OCB", "Ngân hàng Phương Đông", "HOSE", "Banks", false, "hose_liquid"),
  U("HCM", "HSC", "Chứng khoán TP.HCM", "HOSE", "Financials", false, "hose_liquid"),
  U("NVL", "Novaland", "Tập đoàn Novaland", "HOSE", "Real Estate", false, "hose_liquid"),
  U("PGV", "EVNGENCO 3", "Tổng công ty Phát điện 3", "HOSE", "Utilities", false, "hose_liquid"),
  U("KBC", "Kinh Bac City", "Tổng công ty Phát triển Đô thị Kinh Bắc", "HOSE", "Real Estate", false, "hose_liquid"),
  U("REE", "REE Corporation", "Cơ điện lạnh", "HOSE", "Industrials", false, "hose_liquid"),
  U("VCI", "Vietcap", "Chứng khoán Vietcap", "HOSE", "Financials", false, "hose_liquid"),
  U("VND", "VNDIRECT", "Chứng khoán VNDIRECT", "HOSE", "Financials", false, "hose_liquid"),
  U("FRT", "FPT Retail", "Bán lẻ FPT", "HOSE", "Consumer Discretionary", false, "hose_liquid"),
  U("GEX", "Gelex", "Tập đoàn Gelex", "HOSE", "Industrials", false, "hose_liquid"),
  U("SBT", "TTC Sugar", "Mía đường Thành Thành Công – Biên Hòa", "HOSE", "Consumer Staples", false, "hose_liquid"),
  U("VPI", "Van Phu Invest", "Đầu tư Văn Phú – Invest", "HOSE", "Real Estate", false, "hose_liquid"),
  U("NAB", "Nam A Bank", "Ngân hàng Nam Á", "HOSE", "Banks", false, "hose_liquid"),
  U("DCM", "Ca Mau Fertilizer", "Đạm Cà Mau", "HOSE", "Materials", false, "hose_liquid"),
  U("KSF", "Sunshine Group", "Tập đoàn Sunshine", "HNX", "Real Estate", false, "hnx_mcap"),
  U("THD", "Thaiholdings", "Thaiholdings", "HNX", "Real Estate", false, "hnx_mcap"),
  U("KSV", "Vinacomin Minerals", "Khoáng sản TKV", "HNX", "Materials", false, "hnx_mcap"),
  U("NVB", "NCB", "Ngân hàng Quốc Dân", "HNX", "Banks", false, "hnx_mcap"),
  U("PVS", "PV Technical Services", "Dịch vụ Kỹ thuật Dầu khí Việt Nam", "HNX", "Energy", false, "hnx_mcap"),
  U("PVI", "PVI Holdings", "PVI Holdings", "HNX", "Financials", false, "hnx_mcap"),
  U("MBS", "MB Securities", "Chứng khoán MB", "HNX", "Financials", false, "hnx_mcap"),
  U("HUT", "Tasco", "Tasco", "HNX", "Industrials", false, "hnx_mcap"),
  U("IDC", "IDICO", "IDICO", "HNX", "Real Estate", false, "hnx_mcap"),
  U("SHS", "SHS", "Chứng khoán Sài Gòn – Hà Nội", "HNX", "Financials", false, "hnx_mcap"),
  U("VGI", "Viettel Global", "Đầu tư Quốc tế Viettel", "UPCoM", "Telecom", false, "upcom_mcap"),
  U("ACV", "Airports Corporation of Vietnam", "Tổng công ty Cảng hàng không Việt Nam", "UPCoM", "Industrials", false, "upcom_mcap"),
  U("MVN", "VIMC", "Tổng công ty Hàng hải Việt Nam", "UPCoM", "Logistics", false, "upcom_mcap"),
];

export const UNIVERSE_BY_SYMBOL: Record<string, SecurityIdentity> = Object.fromEntries(
  UNIVERSE.map((s) => [s.symbol, s]),
);

export const UNIVERSE_SYMBOLS = UNIVERSE.map((s) => s.symbol);

export const VN30_SYMBOLS = UNIVERSE.filter((s) => s.vn30).map((s) => s.symbol);

export const SECTORS = [...new Set(UNIVERSE.map((s) => s.sector))].sort();

export const EXCHANGES: Exchange[] = ["HOSE", "HNX", "UPCoM"];

/** Explicit missing sector. Not a guessed industry. */
export const UNCLASSIFIED_SECTOR = "—";

/** Equity tickers on these boards are 3-character codes. Longer codes are warrants, bonds, ETFs. */
export const EQUITY_SYMBOL_RE = /^[A-Z0-9]{3}$/;

export interface ListedName {
  name: string;
  nameVi: string;
  /** VPS master instrument code. S = equity. */
  type: string;
}

export interface BuiltUniverse {
  identities: SecurityIdentity[];
  counts: Record<Exchange, number>;
  dropped: number;
}

/**
 * Turn VPS board lists into identities.
 * Eligibility: 3-character symbol on exactly one of HOSE / HNX / UPCoM.
 * A master row whose type is present and not "S" is excluded (warrant, bond, ETF, derivative).
 * Curated 69-name metadata is preserved. Missing names become the ticker. Missing sectors stay "—".
 * VN30 is only the supplied vn30 list (or the curated list when vn30FromFeed is false).
 */
export function buildSecurityUniverse(input: {
  hose: readonly string[];
  hnx: readonly string[];
  upcom: readonly string[];
  vn30: readonly string[];
  names?: ReadonlyMap<string, ListedName> | null;
  /** When false, VN30 flags fall back to the curated seed instead of the feed list. */
  vn30FromFeed?: boolean;
}): BuiltUniverse {
  const names = input.names ?? null;
  const vn30 = new Set(
    (input.vn30FromFeed === false ? VN30_SYMBOLS : input.vn30).map((s) => s.trim().toUpperCase()),
  );
  const seen = new Map<string, Exchange>();
  const blocked = new Set<string>();
  let dropped = 0;
  const lists: Array<[Exchange, readonly string[]]> = [
    ["HOSE", input.hose],
    ["HNX", input.hnx],
    ["UPCoM", input.upcom],
  ];
  for (const [exchange, list] of lists) {
    for (const raw of list) {
      const symbol = raw.trim().toUpperCase();
      if (!EQUITY_SYMBOL_RE.test(symbol)) {
        dropped += 1;
        continue;
      }
      if (blocked.has(symbol)) continue;
      const prev = seen.get(symbol);
      if (prev) {
        if (prev !== exchange) {
          seen.delete(symbol);
          blocked.add(symbol);
          dropped += 1;
        }
        continue;
      }
      const meta = names?.get(symbol);
      if (meta && meta.type && meta.type !== "S") {
        dropped += 1;
        continue;
      }
      seen.set(symbol, exchange);
    }
  }

  const identities: SecurityIdentity[] = [];
  for (const [symbol, exchange] of seen) {
    const curated = UNIVERSE_BY_SYMBOL[symbol];
    const meta = names?.get(symbol);
    const isVn30 = vn30.has(symbol);
    const curatedOk = curated != null && curated.exchange === exchange;
    const nameVi = (curatedOk ? curated.nameVi : "") || meta?.nameVi || symbol;
    const name = (curatedOk ? curated.name : "") || meta?.name || nameVi;
    identities.push({
      symbol,
      name,
      nameVi,
      exchange,
      sector: curatedOk ? curated.sector : UNCLASSIFIED_SECTOR,
      vn30: isVn30,
      group: isVn30 ? "vn30" : curatedOk ? curated.group : "listed",
    });
  }
  identities.sort((a, b) => a.symbol.localeCompare(b.symbol));
  const counts: Record<Exchange, number> = { HOSE: 0, HNX: 0, UPCoM: 0 };
  for (const id of identities) counts[id.exchange] += 1;
  return { identities, counts, dropped };
}

export function lookupIdentity(symbol: string): SecurityIdentity | undefined {
  return UNIVERSE_BY_SYMBOL[symbol.trim().toUpperCase()];
}

export function genericOverview(id: SecurityIdentity): { en: string; vi: string } {
  if (id.sector === UNCLASSIFIED_SECTOR) {
    return {
      en: `${id.name} (${id.symbol}) is listed on ${id.exchange}. No curated sector is available.`,
      vi: `${id.nameVi} (${id.symbol}) niêm yết trên ${id.exchange}. Chưa có ngành trong bộ dữ liệu đã kiểm.`,
    };
  }
  return {
    en: `${id.name} is listed on ${id.exchange} in the ${id.sector} sector.`,
    vi: `${id.nameVi} niêm yết trên ${id.exchange}, ngành ${id.sector}.`,
  };
}
