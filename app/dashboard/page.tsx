"use client"

// Authenticated checkout page: products, cart, promo codes.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Box, Button, Typography } from "@mui/material"
import { api, clearToken, getToken } from "@lib/api"
import { ShopPanel } from "@components/ShopPanel"

export default function DashboardPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login")
    } else {
      setChecked(true)
    }
  }, [router])

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data.data,
    enabled: checked,
  })

  if (!checked) return null

  function logout() {
    clearToken()
    router.replace("/login")
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 960, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Checkout
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user ? user.name || user.email : "…"}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={logout}>
          Log out
        </Button>
      </Box>
      <ShopPanel />
    </Box>
  )
}
