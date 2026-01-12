import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { clientAccessAPI, type CreateClientAccessData } from "@/lib/client-access-api"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { quotesAPI, type Quote } from "@/lib/quotes-api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CreateClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateClientDialog({ open, onOpenChange, onSuccess }: CreateClientDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateClientAccessData>({
    contactId: 0,
    accessType: 'QUOTE_ONLY',
    linkedQuoteId: null,
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoading(true)
      const [contactsRes, quotesRes] = await Promise.all([
        contactsAPI.getAll({ limit: 1000 }),
        quotesAPI.getAll({ limit: 1000 }),
      ])
      setContacts(contactsRes.data.contacts || [])
      setQuotes(quotesRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.contactId) {
      toast.error('Seleziona un contatto')
      return
    }

    try {
      setSubmitting(true)
      await clientAccessAPI.create(formData)
      toast.success('Cliente creato con successo')
      onSuccess()
      // Reset form
      setFormData({
        contactId: 0,
        accessType: 'QUOTE_ONLY',
        linkedQuoteId: null,
      })
    } catch (error: any) {
      console.error('Error creating client:', error)
      toast.error(error.message || 'Errore nella creazione del cliente')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedContact = contacts.find(c => c.id === formData.contactId)
  const availableQuotes = quotes.filter(q =>
    q.contactId === formData.contactId &&
    (q.status === 'SENT' || q.status === 'VIEWED' || q.status === 'DRAFT')
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crea Nuovo Accesso Cliente</DialogTitle>
            <DialogDescription>
              Crea un nuovo accesso per permettere al cliente di visualizzare preventivi o gestire il progetto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contatto *</Label>
                  <Select
                    value={formData.contactId?.toString() || ""}
                    onValueChange={(value) => setFormData({ ...formData, contactId: parseInt(value), linkedQuoteId: null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un contatto" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} {contact.email && `(${contact.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedContact && !selectedContact.email && (
                    <p className="text-sm text-yellow-600">
                      Attenzione: questo contatto non ha un'email configurata
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessType">Tipo di Accesso *</Label>
                  <Select
                    value={formData.accessType}
                    onValueChange={(value: 'QUOTE_ONLY' | 'FULL_CLIENT') =>
                      setFormData({ ...formData, accessType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUOTE_ONLY">Solo Preventivo</SelectItem>
                      <SelectItem value="FULL_CLIENT">Cliente Completo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.accessType === 'QUOTE_ONLY'
                      ? 'Il cliente potrà visualizzare e accettare solo il preventivo assegnato'
                      : 'Il cliente avrà accesso completo a documenti, task, agenda e ticket'}
                  </p>
                </div>

                {formData.accessType === 'QUOTE_ONLY' && formData.contactId > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="quote">Preventivo da Collegare</Label>
                    <Select
                      value={formData.linkedQuoteId?.toString() || "none"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          linkedQuoteId: value === "none" ? null : parseInt(value)
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un preventivo (opzionale)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessun preventivo</SelectItem>
                        {availableQuotes.map((quote) => (
                          <SelectItem key={quote.id} value={quote.id.toString()}>
                            {quote.quoteNumber} - {quote.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableQuotes.length === 0 && formData.contactId > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nessun preventivo disponibile per questo contatto.
                        Puoi collegarne uno successivamente.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={submitting || loading || !formData.contactId}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione...
                </>
              ) : (
                'Crea Cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
