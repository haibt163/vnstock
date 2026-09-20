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

const APP_NAME = "VNStock";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Bộ lọc chứng khoán Việt Nam — bảng giá công khai, dữ liệu minh họa dự phòng.",
      },
      { name: "theme-color", content: "#070a11" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
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
