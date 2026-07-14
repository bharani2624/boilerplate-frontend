"use client"

// Wraps the whole app in every context provider it needs. Why this file exists: these
// providers (react-query, MUI theme, Google OAuth) need to be client components, but
// app/layout.tsx is a server component by default — this is the boundary between them,
// so layout.tsx can stay simple and every page below automatically has all three.

import { ReactNode, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material"
import { GoogleOAuthProvider } from "@react-oauth/google"

const theme = createTheme({
  palette: { mode: "light", primary: { main: "#4f46e5" } },
})

export function AppProviders({ children }: { children: ReactNode }) {
  // useState (not a module-level constant) so the QueryClient is created once per
  // browser session, not shared across requests during server-side rendering.
  const [queryClient] = useState(() => new QueryClient())
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
