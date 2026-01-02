"use client"

import { useState, KeyboardEvent } from "react"
import { Check, Plus, X, RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface TodoItem {
  id: number
  text: string
  completed: boolean
}

interface TodoListProps {
  title: string
  todos: TodoItem[]
  onAdd: (text: string) => Promise<void>
  onToggle: (id: number, completed: boolean) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onReset: () => Promise<void>
  loading?: boolean
}

export function TodoList({
  title,
  todos,
  onAdd,
  onToggle,
  onDelete,
  onReset,
  loading = false,
}: TodoListProps) {
  const [newTodoText, setNewTodoText] = useState("")
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    if (!newTodoText.trim()) return

    try {
      setAdding(true)
      await onAdd(newTodoText.trim())
      setNewTodoText("")
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'aggiunta")
    } finally {
      setAdding(false)
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd()
    }
  }

  const handleToggle = async (id: number, currentCompleted: boolean) => {
    try {
      await onToggle(id, !currentCompleted)
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'aggiornamento")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await onDelete(id)
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'eliminazione")
    }
  }

  const handleReset = async () => {
    try {
      await onReset()
      toast.success("Todo resettati con successo")
    } catch (error: any) {
      toast.error(error.message || "Errore durante il reset")
    }
  }

  const completedCount = todos.filter(t => t.completed).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {completedCount} / {todos.length}
            </span>
            <Button
              onClick={handleReset}
              size="sm"
              variant="ghost"
              disabled={loading || todos.length === 0}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new todo */}
        <div className="flex gap-2">
          <Input
            placeholder="Aggiungi un nuovo todo..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={adding || loading}
          />
          <Button
            onClick={handleAdd}
            size="sm"
            disabled={!newTodoText.trim() || adding || loading}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Todo list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {loading && todos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Caricamento...
            </p>
          ) : todos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessun todo. Aggiungine uno!
            </p>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors",
                  todo.completed && "opacity-60"
                )}
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => handleToggle(todo.id, todo.completed)}
                  disabled={loading}
                />
                <span
                  className={cn(
                    "flex-1 text-sm",
                    todo.completed && "line-through text-muted-foreground"
                  )}
                >
                  {todo.text}
                </span>
                <Button
                  onClick={() => handleDelete(todo.id)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  disabled={loading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
