"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Building2, Phone, Mail, MapPin, CreditCard, FileSignature,
  Headphones, FileText, MessageSquare, Loader2, Trash2, Send, Clock,
  User, Globe, Info, Hash, Landmark, Users, Cpu, Server
} from "lucide-react"
import { organizationsAPI, type Organization } from "@/lib/organizations-api"
import { serviceContractsAPI, type ServiceContract } from "@/lib/service-contracts-api"
import { helpdeskAPI, type HelpDeskTicket } from "@/lib/helpdesk-api"
import { vtQuotesAPI, type VtQuote } from "@/lib/vt-quotes-api"
import { toast } from "sonner"

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

interface OrgNote {
  id: number
  organizationId: number
  userId: number | null
  content: string
  createdAt: string
  updatedAt: string
  user?: { id: number; firstName: string | null; lastName: string | null; username: string } | null
}

function getAuthHeader() {
  const token = localStorage.getItem('auth_token')
  if (!token) throw new Error('Non autenticato')
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function fetchNotes(orgId: number): Promise<OrgNote[]> {
  const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/notes`, { headers: getAuthHeader() })
  const data = await res.json()
  return data.success ? data.data : []
}

async function addNote(orgId: number, content: string): Promise<OrgNote> {
  const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/notes`, {
    method: 'POST', headers: getAuthHeader(), body: JSON.stringify({ content }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message)
  return data.data
}

async function removeNote(orgId: number, noteId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/notes/${noteId}`, {
    method: 'DELETE', headers: getAuthHeader(),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.message)
}

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("it-IT") : "-"

const formatCurrency = (v: number | null | undefined) =>
  v != null ? `€ ${v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : "-"

const STATUS_COLORS: Record<string, string> = {
  "Attivo": "bg-green-100 text-green-800",
  "Scaduto": "bg-red-100 text-red-800",
  "Non attivo": "bg-gray-100 text-gray-800",
  "In attesa fatturazione": "bg-yellow-100 text-yellow-800",
  "Blocco Amministrativo": "bg-red-100 text-red-800",
  "In attesa pagamento": "bg-orange-100 text-orange-800",
}

const TICKET_STATUS_COLORS: Record<string, string> = {
  "Aperto": "bg-blue-100 text-blue-800",
  "In lavorazione": "bg-yellow-100 text-yellow-800",
  "Chiuso": "bg-gray-100 text-gray-800",
  "Risolto": "bg-green-100 text-green-800",
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (!value || value === "-") return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const orgId = parseInt(id || "0")

  const [org, setOrg] = useState<Organization | null>(null)
  const [contracts, setContracts] = useState<ServiceContract[]>([])
  const [tickets, setTickets] = useState<HelpDeskTicket[]>([])
  const [quotes, setQuotes] = useState<VtQuote[]>([])
  const [notes, setNotes] = useState<OrgNote[]>([])
  const [loading, setLoading] = useState(true)
  const [noteInput, setNoteInput] = useState("")
  const [sendingNote, setSendingNote] = useState(false)
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null)
  const [selectedContract, setSelectedContract] = useState<ServiceContract | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<HelpDeskTicket | null>(null)

  const loadAll = useCallback(async () => {
    try {
      setLoading(true)
      const orgRes = await organizationsAPI.getById(orgId)
      const orgData: Organization = orgRes.data || orgRes
      setOrg(orgData)

      const [cRes, tRes, qRes, nData] = await Promise.allSettled([
        serviceContractsAPI.getAll({ limit: 100, orgName: orgData.name }),
        helpdeskAPI.getAll({ limit: 100, orgName: orgData.name }),
        vtQuotesAPI.getAll({ limit: 100, organizationId: orgId.toString() }),
        fetchNotes(orgId),
      ])

      if (cRes.status === "fulfilled") setContracts(cRes.value.data?.contracts || cRes.value.data || [])
      if (tRes.status === "fulfilled") setTickets(tRes.value.data?.tickets || tRes.value.data || [])
      if (qRes.status === "fulfilled") setQuotes(qRes.value.data?.quotes || qRes.value.data || [])
      if (nData.status === "fulfilled") setNotes(nData.value)
    } catch (e: any) {
      toast.error(e.message || "Errore nel caricamento")
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { loadAll() }, [loadAll])

  const handleAddNote = async () => {
    if (!noteInput.trim()) return
    try {
      setSendingNote(true)
      const note = await addNote(orgId, noteInput)
      setNotes(prev => [note, ...prev])
      setNoteInput("")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSendingNote(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return
    try {
      await removeNote(orgId, deleteNoteId)
      setNotes(prev => prev.filter(n => n.id !== deleteNoteId))
      setDeleteNoteId(null)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) return (
    <BaseLayout>
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </BaseLayout>
  )

  if (!org) return (
    <BaseLayout>
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Organizzazione non trovata</p>
        <Button variant="outline" onClick={() => navigate("/organizations")}><ArrowLeft className="mr-2 h-4 w-4" />Torna alla lista</Button>
      </div>
    </BaseLayout>
  )

  const userName = (n: OrgNote) => n.user
    ? `${n.user.firstName || ""} ${n.user.lastName || ""}`.trim() || n.user.username
    : "Sistema"

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/organizations")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{org.denomination || org.name}</h1>
              {org.accountType && (
                <Badge className={org.accountType === "SI Contratto" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {org.accountType}
                </Badge>
              )}
              {!org.isActive && <Badge variant="secondary">Inattivo</Badge>}
            </div>
            {org.denomination && org.denomination !== org.name && (
              <p className="text-muted-foreground text-sm mt-1">{org.name}</p>
            )}
          </div>
          <Button variant="outline" onClick={() => navigate("/organizations")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Lista
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileSignature className="h-4 w-4" />Contratti</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{contracts.length}</p>
              <p className="text-xs text-muted-foreground">{contracts.filter(c => c.status === "Attivo").length} attivi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Headphones className="h-4 w-4" />Ticket assistenza</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{tickets.length}</p>
              <p className="text-xs text-muted-foreground">{tickets.filter(t => t.status === "Aperto" || t.status === "In lavorazione").length} aperti</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" />Preventivi</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{quotes.length}</p></CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dettagli" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dettagli"><Info className="mr-2 h-4 w-4 inline" />Dettagli</TabsTrigger>
            <TabsTrigger value="contratti"><FileSignature className="mr-2 h-4 w-4 inline" />Contratti ({contracts.length})</TabsTrigger>
            <TabsTrigger value="assistenza"><Headphones className="mr-2 h-4 w-4 inline" />Assistenza ({tickets.length})</TabsTrigger>
            <TabsTrigger value="preventivi"><FileText className="mr-2 h-4 w-4 inline" />Preventivi ({quotes.length})</TabsTrigger>
            <TabsTrigger value="note"><MessageSquare className="mr-2 h-4 w-4 inline" />Note ({notes.length})</TabsTrigger>
          </TabsList>

          {/* TAB DETTAGLI */}
          <TabsContent value="dettagli" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Anagrafica</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Field label="Nome organizzazione" value={org.name} />
                  <Field label="Ragione Sociale" value={org.denomination} />
                  <Field label="Codice BDT" value={org.code} mono />
                  <Field label="P.IVA" value={org.vatNumber} mono />
                  <Field label="Codice Univoco (SDI)" value={org.uniqueCode} mono />
                  <Field label="Settore" value={org.industry} />
                  <Field label="Tipo" value={org.accountType} />
                  <Field label="Data creazione" value={formatDate(org.createdAt)} />
                  <Field label="Ultima modifica" value={formatDate(org.updatedAt)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" />Contatti</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Field label="Telefono" value={org.phone} />
                  <Field label="Cellulare" value={org.mobile} />
                  <Field label="Altri Telefoni" value={org.otherPhone} />
                  <Field label="Email" value={org.email} />
                  <Field label="PEC" value={org.pec} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Indirizzi</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(org.billStreet || org.billCity) && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Fatturazione</p>
                      <p className="text-sm">{[org.billStreet, org.billCity, org.billState, org.billCode, org.billCountry].filter(Boolean).join(", ")}</p>
                    </div>
                  )}
                  {(org.shipStreet || org.shipCity) && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Spedizione</p>
                      <p className="text-sm">{[org.shipStreet, org.shipCity, org.shipState, org.shipCode, org.shipCountry].filter(Boolean).join(", ")}</p>
                    </div>
                  )}
                  {!org.billStreet && !org.billCity && !org.shipStreet && !org.shipCity && (
                    <p className="text-sm text-muted-foreground">Nessun indirizzo</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Persone & Banca</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Field label="Legale Rappresentante" value={org.legalRep} />
                  <Field label="Coordinatrice" value={org.coordinator} />
                  {org.shareholders && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Compagine Sociale</p>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{org.shareholders}</p>
                    </div>
                  )}
                  <Field label="Banca" value={org.bankName} />
                  <Field label="IBAN" value={org.iban} mono />
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4" />Infrastruttura</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Field label="Dispositivi" value={org.devices} />
                  <Field label="Info NAS" value={org.nasInfo} />
                  <Field label="Contratto NAS" value={org.nasContract} />
                </CardContent>
              </Card>

              {org.description && (
                <Card className="md:col-span-2">
                  <CardHeader><CardTitle className="text-base">Descrizione</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{org.description}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TAB CONTRATTI */}
          <TabsContent value="contratti" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Valore</TableHead>
                      <TableHead>Inizio</TableHead>
                      <TableHead>Prossima fattura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessun contratto</TableCell></TableRow>
                    ) : contracts.map(c => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedContract(c)}>
                        <TableCell className="font-mono text-sm">{c.contractNumber}</TableCell>
                        <TableCell>{c.contractType || "-"}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}>{c.status}</Badge></TableCell>
                        <TableCell>{formatCurrency(c.contractValue)}</TableCell>
                        <TableCell>{formatDate(c.startDate)}</TableCell>
                        <TableCell>{formatDate(c.nextInvoiceDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB ASSISTENZA */}
          <TabsContent value="assistenza" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Titolo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Priorità</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nessun ticket</TableCell></TableRow>
                    ) : tickets.map(t => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTicket(t)}>
                        <TableCell className="font-mono text-sm">{t.ticketNumber}</TableCell>
                        <TableCell className="max-w-[280px] truncate">{t.title}</TableCell>
                        <TableCell><Badge className={TICKET_STATUS_COLORS[t.status] || "bg-gray-100 text-gray-800"}>{t.status}</Badge></TableCell>
                        <TableCell>{t.priority || "-"}</TableCell>
                        <TableCell>{t.callType || "-"}</TableCell>
                        <TableCell>{formatDate(t.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB PREVENTIVI */}
          <TabsContent value="preventivi" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Oggetto</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Valido fino</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nessun preventivo</TableCell></TableRow>
                    ) : quotes.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-sm">{q.quoteNumber}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{q.subject}</TableCell>
                        <TableCell><Badge variant="outline">{q.stage}</Badge></TableCell>
                        <TableCell>{formatDate(q.validUntil)}</TableCell>
                        <TableCell>{formatDate(q.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB NOTE */}
          <TabsContent value="note" className="mt-4">
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <Textarea
                    placeholder="Scrivi una nota..."
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    rows={3}
                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddNote() }}
                  />
                  <div className="flex justify-end mt-2">
                    <Button onClick={handleAddNote} disabled={sendingNote || !noteInput.trim()}>
                      {sendingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Aggiungi nota
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {notes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nessuna nota ancora. Aggiungi la prima!</p>
              ) : notes.map(note => (
                <Card key={note.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => setDeleteNoteId(note.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{userName(note)}</span>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{new Date(note.createdAt).toLocaleString("it-IT")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Contract preview dialog */}
        <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />{selectedContract?.contractNumber}
              </DialogTitle>
              <DialogDescription>Dettagli contratto</DialogDescription>
            </DialogHeader>
            {selectedContract && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium">{selectedContract.contractType || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Stato</p><Badge className={STATUS_COLORS[selectedContract.status] || "bg-gray-100 text-gray-800"}>{selectedContract.status}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Valore</p><p className="font-medium">{formatCurrency(selectedContract.contractValue)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Consultecno</p><p className="font-medium">{selectedContract.isConsultecno ? "Sì" : "No"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Data inizio</p><p className="font-medium">{formatDate(selectedContract.startDate)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Prossima fattura</p><p className="font-medium">{formatDate(selectedContract.nextInvoiceDate)}</p></div>
                </div>
                {selectedContract.subject && (
                  <>
                    <Separator />
                    <div><p className="text-xs text-muted-foreground mb-1">Informazioni aggiuntive</p><p className="whitespace-pre-wrap">{selectedContract.subject}</p></div>
                  </>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedContract(null)}>Chiudi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Ticket preview dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />{selectedTicket?.ticketNumber}
              </DialogTitle>
              <DialogDescription>{selectedTicket?.title}</DialogDescription>
            </DialogHeader>
            {selectedTicket && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">Stato</p><Badge className={TICKET_STATUS_COLORS[selectedTicket.status] || "bg-gray-100 text-gray-800"}>{selectedTicket.status}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Priorità</p><p className="font-medium">{selectedTicket.priority || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tipo chiamata</p><p className="font-medium">{selectedTicket.callType || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Categoria</p><p className="font-medium">{selectedTicket.category || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tecnico</p><p className="font-medium">{selectedTicket.technicianName || "-"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Data apertura</p><p className="font-medium">{formatDate(selectedTicket.createdAt)}</p></div>
                  {(selectedTicket.hours || selectedTicket.days) && (
                    <>
                      <div><p className="text-xs text-muted-foreground">Ore</p><p className="font-medium">{selectedTicket.hours ?? "-"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Giorni</p><p className="font-medium">{selectedTicket.days ?? "-"}</p></div>
                    </>
                  )}
                </div>
                {selectedTicket.description && (
                  <>
                    <Separator />
                    <div><p className="text-xs text-muted-foreground mb-1">Descrizione</p><p className="whitespace-pre-wrap">{selectedTicket.description}</p></div>
                  </>
                )}
                {selectedTicket.solution && (
                  <>
                    <Separator />
                    <div><p className="text-xs text-muted-foreground mb-1">Soluzione</p><p className="whitespace-pre-wrap">{selectedTicket.solution}</p></div>
                  </>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>Chiudi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete note dialog */}
        <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare la nota?</AlertDialogTitle>
              <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </BaseLayout>
  )
}
