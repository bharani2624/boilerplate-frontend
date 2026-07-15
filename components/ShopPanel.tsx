"use client"

// Shopper UI for the promo engine: product catalog, cart, apply promo code.
// Pattern matches AGENTS.md — React Query + shared api client, invalidate on write.

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import RemoveIcon from "@mui/icons-material/Remove"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import { api } from "@lib/api"

type Product = {
  product_id: string
  name: string
  unit_price: string
}

type CartItem = {
  product_id: string
  name: string
  unit_price: string
  qty: number
  line_total: string
}

type Evaluation = {
  ok: boolean
  code: string | null
  cart_total: string
  discount: string
  final_total: string
  reason: string | null
}

type Cart = {
  items: CartItem[]
  applied_code: string | null
  cart_total: string
  evaluation: Evaluation | null
}

export function ShopPanel() {
  const queryClient = useQueryClient()
  const [code, setCode] = useState("")
  const [applyResult, setApplyResult] = useState<Evaluation | null>(null)

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products")).data.data as Product[],
  })

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => (await api.get("/cart")).data.data as Cart,
  })

  const invalidateCart = () => queryClient.invalidateQueries({ queryKey: ["cart"] })

  const setQty = useMutation({
    mutationFn: async ({ product_id, qty }: { product_id: string; qty: number }) => {
      if (qty <= 0) {
        await api.delete(`/cart/items/${product_id}`)
      } else {
        await api.post("/cart/items", { product_id, qty })
      }
    },
    onSuccess: () => {
      setApplyResult(null)
      invalidateCart()
    },
  })

  const applyCode = useMutation({
    mutationFn: async (promoCode: string) => {
      const res = await api.post("/cart/apply-code", { code: promoCode })
      return res.data.data as Evaluation
    },
    onSuccess: (result) => {
      setApplyResult(result)
      if (result.ok) {
        setCode("")
        invalidateCart()
      }
    },
  })

  const clearCode = useMutation({
    mutationFn: async () => api.delete("/cart/apply-code"),
    onSuccess: () => {
      setApplyResult(null)
      invalidateCart()
    },
  })

  const cartByProduct = new Map((cart?.items ?? []).map((i) => [i.product_id, i]))
  const evaluation = applyResult ?? cart?.evaluation
  const subtotal = cart?.cart_total ?? "0.00"
  const discount = evaluation?.ok ? evaluation.discount : "0.00"
  const finalTotal = evaluation?.ok ? evaluation.final_total : subtotal
  const rejectReason =
    applyResult && !applyResult.ok
      ? applyResult.reason
      : evaluation && !evaluation.ok
        ? evaluation.reason
        : null

  function qtyInCart(productId: string): number {
    return cartByProduct.get(productId)?.qty ?? 0
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 3,
        alignItems: "start",
      }}
    >
      {/* Products */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Products
          </Typography>
          {productsLoading ? (
            <Typography color="text.secondary">Loading products…</Typography>
          ) : (
            <Stack spacing={1.5}>
              {(products ?? []).map((p) => {
                const qty = qtyInCart(p.product_id)
                return (
                  <Box
                    key={p.product_id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                      py: 0.5,
                    }}
                  >
                    <Box>
                      <Typography fontWeight={600}>{p.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        ${p.unit_price}
                      </Typography>
                    </Box>
                    {qty === 0 ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={setQty.isPending}
                        onClick={() => setQty.mutate({ product_id: p.product_id, qty: 1 })}
                      >
                        Add
                      </Button>
                    ) : (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <IconButton
                          size="small"
                          disabled={setQty.isPending}
                          onClick={() =>
                            setQty.mutate({ product_id: p.product_id, qty: qty - 1 })
                          }
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ minWidth: 24, textAlign: "center" }}>{qty}</Typography>
                        <IconButton
                          size="small"
                          disabled={setQty.isPending}
                          onClick={() =>
                            setQty.mutate({ product_id: p.product_id, qty: qty + 1 })
                          }
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    )}
                  </Box>
                )
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Cart + promo */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Cart
          </Typography>

          {cartLoading ? (
            <Typography color="text.secondary">Loading cart…</Typography>
          ) : !(cart?.items?.length) ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Cart is empty — add a product to get started.
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {cart.items.map((item) => (
                <Box
                  key={item.product_id}
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Box>
                    <Typography>
                      {item.name} × {item.qty}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${item.unit_price} each
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontWeight={600}>${item.line_total}</Typography>
                    <IconButton
                      size="small"
                      aria-label={`Remove ${item.name}`}
                      disabled={setQty.isPending}
                      onClick={() => setQty.mutate({ product_id: item.product_id, qty: 0 })}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Promo code
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. SAVE10"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.trim()) applyCode.mutate(code.trim())
              }}
              disabled={applyCode.isPending}
            />
            <Button
              variant="contained"
              disabled={!code.trim() || applyCode.isPending}
              onClick={() => applyCode.mutate(code.trim())}
            >
              Apply
            </Button>
          </Stack>

          {rejectReason && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              {rejectReason}
            </Alert>
          )}

          {cart?.applied_code && evaluation?.ok && (
            <Alert
              severity="success"
              sx={{ mb: 1.5 }}
              action={
                <Button color="inherit" size="small" onClick={() => clearCode.mutate()}>
                  Remove
                </Button>
              }
            >
              Applied <strong>{cart.applied_code}</strong>
              {evaluation.discount ? ` (−$${evaluation.discount})` : ""}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <Row label="Subtotal" value={`$${subtotal}`} />
            <Row label="Discount" value={evaluation?.ok ? `−$${discount}` : "$0.00"} />
            <Divider sx={{ my: 1 }} />
            <Row label="Total" value={`$${finalTotal}`} bold />
          </Box>

          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            Try: SAVE10 (10% off) · FIVEOFF ($5 off over $50) · EXPIRED · BIGSPEND (needs $200)
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
      <Typography fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography fontWeight={bold ? 700 : 400}>{value}</Typography>
    </Box>
  )
}
