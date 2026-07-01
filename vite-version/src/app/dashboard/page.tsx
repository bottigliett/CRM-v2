import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Clock, Calendar as CalendarIcon, Loader2, Ticket,
  TrendingUp, FileSignature, ArrowRight,
  AlertCircle, CheckCircle2, ShoppingCart,
} from "lucide-react"
import { api, type User } from "@/lib/api"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface WeekEvent {
  id: number
  title: string
  startDate: string
  endDate: string | null
  allDay: boolean
  color: string | null
  assignedTo: { id: number; firstName: string | null; lastName: string | null; username: string } | null
}

interface QuoteCreato {
  id: number
  quoteNumber: string
  subject: string
  stage: string
  validUntil: string | null
  createdAt: string
  organization: { id: number; name: string; denomination: string | null } | null
  assignedTo: { id: number; firstName: string | null; lastName: string | null; username: string } | null
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
  contracts: { activeTecnocasa: number; blockedTecnocasa: number }
  quotes: { total: number; thisMonth: number; creato: number }
  orders: { total: number; daFatturare: number }
  topOrgs: TopOrg[]
  weekEvents: WeekEvent[]
  quotesCreatiList: QuoteCreato[]
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
function quoteStatusColor(stage: string) {
  const s = stage.toLowerCase()
  if (s === 'creato') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  if (s === 'consegnato') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (s === 'accettato') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (s === 'rifiutato') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-muted text-muted-foreground'
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

function userName(u: { firstName: string | null; lastName: string | null; username: string } | null) {
  if (!u) return null
  return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => { api.getCurrentUser().then(setCurrentUser).catch(() => {}) }, [])

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 space-y-6">

        {/* ── Welcome ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Ciao, {currentUser?.firstName || currentUser?.username || 'Utente'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
            </p>
          </div>
        </div>

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {loadingStats ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5 h-24 animate-pulse bg-muted/40 rounded-xl" /></Card>
            ))
          ) : (
            <>
              {/* Ticket aperti */}
              <Card className="cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => navigate('/helpdesk')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ticket Aperti</p>
                      <p className="text-3xl font-bold mt-1 text-red-600 dark:text-red-400">{stats?.tickets.open ?? 0}</p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">su {stats?.tickets.total ?? 0} totali</p>
                </CardContent>
              </Card>

              {/* Questa settimana */}
              <Card className="cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => navigate('/helpdesk')}>
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

              {/* Contratti Tecnocasa Attivi */}
              <Card className="cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => navigate('/service-contracts')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Contratti Attivi</p>
                      <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{stats?.contracts.activeTecnocasa ?? 0}</p>
                    </div>
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <FileSignature className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Tecnocasa esteso</p>
                </CardContent>
              </Card>

              {/* Blocco Amministrativo Tecnocasa */}
              <Card className="cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => navigate('/service-contracts')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Blocco Amm.</p>
                      <p className="text-3xl font-bold mt-1 text-orange-600 dark:text-orange-400">{stats?.contracts.blockedTecnocasa ?? 0}</p>
                    </div>
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Contratti di assistenza</p>
                </CardContent>
              </Card>

              {/* Ordini da Fatturare */}
              <Card className="cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => navigate('/sales-orders')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Da Fatturare</p>
                      <p className="text-3xl font-bold mt-1 text-purple-600 dark:text-purple-400">{stats?.orders.daFatturare ?? 0}</p>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <ShoppingCart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Ordini di vendita</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Agenda settimanale — 2/3 */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarIcon className="h-4 w-4" />
                  Agenda settimanale
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')} className="text-xs gap-1">
                  Agenda completa <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingStats ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !stats?.weekEvents?.length ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                  Nessun evento questa settimana
                </div>
              ) : (
                <div className="divide-y">
                  {(stats.weekEvents ?? []).map(ev => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3 px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => navigate('/calendar')}
                    >
                      <div
                        className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                        style={{ background: ev.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ev.assignedTo ? userName(ev.assignedTo) : '—'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ev.startDate), "EEE d MMM", { locale: it })}
                        </span>
                        {!ev.allDay && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(ev.startDate), "HH:mm")}
                          </span>
                        )}
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
                ) : !stats?.topOrgs?.length ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nessun dato</p>
                ) : (
                  <div>
                    {(stats.topOrgs ?? []).map((org, i) => {
                      const max = stats.topOrgs?.[0]?.count || 1
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
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(org.count / max) * 100}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">{org.count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preventivi in stato CREATO */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSignature className="h-4 w-4" />
                    Preventivi
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/vt-quotes')} className="text-xs gap-1">
                    Vedi tutti <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {loadingStats ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : !stats?.quotesCreatiList?.length ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nessun preventivo in stato Creato</p>
                ) : (
                  <div>
                    {(stats.quotesCreatiList ?? []).map(q => (
                      <div
                        key={q.id}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer"
                        onClick={() => navigate('/vt-quotes')}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{q.quoteNumber}</span>
                            <Badge className={`text-[10px] px-1.5 py-0 ${quoteStatusColor(q.stage)}`}>{q.stage}</Badge>
                          </div>
                          <p className="text-sm truncate mt-0.5">
                            {q.organization?.denomination || q.organization?.name || q.subject}
                          </p>
                          {q.assignedTo && (
                            <p className="text-xs text-muted-foreground truncate">{userName(q.assignedTo)}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">{relativeDate(q.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </BaseLayout>
  )
}
