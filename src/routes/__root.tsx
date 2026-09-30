import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ThemeProvider } from "@/lib/theme";
import { LocaleProvider } from "@/lib/i18n/provider";
import { THEME_BOOTSTRAP } from "@/lib/theme-script";
import { LOCALE_BOOTSTRAP } from "@/lib/i18n/locale";
import { useI18n } from "@/lib/i18n/provider";
import { AppErrorComponent } from "@/lib/error-component";
import appCss from "../styles.css?url";

const APP_NAME = "VNEdge";
const SITE_URL = "https://vnstockmarket.vercel.app";
const SITE_DESCRIPTION =
  "VNEdge — Toàn cảnh thị trường chứng khoán Việt Nam với dữ liệu, bộ lọc, biểu đồ và phân tích rõ ràng.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "VNEdge — Thị trường chứng khoán Việt Nam" },
      { name: "application-name", content: APP_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "theme-color", content: "#0CCF96" },
      { name: "color-scheme", content: "dark light" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "msapplication-TileColor", content: "#061614" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:title", content: "VNEdge — Thị trường chứng khoán Việt Nam" },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: `${SITE_URL}/og-image.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:locale", content: "vi_VN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "VNEdge — Thị trường chứng khoán Việt Nam" },
      { name: "twitter:description", content: SITE_DESCRIPTION },
      { name: "twitter:image", content: `${SITE_URL}/og-image.png` },
    ],
    links: [
      { rel: "canonical", href: SITE_URL },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  errorComponent: AppErrorComponent,
  notFoundComponent: NotFoundPage,
  component: RootDocument,
});

function NotFoundPage() {
  return (
    <LocaleProvider>
      <NotFoundInner />
    </LocaleProvider>
  );
}

function NotFoundInner() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-[11px] uppercase tracking-[0.16em] text-fg-subtle">404</p>
      <h1 className="text-xl font-medium">{t("notFound.title")}</h1>
      <p className="max-w-md text-sm text-fg-muted">{t("notFound.body")}</p>
      <a href="/" className="text-sm text-accent hover:underline">
        {t("notFound.back")}
      </a>
    </main>
  );
}

function RootDocument() {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOTSTRAP }} />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
        <AuthProvider>
          <ThemeProvider>
            <LocaleProvider>
              <Outlet />
            </LocaleProvider>
          </ThemeProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
