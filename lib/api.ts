// Shared axios client + JWT storage. Why this file exists: every component that talks
// to the backend imports `api` from here instead of creating its own axios instance —
// that's what guarantees the auth header and the 401-redirect behavior are applied
// consistently everywhere, with no component able to "forget" to attach the token.
import axios from "axios"

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const TOKEN_KEY = "access_token"

// localStorage (not an httpOnly cookie) because the backend and frontend are deployed
// on different Render services/domains — a same-site cookie wouldn't be sent
// cross-origin without extra SameSite=None/CORS-credentials plumbing. Trade-off: this
// token is readable by any JS on the page (XSS risk), acceptable for a hackathon
// boilerplate but worth revisiting before handling real user data long-term.
export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

export const api = axios.create({ baseURL: `${API_URL}/api` })

// Request interceptor: attaches the JWT to every outgoing request automatically, so
// individual API calls (see ItemsPanel.tsx) never need to set headers themselves.
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: centralizes what happens when the token is missing/expired —
// one 401 anywhere in the app clears the stale token and bounces to /login, instead of
// every page having to check for 401s itself.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearToken()
      if (typeof window !== "undefined") window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)
