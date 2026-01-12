import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckSquare, Clock, Calendar } from "lucide-react"
import { clientAuthAPI } from "@/lib/client-auth-api"
import { tasksAPI, type Task } from "@/lib/tasks-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

export default function ClientTasksPage() {
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      const clientResponse = await clientAuthAPI.getMe()
      const contactId = clientResponse.data.contact.id

      const response = await tasksAPI.getTasks({
        contactId,
        visibleToClient: true,
        limit: 100,
        isArchived: false,
      })
      setTasks(response.data.tasks || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Errore nel caricamento dei task')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'IN_PROGRESS':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'TODO':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P1':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'P2':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'P3':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length
  const totalCount = tasks.length
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <ClientLayout
      title="I Tuoi Task"
      description="Segui i progressi del tuo progetto"
    >
      <div className="px-4 lg:px-6 space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Riepilogo Task</CardTitle>
            <CardDescription>Progressi complessivi del progetto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completamento</span>
                <span className="font-medium">{completedCount} / {totalCount} task</span>
              </div>
              <Progress value={completionPercentage} />
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{completedCount}</div>
                  <div className="text-xs text-muted-foreground">Completati</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">
                    {tasks.filter(t => t.status === 'IN_PROGRESS').length}
                  </div>
                  <div className="text-xs text-muted-foreground">In Corso</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-500">
                    {tasks.filter(t => t.status === 'TODO').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Da Fare</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessun Task</h3>
                <p className="text-sm text-muted-foreground">
                  Non ci sono task assegnati al momento
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const overdue = task.status !== 'COMPLETED' && isOverdue(task.deadline)

              return (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {task.title}
                          {overdue && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                              In Ritardo
                            </Badge>
                          )}
                        </CardTitle>
                        {task.description && (
                          <CardDescription className="mt-2 whitespace-pre-wrap">
                            {task.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Scadenza</p>
                          <p className="font-medium">
                            {format(new Date(task.deadline), 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>
                      {task.estimatedHours && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Ore Stimate</p>
                            <p className="font-medium">{task.estimatedHours}h</p>
                          </div>
                        </div>
                      )}
                      {task.actualHours && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-muted-foreground">Ore Effettive</p>
                            <p className="font-medium">{task.actualHours}h</p>
                          </div>
                        </div>
                      )}
                      {task.assignedUser && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">Assegnato a</p>
                          <p className="font-medium">
                            {task.assignedUser.firstName} {task.assignedUser.lastName}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
