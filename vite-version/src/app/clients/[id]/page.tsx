import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  User,
  FileText,
  Settings,
  Mail,
  Key,
  Copy,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowUpCircle,
  FolderOpen,
  Calendar,
  Euro,
  Clock,
} from "lucide-react"
import { clientAccessAPI, type ClientAccess } from "@/lib/client-access-api"
import { quotesAPI, type Quote } from "@/lib/quotes-api"
import { toast } from "sonner"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientAccess | null>(null)
  const [availableQuotes, setAvailableQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (id) {
      loadClientData()
    }
  }, [id])

  const loadClientData = async () => {
    try {
      setLoading(true)
      const response = await clientAccessAPI.getById(parseInt(id!))
      setClient(response.data)

      // Load available quotes for this contact
      if (response.data.contactId) {
        const quotesRes = await quotesAPI.getAll({ contactId: response.data.contactId })
        setAvailableQuotes(quotesRes.data || [])
      }
    } catch (error: any) {
      console.error('Error loading client:', error)
      toast.error(error.message || 'Errore nel caricamento del cliente')
      navigate('/clients')
    } finally {
      setLoading(false)
    }
  }

  const handleResendActivation = async () => {
    if (!client) return

    try {
      await clientAccessAPI.resendActivation(client.id)
      toast.success('Email di attivazione inviata')
    } catch (error: any) {
      console.error('Error resending activation:', error)
      toast.error(error.message || "Errore nell'invio dell'email")
    }
  }

  const handleCopyActivationLink = () => {
    if (!client?.activationToken) return

    const link = clientAccessAPI.getActivationLink(client.activationToken)
    navigator.clipboard.writeText(link)
    toast.success('Link copiato negli appunti')
  }

  const handleToggleActive = async () => {
    if (!client) return

    try {
      setSaving(true)
      await clientAccessAPI.update(client.id, { isActive: !client.isActive })
      toast.success(`Cliente ${!client.isActive ? 'attivato' : 'disattivato'}`)
      loadClientData()
    } catch (error: any) {
      console.error('Error updating client:', error)
      toast.error(error.message || "Errore nell'aggiornamento")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!client) return

    try {
      await clientAccessAPI.delete(client.id)
      toast.success('Cliente eliminato')
      navigate('/clients')
    } catch (error: any) {
      console.error('Error deleting client:', error)
      toast.error(error.message || "Errore nell'eliminazione")
    }
  }

  const handleLinkQuote = async (quoteId: number | null) => {
    if (!client) return

    try {
      setSaving(true)
      await clientAccessAPI.update(client.id, { linkedQuoteId: quoteId })
      toast.success('Preventivo collegato')
      loadClientData()
    } catch (error: any) {
      console.error('Error linking quote:', error)
      toast.error(error.message || 'Errore nel collegamento del preventivo')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <BaseLayout title="Caricamento...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </BaseLayout>
    )
  }

  if (!client) {
    return null
  }

  const getStatusBadge = () => {
    if (!client.isActive) {
      return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Disattivo</Badge>
    }
    if (!client.emailVerified) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">In Attesa Attivazione</Badge>
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Attivo</Badge>
  }

  return (
    <BaseLayout
      title={client.contact.name}
      description={`Gestione accesso cliente - ${client.username}`}
      headerAction={
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button variant="outline" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Lista
          </Button>
        </div>
      }
    >
      <div className="px-4 lg:px-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <User className="h-4 w-4 mr-2" />
              Panoramica
            </TabsTrigger>
            <TabsTrigger value="quote">
              <FileText className="h-4 w-4 mr-2" />
              Preventivo
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Impostazioni
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Client Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Cliente</CardTitle>
                <CardDescription>Dati contatto e accesso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{client.contact.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{client.contact.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefono</Label>
                    <p className="font-medium">{client.contact.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="font-medium">{client.username}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tipo Accesso</Label>
                    <div className="mt-1">
                      {client.accessType === 'FULL_CLIENT' ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          Cliente Completo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                          Solo Preventivo
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email Verificata</Label>
                    <div className="mt-1">
                      {client.emailVerified ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verificata
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                          <XCircle className="h-3 w-3 mr-1" />
                          Non Verificata
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Activation Actions */}
                {!client.emailVerified && client.activationToken && (
                  <div className="pt-4 space-y-2">
                    <Label>Azioni Attivazione</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleResendActivation}>
                        <Mail className="h-4 w-4 mr-2" />
                        Reinvia Email
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCopyActivationLink}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copia Link
                      </Button>
                    </div>
                  </div>
                )}

                {client.lastLogin && (
                  <div className="pt-4 border-t">
                    <Label className="text-muted-foreground">Ultimo Accesso</Label>
                    <p className="font-medium">
                      {format(new Date(client.lastLogin), "dd MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Project Info (FULL_CLIENT only) */}
            {client.accessType === 'FULL_CLIENT' && (
              <Card>
                <CardHeader>
                  <CardTitle>Informazioni Progetto</CardTitle>
                  <CardDescription>Dettagli del progetto cliente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Nome Progetto</Label>
                      <p className="font-medium">{client.projectName || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Budget</Label>
                      <p className="font-medium">
                        {client.projectBudget ? `€${client.projectBudget.toLocaleString()}` : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Canone Mensile</Label>
                      <p className="font-medium">€{client.monthlyFee}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ore Supporto</Label>
                      <p className="font-medium">
                        {client.supportHoursUsed}h / {client.supportHoursIncluded}h
                      </p>
                    </div>
                  </div>

                  {client.projectDescription && (
                    <div>
                      <Label className="text-muted-foreground">Descrizione</Label>
                      <p className="text-sm mt-1">{client.projectDescription}</p>
                    </div>
                  )}

                  {(client.driveFolderLink || client.documentsFolder || client.assetsFolder || client.invoiceFolder) && (
                    <div className="pt-4 border-t space-y-2">
                      <Label>Cartelle Drive</Label>
                      <div className="grid gap-2 md:grid-cols-2">
                        {client.driveFolderLink && (
                          <a
                            href={client.driveFolderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            <FolderOpen className="h-4 w-4" />
                            Cartella Principale
                          </a>
                        )}
                        {client.documentsFolder && (
                          <a
                            href={client.documentsFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            <FolderOpen className="h-4 w-4" />
                            Documenti
                          </a>
                        )}
                        {client.assetsFolder && (
                          <a
                            href={client.assetsFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            <FolderOpen className="h-4 w-4" />
                            Assets
                          </a>
                        )}
                        {client.invoiceFolder && (
                          <a
                            href={client.invoiceFolder}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            <FolderOpen className="h-4 w-4" />
                            Fatture
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quote Tab */}
          <TabsContent value="quote" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preventivo Associato</CardTitle>
                <CardDescription>
                  Gestisci il preventivo collegato a questo cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.linkedQuote ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{client.linkedQuote.quoteNumber}</p>
                          <p className="text-sm text-muted-foreground">{client.linkedQuote.title}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            client.linkedQuote.status === 'ACCEPTED'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : client.linkedQuote.status === 'REJECTED'
                              ? 'bg-red-500/10 text-red-500 border-red-500/20'
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }
                        >
                          {client.linkedQuote.status}
                        </Badge>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-muted-foreground">Totale</Label>
                          <p className="font-medium text-lg">€{client.linkedQuote.total.toFixed(2)}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Valido fino al</Label>
                          <p className="font-medium">
                            {format(new Date(client.linkedQuote.validUntil), 'dd MMMM yyyy', { locale: it })}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => navigate(`/quotes`)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Vedi Preventivo
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleLinkQuote(null)}
                          disabled={saving}
                        >
                          Scollega Preventivo
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nessun Preventivo Collegato</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Collega un preventivo esistente o creane uno nuovo
                    </p>

                    {availableQuotes.length > 0 && (
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="space-y-2">
                          <Label>Seleziona Preventivo</Label>
                          <Select onValueChange={(value) => handleLinkQuote(parseInt(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Scegli un preventivo" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableQuotes.map((quote) => (
                                <SelectItem key={quote.id} value={quote.id.toString()}>
                                  {quote.quoteNumber} - {quote.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-sm text-muted-foreground">oppure</p>
                      </div>
                    )}

                    <Button onClick={() => navigate(`/quotes/create?contactId=${client.contactId}`)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Crea Nuovo Preventivo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestione Account</CardTitle>
                <CardDescription>Modifica impostazioni e stato dell'account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Stato Account</p>
                      <p className="text-sm text-muted-foreground">
                        {client.isActive ? 'Account attivo' : 'Account disattivato'}
                      </p>
                    </div>
                    <Button
                      variant={client.isActive ? 'destructive' : 'default'}
                      onClick={handleToggleActive}
                      disabled={saving}
                    >
                      {client.isActive ? 'Disattiva' : 'Attiva'}
                    </Button>
                  </div>

                  {client.accessType === 'QUOTE_ONLY' && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Upgrade a Cliente Completo</p>
                        <p className="text-sm text-muted-foreground">
                          Abilita accesso completo a documenti, task e calendario
                        </p>
                      </div>
                      <Button variant="outline">
                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                        Upgrade
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                    <div>
                      <p className="font-medium text-destructive">Elimina Account</p>
                      <p className="text-sm text-muted-foreground">
                        Questa azione è irreversibile
                      </p>
                    </div>
                    <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Elimina
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informazioni Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Cliente:</span>
                  <span className="font-mono">{client.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data Creazione:</span>
                  <span>{format(new Date(client.createdAt), 'dd MMM yyyy HH:mm', { locale: it })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ultimo Aggiornamento:</span>
                  <span>{format(new Date(client.updatedAt), 'dd MMM yyyy HH:mm', { locale: it })}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l'accesso cliente per{' '}
              <strong>{client.contact.name}</strong>. Il cliente non potrà più accedere al portale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseLayout>
  )
}
