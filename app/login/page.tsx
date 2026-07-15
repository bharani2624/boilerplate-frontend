"use client"

// Google sign-in → POST /api/auth/google → store JWT → /dashboard (checkout).

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
          Promo Engine
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sign in to shop and apply promo codes
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
