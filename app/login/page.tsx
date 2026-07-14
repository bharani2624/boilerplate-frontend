"use client"

// The only place Google's SDK is invoked. Why it's here: @react-oauth/google's
// GoogleLogin component gets the id token directly from Google in the browser (no
// backend round trip needed to obtain it) — this page's only job is to hand that
// token to POST /api/auth/google and store whatever JWT comes back.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GoogleLogin, CredentialResponse } from "@react-oauth/google"
import { Box, Paper, Typography, Alert } from "@mui/material"
import { api, setToken } from "@lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSuccess(credential: CredentialResponse) {
    if (!credential.credential) return
    try {
      // credential.credential is Google's id_token — exchanged once here for our own
      // session token; after this, the app never talks to Google again for this session.
      const res = await api.post("/auth/google", { id_token: credential.credential })
      setToken(res.data.data.access_token)
      router.replace("/dashboard")
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Login failed")
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        bgcolor: "grey.100",
      }}
    >
      <Paper sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2, minWidth: 320 }}>
        <Typography variant="h5" fontWeight={700}>
          Sign in
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError("Google login failed")}
        />
      </Paper>
    </Box>
  )
}
