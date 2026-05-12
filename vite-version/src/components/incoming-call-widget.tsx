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

/** Produce varianti del numero da provare per la ricerca (strip prefissi internazionali) */
function phoneVariants(raw: string): string[] {
  const clean = raw.replace(/[\s\-\(\)\.]/g, '')
  const variants = new Set<string>([clean])
  // +39XXXXXXXXX  → XXXXXXXXX  e  39XXXXXXXXX
  if (clean.startsWith('+39')) {
    variants.add(clean.slice(3))   // local
    variants.add(clean.slice(1))   // 39...
  } else if (clean.startsWith('39') && clean.length > 10) {
    variants.add(clean.slice(2))   // strip 39
  }
  // +44, +33, … → strip +
  if (clean.startsWith('+')) {
    variants.add(clean.slice(1))
  }
  return Array.from(variants)
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
    const variants = phoneVariants(call.number)

    // Cerca contatto e organizzazione in parallelo su tutte le varianti del numero
    let contact: any = null
    let organization: any = null

    await Promise.all(variants.map(async (num) => {
      if (contact && organization) return
      try {
        const [cRes, oRes] = await Promise.all([
          fetch(`/api/contacts?search=${encodeURIComponent(num)}`, { headers: authHeader }),
          fetch(`/api/organizations?search=${encodeURIComponent(num)}&limit=5`, { headers: authHeader }),
        ])
        const [cBody, oBody] = await Promise.all([cRes.json(), oRes.json()])
        if (!contact) contact = cBody?.data?.contacts?.[0] ?? null
        if (!organization) organization = oBody?.data?.organizations?.[0] ?? null
      } catch {}
    }))

    // Elimina la chiamata pendente
    try {
      await fetch(`/api/incoming-call/${call.id}`, {
        method: 'DELETE',
        headers: authHeader,
      })
    } catch {}

    // Determina l'organizzazione: preferisci quella trovata dal numero,
    // altrimenti usa quella del contatto
    const orgId = organization?.id?.toString()
      ?? contact?.organizationId?.toString()
      ?? ''

    navigate('/helpdesk', {
      state: {
        openCreate: true,
        prefill: {
          title: `Chiamata da ${call.number}`,
          status: 'Aperto',
          ticketOrigin: 'Telefono',
          contactId: contact?.id?.toString() ?? '',
          organizationId: orgId,
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
