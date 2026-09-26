import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        title: "Catat Void / Refund Outlet",
      },
      {
        name: "description",
        content:
          "Buku register digital laporan void & refund outlet: form terstandar, bukti foto wajib, unduhan laporan HO.",
      },
      {
        name: "theme-color",
        content: "#faf6ee",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl p-4 pt-16">
      <h1 className="font-heading text-2xl font-semibold">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Halaman tidak ditemukan.
      </p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
        <script
          // PWA §5.1: register service worker segera setelah dokumen siap.
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js').catch(function() {}) })`,
          }}
        />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
