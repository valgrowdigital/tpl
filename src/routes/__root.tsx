import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { usePrefetchCricketData } from "@/hooks/useCricketData";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F5] px-4 py-8">
      <div className="max-w-md w-full text-center bg-white border border-[#E5E5E5] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="h-12 w-12 mx-auto rounded-full bg-[#D9A928]/15 text-[#9A6A05] flex items-center justify-center mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-black tracking-tight text-[#111111] uppercase">
          This page didn't load
        </h1>
        <p className="mt-2 text-xs text-[#5F6368] font-medium leading-relaxed">
          Something went wrong loading this view. You can try refreshing or head back to the tournament home.
        </p>

        {error?.message && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-left">
            <p className="text-[11px] font-mono font-bold text-red-700 break-words">
              {error.message}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="tap w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#D9A928] px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition-all shadow-md"
          >
            Try again
          </button>
          <a
            href="/"
            className="tap w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F7F7F5] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#111111] transition-all hover:bg-white"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TPL 2026 · Cricket Live Scoring" },
      { name: "description", content: "Live cricket scoring application for TPL 2026 — score matches ball by ball." },
      { name: "author", content: "TPL" },
      { property: "og:title", content: "TPL 2026 · Cricket Live Scoring" },
      { property: "og:description", content: "Live cricket scoring for TPL 2026" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  usePrefetchCricketData();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
