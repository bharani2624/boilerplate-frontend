"use client"

// Demo CRUD UI for the backend's `items` resource. Why this file exists: it's the
// reference implementation of the "component talks to backend via react-query"
// pattern (see AGENTS.md) — copy its shape for new resources, delete it once you no
// longer need the /api/items example.

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import { api } from "@lib/api"

type Item = {
  id: string
  title: string
  description: string | null
}

export function ItemsPanel() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  // useQuery: read path. queryKey ["items"] is what invalidateQueries below targets to
  // trigger a refetch after a mutation — get this key wrong and the list silently goes stale.
  const { data, isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: async () => (await api.get("/items")).data.data as Item[],
  })

  // useMutation: write path. onSuccess resets the form and invalidates ["items"] so the
  // list re-fetches and shows the new row — the mutation itself never touches local state.
  const createItem = useMutation({
    mutationFn: async () => api.post("/items", { title, description: description || null }),
    onSuccess: () => {
      setTitle("")
      setDescription("")
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })

  const deleteItem = useMutation({
    mutationFn: async (id: string) => api.delete(`/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["items"] }),
  })

  return (
    <Box sx={{ maxWidth: 480 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Items
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        <TextField
          size="small"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          size="small"
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button
          variant="contained"
          disabled={!title || createItem.isPending}
          onClick={() => createItem.mutate()}
        >
          Add
        </Button>
      </Box>

      {isLoading ? (
        <Typography>Loading…</Typography>
      ) : (
        <List>
          {(data ?? []).map((item) => (
            <ListItem
              key={item.id}
              secondaryAction={
                <IconButton edge="end" onClick={() => deleteItem.mutate(item.id)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={item.title} secondary={item.description} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )
}
