"use client"

// The "/" route. Why it's here: it's not a real page, just a traffic router — it checks
// whether a JWT is already stored and sends the browser straight to /dashboard or
// /login, so users never see a blank home page.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@lib/api"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace(getToken() ? "/dashboard" : "/login")
  }, [router])

  return null
}
