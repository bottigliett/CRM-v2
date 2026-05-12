import { useEffect, useState, useCallback } from 'react'
import { Phone, PhoneOff, PhoneIncoming } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

interface PendingCall {
  id: string
  number: string
  receivedAt: string
}

const POLL_INTERVAL = 3000

/**
 * Normalizza un numero di telefono: rimuove tutto tranne le cifre
 * e restituisce le ultime 9 (sufficienti per unicità italiana).
 */
function normPhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(-9)
}

/** Confronta il numero chiamante con uno dei campi telefono di un'org. */
function phoneMatches(incoming: string, ...stored: (string | null | undefined)[]): boolean {
  const norm = normPhone(incoming)
  if (!norm) return false
  return stored.some(s => s && normPhone(s) === norm)
}

export function IncomingCallWidget() {
  const [calls, setCalls] = useState<PendingCall[]>([])
  const navigate = useNavigate()

  const fetchPending = useCallback(async () => {
    if (!api.isAuthenticated()) return
    try {
      const res = await fetch('/api/incoming-call/pending', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      })
      if (!res.ok) return
      const body = await res.json()
      setCalls(body.data ?? [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchPending()
    const id = setInterval(fetchPending, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchPending])

  const dismiss = async (callId: string) => {
    setCalls(prev => prev.filter(c => c.id !== callId))
    try {
      await fetch(`/api/incoming-call/${callId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      })
    } catch {}
  }

  const openTicket = async (call: PendingCall) => {
    setCalls(prev => prev.filter(c => c.id !== call.id))

    const authHeader = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }

    // Ricerca contatto e tutte le organizzazioni in parallelo
    const [contactRes, orgsRes] = await Promise.allSettled([
      fetch(`/api/contacts?search=${encodeURIComponent(call.number)}`, { headers: authHeader })
        .then(r => r.json()),
      fetch('/api/organizations?limit=1000', { headers: authHeader })
        .then(r => r.json()),
    ])

    const contact = contactRes.status === 'fulfilled'
      ? contactRes.value?.data?.contacts?.[0] ?? null
      : null

    // Matching client-side: normalizza e confronta le ultime 9 cifre
    // controlla phone, mobile e otherPhone
    const allOrgs: any[] = orgsRes.status === 'fulfilled'
      ? orgsRes.value?.data?.organizations ?? []
      : []

    const matchedOrg = allOrgs.find((o: any) =>
      phoneMatches(call.number, o.phone, o.mobile, o.otherPhone)
    ) ?? null

    // Elimina la chiamata pendente
    try {
      await fetch(`/api/incoming-call/${call.id}`, {
        method: 'DELETE',
        headers: authHeader,
      })
    } catch {}

    navigate('/helpdesk', {
      state: {
        openCreate: true,
        prefill: {
          title: `Chiamata da ${call.number}`,
          status: 'Aperto',
          ticketOrigin: 'Telefono',
          contactId: contact?.id?.toString() ?? '',
          organizationId: matchedOrg?.id?.toString() ?? '',
        },
      },
    })
  }

  if (calls.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {calls.map(call => (
        <div
          key={call.id}
          className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-green-500/30 bg-background/95 backdrop-blur shadow-2xl px-5 py-4 w-[340px] animate-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-500">
            <PhoneIncoming className="h-5 w-5 animate-pulse" />
          </div>

          <div className="flex flex-1 flex-col min-w-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Chiamata in arrivo
            </span>
            <span className="truncate font-semibold text-sm mt-0.5">{call.number}</span>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10 cursor-pointer"
              title="Rifiuta"
              onClick={() => dismiss(call.id)}
            >
              <PhoneOff className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9 rounded-full bg-green-500 hover:bg-green-600 text-white cursor-pointer"
              title="Apri Ticket"
              onClick={() => openTicket(call)}
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
