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
 * A symbol is kept only if the live board returns a last print. No fabricated rows.
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

export function lookupIdentity(symbol: string): SecurityIdentity | undefined {
  return UNIVERSE_BY_SYMBOL[symbol.trim().toUpperCase()];
}

export function genericOverview(id: SecurityIdentity): { en: string; vi: string } {
  return {
    en: `${id.name} is listed on ${id.exchange} in the ${id.sector} sector.`,
    vi: `${id.nameVi} niêm yết trên ${id.exchange}, ngành ${id.sector}.`,
  };
}
