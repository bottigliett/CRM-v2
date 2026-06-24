import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
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
import { clientAccessAPI } from "@/lib/client-access-api"
import { type Contact } from "@/lib/contacts-api"
import { ContactSelectDialog } from "@/components/contact-select-dialog"
import { toast } from "sonner"
import { Loader2, User, X } from "lucide-react"

interface CreateClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateClientDialog({ open, onOpenChange, onSuccess }: CreateClientDialogProps) {
  const navigate = useNavigate()
  const [contactSelectOpen, setContactSelectOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [username, setUsername] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Generate username when contact is selected
  useEffect(() => {
    if (selectedContact) {
      // Generate username from contact name (lowercase, no spaces, no special chars)
      const generatedUsername = selectedContact.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9]/g, "") // Remove special chars and spaces
        .substring(0, 20) // Limit length

      setUsername(generatedUsername)
    }
  }, [selectedContact])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedContact(null)
      setUsername("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedContact) {
      toast.error('Seleziona un contatto')
      return
    }

    if (!username.trim()) {
      toast.error('Inserisci uno username')
      return
    }

    // Validate username (only lowercase letters and numbers)
    if (!/^[a-z0-9]+$/.test(username)) {
      toast.error('Lo username può contenere solo lettere minuscole e numeri')
      return
    }

    try {
      setSubmitting(true)
      const response = await clientAccessAPI.create({
        contactId: selectedContact.id,
        accessType: 'QUOTE_ONLY', // Start with QUOTE_ONLY by default
      })

      toast.success('Cliente creato con successo')
      onSuccess()
      onOpenChange(false)

      // Navigate to client detail page
      navigate(`/clients/${response.data.id}`)
    } catch (error: any) {
      console.error('Error creating client:', error)
      toast.error(error.message || 'Errore nella creazione del cliente')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveContact = () => {
    setSelectedContact(null)
    setUsername("")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Cliente</DialogTitle>
              <DialogDescription>
                Seleziona un contatto e imposta lo username per creare l'accesso cliente
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Contatto *</Label>
                {selectedContact ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{selectedContact.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedContact.email || 'Nessuna email'}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveContact}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setContactSelectOpen(true)}
                    className="w-full justify-start"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Seleziona Contatto
                  </Button>
                )}
                {selectedContact && !selectedContact.email && (
                  <p className="text-sm text-yellow-600 flex items-center gap-2">
                    <span className="font-medium">⚠️</span>
                    Questo contatto non ha un'email configurata
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="username"
                  disabled={!selectedContact}
                  maxLength={20}
                  pattern="[a-z0-9]+"
                  title="Solo lettere minuscole e numeri"
                />
                <p className="text-xs text-muted-foreground">
                  Solo lettere minuscole e numeri, senza spazi o caratteri speciali
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-blue-500/5 border-blue-500/20">
                <p className="text-sm text-muted-foreground">
                  <strong>Prossimo passo:</strong> Dopo la creazione, potrai gestire preventivi e
                  attivare la dashboard completa dalla scheda del cliente.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={submitting || !selectedContact || !username.trim()}>
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

      <ContactSelectDialog
        open={contactSelectOpen}
        onOpenChange={setContactSelectOpen}
        onSelect={setSelectedContact}
        filterType="CLIENT"
        title="Seleziona Cliente"
        description="Cerca e seleziona un cliente dalla lista contatti"
      />
    </>
  )
}
