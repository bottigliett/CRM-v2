import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { clientAccessAPI, type ClientTask } from '@/lib/client-access-api'
import { toast } from 'sonner'
import { CheckCircle2, Circle, Plus, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface ClientTaskListProps {
  clientId: number
}

export function ClientTaskList({ clientId }: ClientTaskListProps) {
  const [tasks, setTasks] = useState<ClientTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [clientId])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const response = await clientAccessAPI.getTasks(clientId)
      if (response.success) {
        setTasks(response.data.tasks)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Errore nel caricamento dei task')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTask = async (taskId: number) => {
    try {
      const response = await clientAccessAPI.toggleTask(clientId, taskId)
      if (response.success) {
        setTasks(tasks.map(t => t.id === taskId ? response.data : t))
        toast.success('Task aggiornato')
      }
    } catch (error) {
      console.error('Error toggling task:', error)
      toast.error('Errore nell\'aggiornamento del task')
    }
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      toast.error('Il titolo è obbligatorio')
      return
    }

    try {
      setSubmitting(true)
      const response = await clientAccessAPI.createTask(clientId, {
        title: newTaskTitle,
        description: newTaskDescription || undefined,
      })
      if (response.success) {
        setTasks([...tasks, response.data])
        setShowAddDialog(false)
        setNewTaskTitle('')
        setNewTaskDescription('')
        toast.success('Task aggiunto')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Errore nella creazione del task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo task?')) return

    try {
      await clientAccessAPI.deleteTask(clientId, taskId)
      setTasks(tasks.filter(t => t.id !== taskId))
      toast.success('Task eliminato')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Errore nell\'eliminazione del task')
    }
  }

  const completedCount = tasks.filter(t => t.isCompleted).length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Avanzamento Progetto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Avanzamento Progetto
              </CardTitle>
              <CardDescription className="mt-1">
                {completedCount} di {totalCount} task completati
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Task
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completamento</span>
              <Badge variant={progress === 100 ? 'default' : 'secondary'}>
                {progress}%
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Task List */}
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Circle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessun task da mostrare</p>
              <p className="text-sm mt-1">Aggiungi un task per iniziare</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    task.isCompleted ? 'bg-muted/50' : 'hover:bg-muted/30'
                  }`}
                >
                  <Checkbox
                    id={`task-${task.id}`}
                    checked={task.isCompleted}
                    onCheckedChange={() => handleToggleTask(task.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`task-${task.id}`}
                      className={`cursor-pointer ${
                        task.isCompleted ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {task.title}
                    </Label>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                    {task.isCompleted && task.completedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Completato {format(new Date(task.completedAt), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                        {task.completedByUser && (
                          <span>
                            {' '}da {task.completedByUser.firstName} {task.completedByUser.lastName}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Task</DialogTitle>
            <DialogDescription>
              Crea un nuovo task per tracciare l'avanzamento del progetto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Titolo *</Label>
              <Input
                id="task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="es. Implementazione homepage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Descrizione (opzionale)</Label>
              <Textarea
                id="task-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Dettagli aggiuntivi sul task..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={submitting}>
              Annulla
            </Button>
            <Button onClick={handleAddTask} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Crea Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
