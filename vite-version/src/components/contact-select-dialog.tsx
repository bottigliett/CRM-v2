import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, User, Mail, Phone, Loader2 } from "lucide-react"
import { contactsAPI, type Contact } from "@/lib/contacts-api"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ContactSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (contact: Contact) => void
  filterType?: 'CLIENT' | 'PROSPECT' | 'all'
  title?: string
  description?: string
}

export function ContactSelectDialog({
  open,
  onOpenChange,
  onSelect,
  filterType = 'all',
  title = "Seleziona Contatto",
  description = "Cerca e seleziona un contatto dalla lista",
}: ContactSelectDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>(filterType)

  useEffect(() => {
    if (open) {
      loadContacts()
      if (filterType !== 'all') {
        setTypeFilter(filterType)
      }
    }
  }, [open, filterType])

  const loadContacts = async () => {
    try {
      setLoading(true)
      const response = await contactsAPI.getAll({ limit: 1000 })
      setContacts(response.data.contacts || [])
    } catch (error) {
      console.error('Error loading contacts:', error)
      toast.error('Errore nel caricamento dei contatti')
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      !searchQuery ||
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery)

    const matchesType =
      typeFilter === 'all' || contact.type === typeFilter

    return matchesSearch && matchesType
  })

  const handleSelect = (contact: Contact) => {
    onSelect(contact)
    onOpenChange(false)
    setSearchQuery("")
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CLIENT':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'PROSPECT':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'COLLABORATION':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'USEFUL_CONTACT':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="px-6 space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email o telefono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="CLIENT">Clienti</SelectItem>
                <SelectItem value="PROSPECT">Prospect</SelectItem>
                <SelectItem value="COLLABORATION">Collaborazioni</SelectItem>
                <SelectItem value="USEFUL_CONTACT">Contatti Utili</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "Nessun contatto trovato"
                        : "Nessun contatto disponibile"}
                    </p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelect(contact)}
                      className="w-full text-left p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium truncate">{contact.name}</h4>
                            <Badge variant="outline" className={getTypeColor(contact.type)}>
                              {contact.type}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{contact.email}</span>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            {filteredContacts.length} contatto{filteredContacts.length !== 1 ? 'i' : ''} trovato
            {filteredContacts.length !== 1 ? 'i' : ''}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
