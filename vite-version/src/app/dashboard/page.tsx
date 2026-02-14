import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react"
import { eventsAPI, type Event } from "@/lib/events-api"
import { api, type User } from "@/lib/api"
import { format, addDays, endOfDay } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

export default function DashboardPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  // Load current user
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const user = await api.getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('Failed to load user:', error)
        toast.error('Errore nel caricamento dei dati utente')
      }
    }

    loadCurrentUser()
  }, [])

  // Load upcoming events for next 7 days
  useEffect(() => {
    async function loadUpcomingEvents() {
      try {
        setIsLoadingEvents(true)
        const now = new Date()
        const nextWeek = endOfDay(addDays(now, 7))

        const response = await eventsAPI.getEvents({
          startDate: format(now, 'yyyy-MM-dd HH:mm:ss'),
          endDate: format(nextWeek, 'yyyy-MM-dd'),
          limit: 100,
        })

        if (response.success) {
          const upcomingEventsFiltered = response.data.events
            .filter(event => new Date(event.endDateTime) >= now)
            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
            .slice(0, 5)

          setUpcomingEvents(upcomingEventsFiltered)
        }
      } catch (error) {
        console.error('Failed to load events:', error)
      } finally {
        setIsLoadingEvents(false)
      }
    }

    loadUpcomingEvents()
  }, [])

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Benvenuto, {currentUser?.firstName || currentUser?.username || 'Utente'}
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("it-IT", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Cat GIF */}
        <div className="flex justify-end">
          <div className="w-20 h-20">
            <img src="/cat_idle.gif" alt="" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Upcoming Events - Full Width */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Prossimi Eventi
                </CardTitle>
                <CardDescription>Agenda della settimana</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/calendar')}
              >
                Apri Agenda
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Caricamento...</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">Nessun evento in programma</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/calendar')}
                  >
                    <div
                      className="w-1 h-full rounded-full shrink-0"
                      style={{ backgroundColor: event.color || event.category?.color || '#3b82f6' }}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-sm">{event.title}</p>
                      {event.contact && (
                        <p className="text-xs text-muted-foreground">{event.contact.name}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(event.startDateTime), "dd MMM yyyy", { locale: it })}
                        </span>
                        {!event.isAllDay && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(event.startDateTime), "HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    {event.category && (
                      <Badge variant="outline" className="text-xs">
                        {event.category.name}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
