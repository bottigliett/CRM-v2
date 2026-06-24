"use client"

import { useEffect, useState, KeyboardEvent } from "react"
import { Plus, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { onDutyAPI, type TaskPhase } from "@/lib/on-duty-api"

interface TaskPhasesProps {
  taskId: number | null
}

export function TaskPhases({ taskId }: TaskPhasesProps) {
  const [phases, setPhases] = useState<TaskPhase[]>([])
  const [newPhaseText, setNewPhaseText] = useState("")
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (taskId) {
      loadPhases()
    } else {
      setPhases([])
    }
  }, [taskId])

  const loadPhases = async () => {
    if (!taskId) return

    try {
      setLoading(true)
      const response = await onDutyAPI.getTaskPhases(taskId)
      if (response.success) {
        setPhases(response.data)
      }
    } catch (error) {
      console.error("Errore nel caricamento fasi:", error)
      toast.error("Errore nel caricamento delle fasi")
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newPhaseText.trim() || !taskId) return

    try {
      setAdding(true)
      const response = await onDutyAPI.createTaskPhase(taskId, {
        text: newPhaseText.trim(),
      })
      if (response.success) {
        setPhases([...phases, response.data])
        setNewPhaseText("")
        toast.success("Fase aggiunta")
      }
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
      const response = await onDutyAPI.updateTaskPhase(id, {
        completed: !currentCompleted,
      })
      if (response.success) {
        setPhases(phases.map(p =>
          p.id === id ? { ...p, completed: !currentCompleted, completedAt: !currentCompleted ? new Date().toISOString() : undefined } : p
        ))
      }
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'aggiornamento")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await onDutyAPI.deleteTaskPhase(id)
      setPhases(phases.filter(p => p.id !== id))
      toast.success("Fase eliminata")
    } catch (error: any) {
      toast.error(error.message || "Errore durante l'eliminazione")
    }
  }

  if (!taskId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Fasi di Lavoro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Seleziona un task per gestire le fasi di lavoro
          </p>
        </CardContent>
      </Card>
    )
  }

  const completedCount = phases.filter(p => p.completed).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Fasi di Lavoro</CardTitle>
          <span className="text-xs text-muted-foreground">
            {completedCount} / {phases.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new phase */}
        <div className="flex gap-2">
          <Input
            placeholder="Aggiungi una fase di lavoro..."
            value={newPhaseText}
            onChange={(e) => setNewPhaseText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={adding || loading}
          />
          <Button
            onClick={handleAdd}
            size="sm"
            disabled={!newPhaseText.trim() || adding || loading}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Phases list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {loading && phases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Caricamento...
            </p>
          ) : phases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna fase. Suddividi il task in fasi di lavoro!
            </p>
          ) : (
            phases.map((phase) => (
              <div
                key={phase.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors",
                  phase.completed && "opacity-60"
                )}
              >
                <Checkbox
                  checked={phase.completed}
                  onCheckedChange={() => handleToggle(phase.id, phase.completed)}
                  disabled={loading}
                />
                <span
                  className={cn(
                    "flex-1 text-sm",
                    phase.completed && "line-through text-muted-foreground"
                  )}
                >
                  {phase.text}
                </span>
                <Button
                  onClick={() => handleDelete(phase.id)}
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
