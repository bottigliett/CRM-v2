import { useEffect, useState, useCallback } from 'react'
import { Phone, PhoneOff, PhoneIncoming } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface PendingCall {
  id: string
  number: string
  receivedAt: string
}

const POLL_INTERVAL = 3000 // 3 secondi

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
    } catch {
      // silenzio – non vogliamo toast di errore ogni 3s
    }
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
    // Rimuovi subito dalla UI
    setCalls(prev => prev.filter(c => c.id !== call.id))

    try {
      // 1. Cerca contatto per numero
      const searchRes = await fetch(
        `/api/contacts?search=${encodeURIComponent(call.number)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } }
      )
      const searchBody = await searchRes.json()
      const contacts: any[] = searchBody?.data?.contacts ?? []
      const contact = contacts[0] ?? null

      // 2. Crea ticket helpdesk
      const ticketPayload: Record<string, any> = {
        title: `Chiamata da ${call.number}`,
        status: 'Aperto',
        priority: 'Media',
        callType: 'Telefonata in entrata',
        ticketOrigin: 'Telefono',
      }
      if (contact?.id)             ticketPayload.contactId      = contact.id
      if (contact?.organizationId) ticketPayload.organizationId = contact.organizationId

      const ticketRes = await fetch('/api/helpdesk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(ticketPayload),
      })
      const ticketBody = await ticketRes.json()
      const ticketId = ticketBody?.data?.id

      // 3. Elimina la chiamata pendente
      await fetch(`/api/incoming-call/${call.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      })

      if (ticketId) {
        navigate(`/helpdesk/${ticketId}`)
      } else {
        toast.error('Ticket creato ma ID non ricevuto')
        navigate('/helpdesk')
      }
    } catch (err) {
      toast.error('Errore nella creazione del ticket')
    }
  }

  if (calls.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {calls.map(call => (
        <div
          key={call.id}
          className="pointer-events-auto flex items-center gap-4 rounded-2xl border border-green-500/30 bg-background/95 backdrop-blur shadow-2xl px-5 py-4 w-[340px] animate-in slide-in-from-bottom-4 duration-300"
        >
          {/* Icona pulsante */}
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
