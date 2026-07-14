"use client"

// The main authenticated page. Why it's here: it's the template for every protected
// page you add — the token-check guard at the top and the `enabled: checked` on the
// /auth/me query are the two things every new protected page needs to copy.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Box, Button, Typography } from "@mui/material"
import { api, clearToken, getToken } from "@lib/api"
import { ItemsPanel } from "@components/ItemsPanel"

export default function DashboardPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  // Client-side route guard: redirect to /login if there's no token at all. This is a
  // UX convenience, not the real security boundary — the backend re-checks the JWT on
  // every request regardless (see get_current_user), so this guard alone can't be
  // bypassed to actually read another user's data.
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login")
    } else {
      setChecked(true)
    }
  }, [router])

  // enabled: checked — don't fire this request until we've confirmed a token exists,
  // otherwise it would 401 on first render for a logged-out visitor before the redirect runs.
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
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h5">Welcome{user ? `, ${user.name || user.email}` : ""}</Typography>
        <Button variant="outlined" onClick={logout}>
          Log out
        </Button>
      </Box>
      <ItemsPanel />
    </Box>
  )
}
