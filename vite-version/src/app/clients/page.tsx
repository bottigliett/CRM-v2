"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Search,
  Eye,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import { clientAccessAPI, type ClientAccess } from "@/lib/client-access-api"
import { toast } from "sonner"
import { CreateClientDialog } from "./components/create-client-dialog"

export default function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await clientAccessAPI.getAll({
        search: searchQuery || undefined,
        accessType: typeFilter !== 'all' ? typeFilter : undefined,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        limit: 100,
      })

      setClients(response.data)
    } catch (error) {
      console.error('Errore nel caricamento clienti:', error)
      toast.error('Errore nel caricamento dei clienti')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [searchQuery, typeFilter, statusFilter])

  const handleViewClient = (clientId: number) => {
    navigate(`/clients/${clientId}`)
  }

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false)
    loadClients()
  }

  const getStatusBadge = (client: ClientAccess) => {
    if (!client.isActive) {
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Disattivo</Badge>
    }
    if (!client.emailVerified) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">In Attesa Attivazione</Badge>
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Attivo</Badge>
  }

  const getTypeBadge = (type: string) => {
    if (type === 'FULL_CLIENT') {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Cliente Completo</Badge>
    }
    return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Solo Preventivo</Badge>
  }

  return (
    <BaseLayout
      title="Gestione Clienti"
      description="Gestisci gli accessi cliente e i preventivi associati"
      headerAction={
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Cliente
        </Button>
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca per nome, email o username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Tipo accesso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              <SelectItem value="QUOTE_ONLY">Solo Preventivo</SelectItem>
              <SelectItem value="FULL_CLIENT">Cliente Completo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="active">Attivi</SelectItem>
              <SelectItem value="inactive">Disattivi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clients Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Tipo Accesso</TableHead>
                <TableHead>Preventivo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <User className="h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Nessun cliente trovato
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crea Primo Cliente
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewClient(client.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {client.contact.name}
                      </div>
                    </TableCell>
                    <TableCell>{client.contact.email || '-'}</TableCell>
                    <TableCell>{client.username}</TableCell>
                    <TableCell>{getTypeBadge(client.accessType)}</TableCell>
                    <TableCell>
                      {client.linkedQuote ? (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {client.linkedQuote.quoteNumber}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(client)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewClient(client.id)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Gestisci
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              Totale Clienti
            </div>
            <div className="text-2xl font-bold">{clients.length}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Attivi
            </div>
            <div className="text-2xl font-bold text-green-600">
              {clients.filter(c => c.isActive && c.emailVerified).length}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              In Attesa Attivazione
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {clients.filter(c => !c.emailVerified).length}
            </div>
          </div>
        </div>
      </div>

      <CreateClientDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </BaseLayout>
  )
}
