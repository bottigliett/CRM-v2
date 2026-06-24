import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock, Calendar as CalendarIcon, Loader2, Ticket,
  TrendingUp, Building2, FileSignature, ArrowRight,
  AlertCircle, CheckCircle2, BarChart3,
} from "lucide-react"
import { eventsAPI, type Event } from "@/lib/events-api"
import { api, type User } from "@/lib/api"
import { format, addDays, endOfDay } from "date-fns"
import { it } from "date-fns/locale"

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface RecentTicket {
  id: number
  ticketNumber: string
  title: string
  status: string
  priority: string | null
  category: string | null
  createdAt: string
  technicianName: string | null
  organization?: { id: number; name: string; denomination: string | null } | null
}

interface TopOrg {
  orgId: number
  orgName: string
  orgCode: string | null
  count: number
}

interface DashboardStats {
  organizations: { total: number; thisMonth: number }
  tickets: {
    total: number; open: number; thisMonth: number; thisWeek: number
    byStatus: { status: string; count: number }[]
  }
  contracts: { active: number; totalValue: number }
  quotes: { total: number; thisMonth: number }
  orders: { total: number }
  topOrgs: TopOrg[]
  recentTickets: RecentTicket[]
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Errore statistiche')
  const json = await res.json()
  return json.data
}

// ── Helpers ───────────────────────────────────────────────────
function statusColor(status: string) {
  const s = status.toLowerCase()
  if (s === 'aperto') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  if (s === 'chiuso') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (s.includes('attesa')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  if (s.includes('lavora') || s.includes('progress')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  return 'bg-muted text-muted-foreground'
}

function priorityDot(priority: string | null) {
  if (!priority) return 'bg-muted-foreground/30'
  const p = priority.toLowerCase()
  if (p === 'alta' || p === 'urgente') return 'bg-red-500'
  if (p === 'media') return 'bg-yellow-500'
  if (p === 'bassa') return 'bg-green-500'
  return 'bg-muted-foreground/30'
}

function relativeDate(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'Adesso'
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`
  if (diff < 86400 * 2) return 'Ieri'
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}g fa`
  return format(d, 'dd MMM', { locale: it })
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    api.getCurrentUser().then(setCurrentUser).catch(() => {})
  }, [])

  useEffect(() => {
    eventsAPI.getEvents({
      startDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      endDate: format(endOfDay(addDays(new Date(), 14)), 'yyyy-MM-dd'),
      limit: 100,
    }).then(res => {
      if (res.success) {
        const now = new Date()
        setUpcomingEvents(
          res.data.events
            .filter(e => new Date(e.endDateTime) >= now)
            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
            .slice(0, 4)
        )
      }
    }).catch(() => {}).finally(() => setLoadingEvents(false))
  }, [])

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  const topStatus = stats?.tickets.byStatus
    .filter(s => s.status !== 'Chiuso')
    .sort((a, b) => b.count - a.count) ?? []

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 space-y-6">

        {/* ── Welcome ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Ciao, {currentUser?.firstName || currentUser?.username || 'Utente'} 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
            </p>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingStats ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5 h-24 animate-pulse bg-muted/40 rounded-xl" /></Card>
            ))
          ) : (
            <>
              {/* Ticket aperti */}
              <Card
                className="cursor-pointer hover:bg-accent/40 transition-colors border-red-200 dark:border-red-900/40"
                onClick={() => navigate('/helpdesk')}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ticket Aperti</p>
                      <p className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">
                        {stats?.tickets.open ?? 0}
                      </p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">su {stats?.tickets.total ?? 0} totali</p>
                </CardContent>
              </Card>

              {/* Questa settimana */}
              <Card
                className="cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => navigate('/helpdesk')}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Questa settimana</p>
                      <p className="text-3xl font-bold mt-1">{stats?.tickets.thisWeek ?? 0}</p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Ticket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">+{stats?.tickets.thisMonth ?? 0} questo mese</p>
                </CardContent>
              </Card>

              {/* Contratti attivi */}
              <Card
                className="cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => navigate('/service-contracts')}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Contratti Attivi</p>
                      <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">
                        {stats?.contracts.active ?? 0}
                      </p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <FileSignature className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {(stats?.contracts.totalValue ?? 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                  </p>
                </CardContent>
              </Card>

              {/* Organizzazioni */}
              <Card
                className="cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => navigate('/organizations')}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Organizzazioni</p>
                      <p className="text-3xl font-bold mt-1">{stats?.organizations.total ?? 0}</p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">+{stats?.organizations.thisMonth ?? 0} questo mese</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ultimi ticket — 2/3 */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Ticket className="h-4 w-4" />
                  Ultimi Ticket
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/helpdesk')} className="text-xs gap-1">
                  Vedi tutti <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingStats ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !stats?.recentTickets.length ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                  Nessun ticket presente
                </div>
              ) : (
                <div className="divide-y">
                  {stats.recentTickets.map(t => (
                    <div
                      key={t.id}
                      className="flex items-start gap-3 px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => navigate('/helpdesk')}
                    >
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityDot(t.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {t.organization?.denomination || t.organization?.name || '—'}
                          {t.technicianName ? ` · ${t.technicianName}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor(t.status)}`}>
                          {t.status}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{relativeDate(t.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column — 1/3 */}
          <div className="space-y-6">

            {/* Agenzie più attive */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" />
                    Agenzie più attive
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">ultimi 30 giorni</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {loadingStats ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : !stats?.topOrgs.length ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nessun dato</p>
                ) : (
                  <div>
                    {stats.topOrgs.map((org, i) => {
                      const max = stats.topOrgs[0]?.count || 1
                      return (
                        <div
                          key={org.orgId}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40 cursor-pointer"
                          onClick={() => navigate(`/organizations/${org.orgId}`)}
                        >
                          <span className="text-xs text-muted-foreground w-4 font-mono">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{org.orgName}</p>
                            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(org.count / max) * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                            {org.count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prossimi eventi */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarIcon className="h-4 w-4" />
                    Prossimi eventi
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')} className="text-xs gap-1">
                    Agenda <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {loadingEvents ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : upcomingEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nessun evento in programma</p>
                ) : (
                  <div>
                    {upcomingEvents.map(event => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer"
                        onClick={() => navigate('/calendar')}
                      >
                        <div
                          className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                          style={{ background: event.color || event.category?.color || '#3b82f6' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3 shrink-0" />
                            {format(new Date(event.startDateTime), "EEE d MMM", { locale: it })}
                            {!event.isAllDay && (
                              <><Clock className="h-3 w-3 shrink-0" />{format(new Date(event.startDateTime), "HH:mm")}</>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Ticket per stato ── */}
        {stats && stats.tickets.byStatus.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Distribuzione ticket per stato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {stats.tickets.byStatus.map(s => (
                  <div
                    key={s.status}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card cursor-pointer hover:bg-accent/40 transition-colors"
                    onClick={() => navigate('/helpdesk')}
                  >
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(s.status)}`}>
                      {s.status}
                    </span>
                    <span className="text-lg font-bold">{s.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </BaseLayout>
  )
}
