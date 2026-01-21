import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { clientProjectTasksAPI, type ClientProjectTask } from '@/lib/client-project-tasks-api'
import { CheckCircle2, Circle, Loader2, TrendingUp } from 'lucide-react'

export function ClientProjectProgress() {
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<{ id: number; quoteNumber: string; title: string } | null>(null)
  const [tasks, setTasks] = useState<ClientProjectTask[]>([])
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 })

  useEffect(() => {
    loadProjectTasks()
  }, [])

  const loadProjectTasks = async () => {
    try {
      setLoading(true)
      const response = await clientProjectTasksAPI.getProjectTasks()
      if (response.success) {
        setQuote(response.data.quote)
        setTasks(response.data.tasks)
        setProgress(response.data.progress)
      }
    } catch (error) {
      console.error('Error loading project tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
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

  if (!quote || tasks.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Avanzamento Progetto
            </CardTitle>
            <CardDescription className="mt-1">
              {quote.title}
            </CardDescription>
          </div>
          <Badge variant={progress.percentage === 100 ? 'default' : 'secondary'} className="text-lg px-3 py-1">
            {progress.percentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completamento</span>
            <span className="text-sm font-medium">
              {progress.completed} di {progress.total} completati
            </span>
          </div>
          <Progress value={progress.percentage} className="h-3" />
          {progress.percentage === 100 && (
            <p className="text-sm text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Progetto completato!
            </p>
          )}
        </div>

        {/* Task List */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Task del progetto:</h4>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  task.isCompleted ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-muted/30'
                }`}
              >
                <div className="mt-0.5">
                  {task.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      task.isCompleted ? 'text-green-700 dark:text-green-400' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {progress.percentage < 100 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Stiamo lavorando al tuo progetto! Ti aggiorneremo man mano che completiamo le varie fasi.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
