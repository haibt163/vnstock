import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { UNIVERSE, UNIVERSE_SOURCE, VN30_SOURCE } from "@/lib/market/universe";
import { useI18n } from "@/lib/i18n/provider";
import type { DataAttribution } from "@/lib/market/types";

export const Route = createFileRoute("/methodology")({
  component: MethodologyPage,
  head: () => ({ meta: [{ title: "VNStock · Phương pháp" }] }),
});

const DOCS_ATTR: DataAttribution = {
  mode: "live",
  sourceId: "vps",
  sourceLabel: "Documentation",
  freshness: "MARKET_CLOSED",
  asOfIso: "2026-09-15T00:00:00.000Z",
  asOfIct: "see page",
  session: "closed",
  caveats: [],
};

function MethodologyPage() {
  const { locale } = useI18n();
  return (
    <AppShell attribution={DOCS_ATTR}>
      {locale === "vi" ? <ViBody /> : <EnBody />}
    </AppShell>
  );
}

function ViBody() {
  const hose = UNIVERSE.filter((s) => s.group === "hose_liquid").length;
  const hnx = UNIVERSE.filter((s) => s.group === "hnx_mcap").length;
  const upcom = UNIVERSE.filter((s) => s.group === "upcom_mcap").length;
  const vn30 = UNIVERSE.filter((s) => s.vn30).length;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">Về dữ liệu</p>
        <h1 className="text-2xl font-medium tracking-tight">Phương pháp</h1>
        <p className="mt-2 text-sm text-fg-muted">
          VNStock là công cụ sàng lọc phân tích, không phải sở giao dịch, công ty chứng khoán hay tư vấn đầu tư.
          Không nội dung nào ở đây là khuyến nghị mua hoặc bán chứng khoán.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Nguồn giá trực tuyến</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Nguồn chính: <strong>bảng giá công khai của Chứng khoán VPS</strong> (
          <code className="text-fg">bgapidatafeed.vps.com.vn</code>). Đây là bảng của một CTCK được cấp phép, không
          phải feed chính thức của HOSE/HNX. Quyền sử dụng cho ứng dụng bên thứ ba không rõ ràng — chúng tôi ghi rõ
          nguồn trên giao diện và giữ chế độ minh họa khi bảng không lấy được.
        </p>
        <p className="text-sm leading-relaxed text-fg-muted">
          Nguồn dự phòng hợp lệ: Yahoo Finance biểu đồ <code className="text-fg">*.VN</code> (giá đã là đồng, thường
          trễ). Khi Yahoo phục vụ báo giá, huy hiệu hiển thị <strong>TRỄ</strong>, không phải LIVE, kèm lý do VPS bị bỏ
          qua (hết thời gian / giới hạn tần suất / HTTP / schema / không có giá khớp). Lịch sử giá có thể lấy Yahoo độc
          lập với báo giá. Chỉ số Yahoo chỉ xác nhận được <code className="text-fg">^VNINDEX.VN</code>; VN30/HNX/UPCoM
          trên Yahoo trả 404.
        </p>
        <p className="text-sm leading-relaxed text-fg-muted">
          Dữ liệu minh họa (DEMO) chỉ xuất hiện khi <em>cả hai</em> nguồn giá đều thất bại. Client không bao giờ thay
          một snapshot LIVE bằng số giả khi làm mới.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Định giá / cơ bản</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Ảnh chụp EOD (P/E, P/B, ROE, EPS, sổ sách, CP lưu hành, cổ tức, tăng trưởng) lấy từ API công khai Simplize{" "}
          <code className="text-fg">/api/company/summary</code>. Đây không phải feed chính thức của sở; quyền sử dụng
          cho app bên thứ ba không rõ — overlay được gắn nhãn EOD, không bao giờ là huy hiệu LIVE.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>Vốn hóa = giá live × số CP lưu hành (tính toán)</li>
          <li>P/E = giá live / EPS (tính toán)</li>
          <li>P/B = giá live / giá trị sổ sách (tính toán)</li>
          <li>ROE, tỷ suất cổ tức, EPS, sổ sách, tăng trưởng DT/LN: nguồn EOD</li>
          <li>Cao/thấp 52 tuần: tính từ chuỗi giá đang hiển thị</li>
          <li>Nợ/vốn chủ sở hữu: không có từ nguồn hiện tại → hiển thị —</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Vũ trụ & VN30</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Vũ trụ mục tiêu: {vn30} mã VN30 + {hose} HOSE thanh khoản + {hnx} HNX theo vốn hóa + {upcom} UPCoM theo vốn
          hóa = {UNIVERSE.length} mã duy nhất. Một mã chỉ được giữ nếu bảng giá live trả last print. Không bịa dòng.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>
            VN30: {VN30_SOURCE.name}, ngày {VN30_SOURCE.asOf}. {VN30_SOURCE.note}
          </li>
          <li>
            HOSE ngoài VN30: {UNIVERSE_SOURCE.hoseMcap.name}, {UNIVERSE_SOURCE.hoseMcap.asOf}
          </li>
          <li>
            HNX: {UNIVERSE_SOURCE.hnxMcap.name}, {UNIVERSE_SOURCE.hnxMcap.asOf}
          </li>
          <li>
            UPCoM: {UNIVERSE_SOURCE.upcomMcap.name}, {UNIVERSE_SOURCE.upcomMcap.asOf} (VGI, ACV, MVN)
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Báo giá / tính toán / nguồn</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>Giá, tham chiếu, khối lượng, trần/sàn, chỉ số: báo giá</li>
          <li>Thay đổi và %: last trừ tham chiếu; gần 0 được làm tròn 0,00%</li>
          <li>Độ rộng HOSE/HNX/UPCoM/VN30: từ snapshot chỉ số VPS khi có</li>
          <li>Độ rộng vũ trụ và trung bình ngành: chỉ từ các mã lấy được, và được ghi rõ</li>
          <li>MA, RSI, MACD, hỗ trợ/kháng cự: tính từ nến trên trang</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Đơn vị & định dạng số</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Tiếng Việt dùng dấu chấm hàng nghìn và dấu phẩy thập phân. Cùng một đại lượng luôn cùng một dạng trên mọi
          trang (bảng lọc, chi tiết mã, toàn cảnh, dashboard, tooltip).
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>Đơn vị nằm ở tiêu đề / nhãn; ô chỉ còn số gọn. Không lặp “triệu CP”, “nghìn tỷ”, “đồng” trên mỗi dòng.</li>
          <li>Giá (VND): 59.200 · tick lẻ 21,25</li>
          <li>Khối lượng (CP): 637.840 · 1.010.800 — số cổ phiếu, không đổi đơn vị trong ô</li>
          <li>Giá trị GD / vốn hóa (tỷ VND): 37,76 · 499.670 — luôn chia 1e9, cùng thang trên mọi trang</li>
          <li>P/E (x), P/B (x): 11,9 · 1,99. ROE / cổ tức (%): 18,03%</li>
          <li>English: 59,200 · 637,840 · 37.76 · 499,670 — grouping, không trộn hậu tố M/B/T</li>
        </ul>
        <p className="text-sm leading-relaxed text-fg-muted">
          Tiêu đề bảng lọc hẹp trên mobile dùng dạng ngắn (KL (CP), Vốn hóa (tỷ)) kèm tooltip đủ nghĩa.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">SSI FastConnect</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          FastConnect Data là API chính thức của CTCK (Consumer ID / Secret), chủ yếu EOD. Client token đã được cài
          sẵn nhưng không dùng cho báo giá trong bản này nếu không có khóa. App không nhận là FastConnect khi không
          cấu hình.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Phiên giao dịch</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Pha phiên tính theo Asia/Ho_Chi_Minh: ATO 08:45–09:00, liên tục 09:00–11:30, nghỉ trưa 11:30–13:00, liên tục
          13:00–14:30, ATC 14:30–14:45, thỏa thuận đến 15:00, còn lại đóng cửa.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Ngôn ngữ</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Tiếng Việt là mặc định, kể cả khi trình duyệt đang English. Tùy chọn được lưu tại{" "}
          <code className="text-fg">vnstock-locale</code>.
        </p>
      </section>
    </div>
  );
}

