"use client"

import React, { useState, useEffect, useCallback } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Eye, ShoppingCart,
} from "lucide-react"
import { salesOrdersAPI, type SalesOrder } from "@/lib/sales-orders-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

const STATUSES = ["Creato", "Approvato", "Cancellato", "Installazione Programmata", "Fatturazione", "Consegnato"]
const INVOICE_STATUSES = ["Da Fatturare", "Non Fatturato", "Fatturato", "Parzialmente Fatturato"]
const RECURRING_FREQS = ["Giornaliero", "Weekly", "Mensile", "Bimestrale", "Trimestrale", "Semestrale", "Annuale"]
const PAYMENT_DURATIONS = ["Net 30", "Net 45", "Net 60"]

const STATUS_COLORS: Record<string, string> = {
  "Creato": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Approvato": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Cancellato": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Installazione Programmata": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Fatturazione": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Consegnato": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

const emptyForm: any = {
  subject: "", organizationId: "", contactId: "", quoteId: "", assignedToId: "",
  customerNumber: "", purchaseOrder: "", invoiceStatus: "", dueDate: "",
  status: "Creato", salesCommission: "", carrier: "", exciseDuty: "",
  consultecnoContract: "", opening: "",
  enableRecurring: false, recurringFreq: "", startPeriod: "", endPeriod: "", paymentDuration: "",
  billStreet: "", billPoBox: "", billCity: "", billState: "", billCode: "", billCountry: "",
  shipStreet: "", shipPoBox: "", shipCity: "", shipState: "", shipCode: "", shipCountry: "",
  termsConditions: "", description: "",
}

export default function SalesOrdersPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selected, setSelected] = useState<SalesOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })
  const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 }).then(r => setOrgs(r.data.organizations.map((o: any) => ({ id: o.id, name: o.name })))).catch(() => {})
  }, [])

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const response = await salesOrdersAPI.getAll({
        page, limit: 20, search: searchQuery,
        status: statusFilter || undefined,
        invoiceStatus: invoiceStatusFilter || undefined,
      })
      setItems(response.data.orders)
      setCurrentPage(response.data.pagination.page)
      setTotalPages(response.data.pagination.totalPages)
      setTotalCount(response.data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, invoiceStatusFilter])

  useEffect(() => {
    const timer = setTimeout(() => loadData(), searchQuery ? 500 : 0)
    return () => clearTimeout(timer)
  }, [loadData])

  const handleCreate = async () => {
    if (!formData.subject) { toast.error("L'oggetto è obbligatorio"); return }
    try {
      setSubmitting(true)
      await salesOrdersAPI.create(formData)
      toast.success("Ordine creato con successo!")
      setIsCreateOpen(false)
      setFormData({ ...emptyForm })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleEdit = async () => {
    if (!selected || !formData.subject) { toast.error("L'oggetto è obbligatorio"); return }
    try {
      setSubmitting(true)
      await salesOrdersAPI.update(selected.id, formData)
      toast.success("Ordine aggiornato!")
      setIsEditOpen(false)
      setSelected(null)
      setFormData({ ...emptyForm })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      setSubmitting(true)
      await salesOrdersAPI.delete(selected.id)
      toast.success("Ordine eliminato!")
      setIsDeleteOpen(false)
      setSelected(null)
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const openEdit = (item: SalesOrder) => {
    setSelected(item)
    setFormData({
      subject: item.subject, organizationId: item.organizationId?.toString() || "",
      contactId: item.contactId?.toString() || "", quoteId: item.quoteId?.toString() || "",
      assignedToId: item.assignedToId?.toString() || "",
      customerNumber: item.customerNumber || "", purchaseOrder: item.purchaseOrder || "",
      invoiceStatus: item.invoiceStatus || "",
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "",
      status: item.status, salesCommission: item.salesCommission?.toString() || "",
      carrier: item.carrier || "", exciseDuty: item.exciseDuty?.toString() || "",
      consultecnoContract: item.consultecnoContract || "", opening: item.opening || "",
      enableRecurring: item.enableRecurring,
      recurringFreq: item.recurringFreq || "",
      startPeriod: item.startPeriod ? new Date(item.startPeriod).toISOString().split("T")[0] : "",
      endPeriod: item.endPeriod ? new Date(item.endPeriod).toISOString().split("T")[0] : "",
      paymentDuration: item.paymentDuration || "",
      billStreet: item.billStreet || "", billPoBox: item.billPoBox || "",
      billCity: item.billCity || "", billState: item.billState || "",
      billCode: item.billCode || "", billCountry: item.billCountry || "",
      shipStreet: item.shipStreet || "", shipPoBox: item.shipPoBox || "",
      shipCity: item.shipCity || "", shipState: item.shipState || "",
      shipCode: item.shipCode || "", shipCountry: item.shipCountry || "",
      termsConditions: item.termsConditions || "", description: item.description || "",
    })
    setIsEditOpen(true)
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"

  const renderForm = () => (
    <Tabs defaultValue="generale" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="generale">Generale</TabsTrigger>
        <TabsTrigger value="ricorrenza">Ricorrenza</TabsTrigger>
        <TabsTrigger value="fatturazione">Ind. Fatt.</TabsTrigger>
        <TabsTrigger value="spedizione">Ind. Sped.</TabsTrigger>
        <TabsTrigger value="note">Note</TabsTrigger>
      </TabsList>
      <TabsContent value="generale" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Oggetto *</Label><Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} /></div>
          <div>
            <Label>Stato</Label>
            <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Organizzazione</Label>
            <Select value={formData.organizationId} onValueChange={v => setFormData({ ...formData, organizationId: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stato fatturazione</Label>
            <Select value={formData.invoiceStatus} onValueChange={v => setFormData({ ...formData, invoiceStatus: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Scadenza</Label><Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} /></div>
          <div><Label>N. Cliente</Label><Input value={formData.customerNumber} onChange={e => setFormData({ ...formData, customerNumber: e.target.value })} /></div>
          <div><Label>Ordine d'acquisto</Label><Input value={formData.purchaseOrder} onChange={e => setFormData({ ...formData, purchaseOrder: e.target.value })} /></div>
          <div><Label>Corriere</Label><Input value={formData.carrier} onChange={e => setFormData({ ...formData, carrier: e.target.value })} /></div>
          <div><Label>Contratto Consultecno</Label><Input value={formData.consultecnoContract} onChange={e => setFormData({ ...formData, consultecnoContract: e.target.value })} /></div>
          <div><Label>Apertura</Label><Input value={formData.opening} onChange={e => setFormData({ ...formData, opening: e.target.value })} /></div>
        </div>
      </TabsContent>
      <TabsContent value="ricorrenza" className="space-y-4 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" checked={formData.enableRecurring} onChange={e => setFormData({ ...formData, enableRecurring: e.target.checked })} id="enableRecurring" />
          <Label htmlFor="enableRecurring">Abilita ricorrenza</Label>
        </div>
        {formData.enableRecurring && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Frequenza</Label>
              <Select value={formData.recurringFreq} onValueChange={v => setFormData({ ...formData, recurringFreq: v })}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>{RECURRING_FREQS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Durata pagamento</Label>
              <Select value={formData.paymentDuration} onValueChange={v => setFormData({ ...formData, paymentDuration: v })}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>{PAYMENT_DURATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Inizio periodo</Label><Input type="date" value={formData.startPeriod} onChange={e => setFormData({ ...formData, startPeriod: e.target.value })} /></div>
            <div><Label>Fine periodo</Label><Input type="date" value={formData.endPeriod} onChange={e => setFormData({ ...formData, endPeriod: e.target.value })} /></div>
          </div>
        )}
      </TabsContent>
      <TabsContent value="fatturazione" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Via</Label><Input value={formData.billStreet} onChange={e => setFormData({ ...formData, billStreet: e.target.value })} /></div>
          <div><Label>Casella Postale</Label><Input value={formData.billPoBox} onChange={e => setFormData({ ...formData, billPoBox: e.target.value })} /></div>
          <div><Label>Città</Label><Input value={formData.billCity} onChange={e => setFormData({ ...formData, billCity: e.target.value })} /></div>
          <div><Label>Provincia</Label><Input value={formData.billState} onChange={e => setFormData({ ...formData, billState: e.target.value })} /></div>
          <div><Label>CAP</Label><Input value={formData.billCode} onChange={e => setFormData({ ...formData, billCode: e.target.value })} /></div>
          <div><Label>Paese</Label><Input value={formData.billCountry} onChange={e => setFormData({ ...formData, billCountry: e.target.value })} /></div>
        </div>
      </TabsContent>
      <TabsContent value="spedizione" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Via</Label><Input value={formData.shipStreet} onChange={e => setFormData({ ...formData, shipStreet: e.target.value })} /></div>
          <div><Label>Casella Postale</Label><Input value={formData.shipPoBox} onChange={e => setFormData({ ...formData, shipPoBox: e.target.value })} /></div>
          <div><Label>Città</Label><Input value={formData.shipCity} onChange={e => setFormData({ ...formData, shipCity: e.target.value })} /></div>
          <div><Label>Provincia</Label><Input value={formData.shipState} onChange={e => setFormData({ ...formData, shipState: e.target.value })} /></div>
          <div><Label>CAP</Label><Input value={formData.shipCode} onChange={e => setFormData({ ...formData, shipCode: e.target.value })} /></div>
          <div><Label>Paese</Label><Input value={formData.shipCountry} onChange={e => setFormData({ ...formData, shipCountry: e.target.value })} /></div>
        </div>
      </TabsContent>
      <TabsContent value="note" className="space-y-4 mt-4">
        <div><Label>Termini e Condizioni</Label><Textarea value={formData.termsConditions} onChange={e => setFormData({ ...formData, termsConditions: e.target.value })} rows={4} /></div>
        <div><Label>Descrizione</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={4} /></div>
      </TabsContent>
    </Tabs>
  )

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" />Ordini di Vendita</h1>
            <p className="text-muted-foreground">{totalCount} ordini totali</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm }); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nuovo Ordine
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti gli stati</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={invoiceStatusFilter} onValueChange={v => { setInvoiceStatusFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Stato fattura" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti</SelectItem>{INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Oggetto</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Contatto</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Fatturazione</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Preventivo</TableHead>
                <TableHead>Assegnato a</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nessun ordine trovato</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  <TableCell className="font-mono text-sm">{item.orderNumber}</TableCell>
                  <TableCell className="font-medium">{item.subject}</TableCell>
                  <TableCell>{item.organization?.name || "-"}</TableCell>
                  <TableCell>{item.contact?.name || "-"}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge></TableCell>
                  <TableCell>{item.invoiceStatus || "-"}</TableCell>
                  <TableCell>{formatDate(item.dueDate)}</TableCell>
                  <TableCell>
                    {item.quote ? (
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={e => { e.stopPropagation(); navigate("/vt-quotes") }}>
                        {item.quote.quoteNumber}
                      </Button>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{item.assignedTo ? `${item.assignedTo.firstName || ""} ${item.assignedTo.lastName || ""}`.trim() || item.assignedTo.username : "-"}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(item); setIsPreviewOpen(true) }}><Eye className="mr-2 h-4 w-4" />Visualizza</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(item)}><Edit className="mr-2 h-4 w-4" />Modifica</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(item); setIsDeleteOpen(true) }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pagina {currentPage} di {totalPages} ({totalCount} risultati)</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => loadData(currentPage - 1)}>Precedente</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => loadData(currentPage + 1)}>Successivo</Button>
            </div>
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuovo Ordine</DialogTitle><DialogDescription>Crea un nuovo ordine di vendita.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Modifica Ordine</DialogTitle><DialogDescription>Modifica i dati dell'ordine.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
              <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{selected?.orderNumber}</DialogTitle><DialogDescription>Dettagli ordine</DialogDescription></DialogHeader>
            {selected && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Oggetto:</span> {selected.subject}</div>
                <div><span className="font-medium">Stato:</span> <Badge className={STATUS_COLORS[selected.status] || ""}>{selected.status}</Badge></div>
                <div><span className="font-medium">Organizzazione:</span> {selected.organization?.name || "-"}</div>
                <div><span className="font-medium">Contatto:</span> {selected.contact?.name || "-"}</div>
                <div><span className="font-medium">Fatturazione:</span> {selected.invoiceStatus || "-"}</div>
                <div><span className="font-medium">Scadenza:</span> {formatDate(selected.dueDate)}</div>
                <div><span className="font-medium">Preventivo:</span> {selected.quote?.quoteNumber || "-"}</div>
                <div><span className="font-medium">N. Cliente:</span> {selected.customerNumber || "-"}</div>
                <div><span className="font-medium">Corriere:</span> {selected.carrier || "-"}</div>
                <div><span className="font-medium">Ricorrente:</span> {selected.enableRecurring ? `Si (${selected.recurringFreq})` : "No"}</div>
                {selected.description && <div className="col-span-2"><span className="font-medium">Descrizione:</span><p className="mt-1 whitespace-pre-wrap">{selected.description}</p></div>}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Chiudi</Button>
              <Button onClick={() => { setIsPreviewOpen(false); if (selected) openEdit(selected) }}>Modifica</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare l'ordine?</AlertDialogTitle>
              <AlertDialogDescription>L'ordine "{selected?.orderNumber}" verrà eliminato permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </BaseLayout>
  )
}
