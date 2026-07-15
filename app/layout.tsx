// Root layout — AppProviders (react-query, MUI, Google OAuth) for every page.
import { ReactNode } from "react"
import { Metadata } from "next"
import { AppProviders } from "@components/AppProviders"

export const metadata: Metadata = {
  title: "Promo Engine",
  description: "Checkout with promo codes — percent off, fixed off, min spend, expiry",
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