function EnBody() {
  const hose = UNIVERSE.filter((s) => s.group === "hose_liquid").length;
  const hnx = UNIVERSE.filter((s) => s.group === "hnx_mcap").length;
  const upcom = UNIVERSE.filter((s) => s.group === "upcom_mcap").length;
  const vn30 = UNIVERSE.filter((s) => s.vn30).length;
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">About the data</p>
        <h1 className="text-2xl font-medium tracking-tight">Methodology</h1>
        <p className="mt-2 text-sm text-fg-muted">
          VNStock is an analytical screening tool, not an exchange, broker or investment advisor. Nothing here is a
          recommendation to buy or sell securities.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Live quote sources</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Primary: the <strong>VPS Securities public price board</strong> (
          <code className="text-fg">bgapidatafeed.vps.com.vn</code>). That is a licensed Vietnamese broker’s public
          board, not HOSE, HNX or an official exchange feed. Access is undocumented for third-party products; we treat
          that as a terms risk, label the source in the chrome, and keep a demo fallback.
        </p>
        <p className="text-sm leading-relaxed text-fg-muted">
          Legitimate delayed fallback: Yahoo Finance <code className="text-fg">*.VN</code> chart (prices already in
          dong). When Yahoo serves quotes the badge reads <strong>DELAYED</strong>, never LIVE, and the status bar
          shows why VPS was skipped (timeout / rate limited / HTTP / invalid schema / no usable quote). Price history
          may use Yahoo independently of the quote source. Only{" "}
          <code className="text-fg">^VNINDEX.VN</code> is a working Yahoo index; VN30/HNX/UPCoM Yahoo indices 404.
        </p>
        <p className="text-sm leading-relaxed text-fg-muted">
          DEMO appears only after <em>both</em> quote sources fail. Client polls never replace a live snapshot with
          simulated numbers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Fundamentals / valuation</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          EOD snapshot ratios come from the public Simplize <code className="text-fg">/api/company/summary</code> JSON.
          That is not an official exchange fundamental feed; usage rights for third-party apps are unclear. The overlay
          is labelled EOD and never carries a LIVE badge.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>Market cap = live price × shares outstanding (derived)</li>
          <li>P/E = live price / EPS (derived)</li>
          <li>P/B = live price / book value per share (derived)</li>
          <li>ROE, dividend yield, EPS, book, revenue/profit growth: source EOD</li>
          <li>52-week high/low: derived from the displayed history series</li>
          <li>Debt/equity: omitted (—) — not in the current overlay</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Universe & VN30</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Target structure: {vn30} VN30 + {hose} liquid HOSE + {hnx} HNX by market cap + {upcom} UPCoM by market cap ={" "}
          {UNIVERSE.length} unique names. A symbol is kept only if the live board returns a last print. No fabricated
          rows.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>
            VN30: {VN30_SOURCE.name}, dated {VN30_SOURCE.asOf}. {VN30_SOURCE.note}
          </li>
          <li>
            HOSE extras: {UNIVERSE_SOURCE.hoseMcap.name}, {UNIVERSE_SOURCE.hoseMcap.asOf}
          </li>
          <li>
            HNX: {UNIVERSE_SOURCE.hnxMcap.name}, {UNIVERSE_SOURCE.hnxMcap.asOf}
          </li>
          <li>
            UPCoM: {UNIVERSE_SOURCE.upcomMcap.name}, {UNIVERSE_SOURCE.upcomMcap.asOf} (VGI, ACV, MVN)
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Quoted vs derived vs source</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>Last, reference, volume, ceiling/floor, index levels: quoted</li>
          <li>Change and change %: last minus reference, with near-zero snaps to 0.00%</li>
          <li>HOSE/HNX/UPCoM/VN30 breadth: parsed from the VPS index snapshot when present</li>
          <li>Universe breadth and sector averages: derived only from retrieved names, and labelled as such</li>
          <li>MA, RSI, MACD, support/resistance: derived from the displayed price series only</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Units & number format</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Vietnamese uses a dot as the thousands separator and a comma as the decimal mark. The same metric uses the
          same form on every page (screener, stock, overview, dashboard, tooltips).
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-fg-muted">
          <li>Units live in the header or label; cells stay compact numeric. No “triệu CP”, “nghìn tỷ”, or “đồng” repeated per row.</li>
          <li>Price (VND): 59.200 · odd ticks 21,25</li>
          <li>Volume (shares): 637.840 · 1.010.800 — share count, same scale in every cell</li>
          <li>Turnover / market cap (VND bn): 37,76 · 499.670 — always value / 1e9, same scale on every page</li>
          <li>P/E (x), P/B (x): 11,9 · 1,99. ROE / yield (%): 18,03%</li>
          <li>English grouping: 59,200 · 637,840 · 37.76 · 499,670 — no mixed M/B/T suffixes</li>
        </ul>
        <p className="text-sm leading-relaxed text-fg-muted">
          Narrow screener headers on mobile use a short form (Vol (shares), Mkt cap (VND bn)) with a full tooltip / aria-label.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">SSI FastConnect</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          FastConnect Data is the documented broker API (Consumer ID / Secret), EOD-oriented. A token client exists;
          this build does not claim FastConnect affiliation and does not call it without keys.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Sessions</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Session phase is computed in Asia/Ho_Chi_Minh: ATO 08:45–09:00, continuous 09:00–11:30, lunch 11:30–13:00,
          continuous 13:00–14:30, ATC 14:30–14:45, put-through until 15:00, otherwise closed.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Language</h2>
        <p className="text-sm leading-relaxed text-fg-muted">
          Vietnamese is the default, even if the browser is English. The choice persists in{" "}
          <code className="text-fg">vnstock-locale</code>.
        </p>
      </section>
    </div>
  );
}
