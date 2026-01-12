import * as React from "react"
import { ClientLayout } from "@/components/layouts/client-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, MapPin, Clock, Video } from "lucide-react"
import { clientAuthAPI } from "@/lib/client-auth-api"
import { eventsAPI, type Event } from "@/lib/events-api"
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function ClientCalendarPage() {
  const [events, setEvents] = React.useState<Event[]>([])
  const [loading, setLoading] = React.useState(true)
  const [currentDate, setCurrentDate] = React.useState(new Date())

  React.useEffect(() => {
    loadEvents()
  }, [currentDate])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const clientResponse = await clientAuthAPI.getMe()
      const contactId = clientResponse.data.contact.id

      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)

      const response = await eventsAPI.getEvents({
        contactId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: 100,
      })
      setEvents(response.data.events || [])
    } catch (error) {
      console.error('Error loading events:', error)
      toast.error('Errore nel caricamento degli eventi')
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const upcomingEvents = events
    .filter(e => new Date(e.startDateTime) >= new Date())
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    .slice(0, 10)

  const pastEvents = events
    .filter(e => new Date(e.startDateTime) < new Date())
    .sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime())
    .slice(0, 5)

  return (
    <ClientLayout
      title="La Tua Agenda"
      description="Visualizza i tuoi prossimi appuntamenti"
    >
      <div className="px-4 lg:px-6 space-y-6">
        {/* Month Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {format(currentDate, 'MMMM yyyy', { locale: it })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Oggi
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {events.length} eventi in questo mese
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Prossimi Eventi</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Caricamento...</p>
            </div>
          ) : upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessun Evento</h3>
                  <p className="text-sm text-muted-foreground">
                    Non ci sono eventi in programma per questo mese
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="flex flex-col items-center justify-center min-w-[60px] p-3 rounded-lg bg-primary/10 text-primary">
                          <span className="text-xs font-medium uppercase">
                            {format(new Date(event.startDateTime), 'MMM', { locale: it })}
                          </span>
                          <span className="text-2xl font-bold">
                            {format(new Date(event.startDateTime), 'd')}
                          </span>
                          <span className="text-xs">
                            {format(new Date(event.startDateTime), 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          {event.description && (
                            <CardDescription className="mt-1">
                              {event.description}
                            </CardDescription>
                          )}
                          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.startDateTime), 'HH:mm', { locale: it })} -{' '}
                              {format(new Date(event.endDateTime), 'HH:mm', { locale: it })}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {event.category && (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: event.category.color,
                            color: event.category.color,
                            backgroundColor: `${event.category.color}10`,
                          }}
                        >
                          {event.category.name}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  {event.notes && (
                    <CardContent>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {event.notes}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Eventi Passati</h2>
            <div className="space-y-3">
              {pastEvents.map((event) => (
                <Card key={event.id} className="opacity-75">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground min-w-[80px]">
                          {format(new Date(event.startDateTime), 'dd MMM yyyy', { locale: it })}
                        </div>
                        <div>
                          <CardTitle className="text-base">{event.title}</CardTitle>
                          {event.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  )
}
