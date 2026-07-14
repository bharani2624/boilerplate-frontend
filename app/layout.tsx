// Root layout — the one file every page in app/ is rendered inside of. Why it's here:
// Next.js App Router requires a root layout; this is also where AppProviders (react
// query, MUI theme, Google OAuth) gets mounted once for the whole app, rather than
// each page having to wrap itself.
import { ReactNode } from "react"
import { Metadata } from "next"
import { AppProviders } from "@components/AppProviders"

export const metadata: Metadata = {
  title: "Boilerplate",
  description: "Next.js + FastAPI + Supabase boilerplate",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
