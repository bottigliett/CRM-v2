import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Calendar as CalendarIcon,
  Building2,
  Headset,
  FileCheck,
  FileText,
  ShoppingCart,
  Loader2,
} from "lucide-react"
import { eventsAPI, type Event } from "@/lib/events-api"
import { api, type User } from "@/lib/api"
import { organizationsAPI } from "@/lib/organizations-api"
import { helpdeskAPI } from "@/lib/helpdesk-api"
import { serviceContractsAPI } from "@/lib/service-contracts-api"
import { vtQuotesAPI } from "@/lib/vt-quotes-api"
import { salesOrdersAPI } from "@/lib/sales-orders-api"
import { format, addDays, endOfDay } from "date-fns"
import { it } from "date-fns/locale"
import { toast } from "sonner"

interface DashboardStats {
  organizations: number | null
  tickets: number | null
  activeContracts: number | null
  contractsValue: number | null
  quotes: number | null
  orders: number | null
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    organizations: null,
    tickets: null,
    activeContracts: null,
    contractsValue: null,
    quotes: null,
    orders: null,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

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

  // Load VTiger stats
  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoadingStats(true)
        const [orgsRes, ticketsRes, contractsRes, quotesRes, ordersRes] = await Promise.allSettled([
          organizationsAPI.getAll({ limit: 1 }),
          helpdeskAPI.getAll({ limit: 1 }),
          serviceContractsAPI.getAll({ limit: 1, includeStats: 'true' }),
          vtQuotesAPI.getAll({ limit: 1 }),
          salesOrdersAPI.getAll({ limit: 1 }),
        ])

        setStats({
          organizations: orgsRes.status === 'fulfilled' ? orgsRes.value.pagination?.total ?? null : null,
          tickets: ticketsRes.status === 'fulfilled' ? ticketsRes.value.pagination?.total ?? null : null,
          activeContracts: contractsRes.status === 'fulfilled' ? contractsRes.value.statistics?.activeCount ?? contractsRes.value.pagination?.total ?? null : null,
          contractsValue: contractsRes.status === 'fulfilled' ? contractsRes.value.statistics?.totalValue ?? null : null,
          quotes: quotesRes.status === 'fulfilled' ? quotesRes.value.pagination?.total ?? null : null,
          orders: ordersRes.status === 'fulfilled' ? ordersRes.value.pagination?.total ?? null : null,
        })
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    loadStats()
  }, [])

  const statCards = [
    { label: 'Organizzazioni', value: stats.organizations, icon: Building2, path: '/organizations', color: 'text-blue-600' },
    { label: 'Ticket', value: stats.tickets, icon: Headset, path: '/helpdesk', color: 'text-orange-600' },
    { label: 'Contratti Attivi', value: stats.activeContracts, subtitle: stats.contractsValue != null ? `€ ${stats.contractsValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : undefined, icon: FileCheck, path: '/service-contracts', color: 'text-green-600' },
    { label: 'Preventivi', value: stats.quotes, icon: FileText, path: '/vt-quotes', color: 'text-purple-600' },
    { label: 'Ordini', value: stats.orders, icon: ShoppingCart, path: '/sales-orders', color: 'text-red-600' },
  ]

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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.path}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(card.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-8 w-8 ${card.color} shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                      {isLoadingStats ? (
                        <Loader2 className="h-4 w-4 animate-spin mt-1" />
                      ) : (
                        <>
                          <p className="text-2xl font-bold">{card.value ?? '—'}</p>
                          {card.subtitle && (
                            <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
