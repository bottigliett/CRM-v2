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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Eye, FileSignature, TrendingUp, AlertTriangle,
} from "lucide-react"
import { serviceContractsAPI, type ServiceContract } from "@/lib/service-contracts-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { toast } from "sonner"

const STATUSES = ["Attivo", "In attesa fatturazione", "Scaduto", "Non attivo", "Blocco Amministrativo", "In attesa pagamento"]
const FREQUENCIES = ["Mensile", "Bimestrale", "Trimestrale", "Semestrale", "Annuale"]
const TRACKING_UNITS = ["Hours", "Days", "Incidents"]

const STATUS_COLORS: Record<string, string> = {
  "Attivo": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Scaduto": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Non attivo": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  "In attesa fatturazione": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Blocco Amministrativo": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "In attesa pagamento": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

const emptyForm: any = {
  subject: "", contractType: "", status: "Attivo", frequency: "", contractValue: "",
  startDate: "", dueDate: "", nextInvoiceDate: "", organizationId: "", assignedToId: "",
  isConsultecno: false, isPaid: false, invoiceRef: "", trackingUnit: "",
  totalUnits: "", usedUnits: "", priority: "", description: "",
}

export default function ServiceContractsPage() {
  const [items, setItems] = useState<ServiceContract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState<any>(null)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selected, setSelected] = useState<ServiceContract | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })
  const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 }).then(r => setOrgs(r.data.organizations.map((o: any) => ({ id: o.id, name: o.name })))).catch(() => {})
  }, [])

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const response = await serviceContractsAPI.getAll({
        page, limit: 20, search: searchQuery,
        status: statusFilter || undefined,
        includeStats: "true",
      })
      setItems(response.data.contracts)
      setCurrentPage(response.data.pagination.page)
      setTotalPages(response.data.pagination.totalPages)
      setTotalCount(response.data.pagination.total)
      setStats(response.data.statistics)
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => loadData(), searchQuery ? 500 : 0)
    return () => clearTimeout(timer)
  }, [loadData])

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      await serviceContractsAPI.create(formData)
      toast.success("Contratto creato con successo!")
      setIsCreateOpen(false)
      setFormData({ ...emptyForm })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleEdit = async () => {
    if (!selected) return
    try {
      setSubmitting(true)
      await serviceContractsAPI.update(selected.id, formData)
      toast.success("Contratto aggiornato!")
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
      await serviceContractsAPI.delete(selected.id)
      toast.success("Contratto eliminato!")
      setIsDeleteOpen(false)
      setSelected(null)
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const openEdit = (item: ServiceContract) => {
    setSelected(item)
    setFormData({
      subject: item.subject || "", contractType: item.contractType || "",
      status: item.status, frequency: item.frequency || "",
      contractValue: item.contractValue?.toString() || "",
      startDate: item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : "",
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "",
      nextInvoiceDate: item.nextInvoiceDate ? new Date(item.nextInvoiceDate).toISOString().split("T")[0] : "",
      organizationId: item.organizationId?.toString() || "",
      assignedToId: item.assignedToId?.toString() || "",
      isConsultecno: item.isConsultecno, isPaid: item.isPaid,
      invoiceRef: item.invoiceRef || "", trackingUnit: item.trackingUnit || "",
      totalUnits: item.totalUnits?.toString() || "", usedUnits: item.usedUnits?.toString() || "",
      priority: item.priority || "", description: item.description || "",
    })
    setIsEditOpen(true)
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"
  const formatCurrency = (v: number | null) => v != null ? `€ ${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "-"

  const renderForm = () => (
    <div className="space-y-5">
      <div>
        <Label>Soggetto</Label>
        <Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Contratto</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Stato</Label>
            <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Tipo contratto</Label><Input value={formData.contractType} onChange={e => setFormData({ ...formData, contractType: e.target.value })} placeholder="AT98, Hosting, ..." /></div>
          <div>
            <Label>Frequenza</Label>
            <Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Economica</p>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Valore (EUR)</Label><Input type="number" step="0.01" value={formData.contractValue} onChange={e => setFormData({ ...formData, contractValue: e.target.value })} /></div>
          <div>
            <Label>Organizzazione</Label>
            <Select value={formData.organizationId} onValueChange={v => setFormData({ ...formData, organizationId: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Rif. Fattura</Label><Input value={formData.invoiceRef} onChange={e => setFormData({ ...formData, invoiceRef: e.target.value })} /></div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Date</p>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Data inizio</Label><Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
          <div><Label>Scadenza</Label><Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} /></div>
          <div><Label>Prossima fattura</Label><Input type="date" value={formData.nextInvoiceDate} onChange={e => setFormData({ ...formData, nextInvoiceDate: e.target.value })} /></div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Tracking</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Unità tracking</Label>
            <Select value={formData.trackingUnit} onValueChange={v => setFormData({ ...formData, trackingUnit: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{TRACKING_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Unità totali</Label><Input type="number" value={formData.totalUnits} onChange={e => setFormData({ ...formData, totalUnits: e.target.value })} /></div>
          <div><Label>Unità usate</Label><Input type="number" value={formData.usedUnits} onChange={e => setFormData({ ...formData, usedUnits: e.target.value })} /></div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-2">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={formData.isConsultecno} onChange={e => setFormData({ ...formData, isConsultecno: e.target.checked })} id="isConsultecno" />
          <Label htmlFor="isConsultecno">Consultecno</Label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={formData.isPaid} onChange={e => setFormData({ ...formData, isPaid: e.target.checked })} id="isPaid" />
          <Label htmlFor="isPaid">Pagato</Label>
        </div>
      </div>

      <div><Label>Descrizione</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
    </div>
  )

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="h-6 w-6" />Contratti di Servizio</h1>
            <p className="text-muted-foreground">{totalCount} contratti totali</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm }); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nuovo Contratto
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Contratti Attivi</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.activeContracts}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" />Valore Totale</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4" />In Scadenza (30gg)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.expiringSoon}</p></CardContent></Card>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti gli stati</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Soggetto</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Frequenza</TableHead>
                <TableHead>Valore</TableHead>
                <TableHead>Inizio</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Pagato</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nessun contratto trovato</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  <TableCell className="font-mono text-sm">{item.contractNumber}</TableCell>
                  <TableCell className="font-medium">{item.subject || "-"}</TableCell>
                  <TableCell>{item.organization?.name || "-"}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge></TableCell>
                  <TableCell>{item.contractType || "-"}</TableCell>
                  <TableCell>{item.frequency || "-"}</TableCell>
                  <TableCell>{formatCurrency(item.contractValue)}</TableCell>
                  <TableCell>{formatDate(item.startDate)}</TableCell>
                  <TableCell>{formatDate(item.dueDate)}</TableCell>
                  <TableCell><Badge variant={item.isPaid ? "default" : "secondary"}>{item.isPaid ? "Si" : "No"}</Badge></TableCell>
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
            <DialogHeader><DialogTitle>Nuovo Contratto</DialogTitle><DialogDescription>Crea un nuovo contratto di servizio.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Modifica Contratto</DialogTitle><DialogDescription>Modifica i dati del contratto.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
              <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{selected?.contractNumber}</DialogTitle><DialogDescription>Dettagli contratto</DialogDescription></DialogHeader>
            {selected && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Soggetto:</span> {selected.subject || "-"}</div>
                <div><span className="font-medium">Stato:</span> <Badge className={STATUS_COLORS[selected.status] || ""}>{selected.status}</Badge></div>
                <div><span className="font-medium">Organizzazione:</span> {selected.organization?.name || "-"}</div>
                <div><span className="font-medium">Tipo:</span> {selected.contractType || "-"}</div>
                <div><span className="font-medium">Frequenza:</span> {selected.frequency || "-"}</div>
                <div><span className="font-medium">Valore:</span> {formatCurrency(selected.contractValue)}</div>
                <div><span className="font-medium">Data inizio:</span> {formatDate(selected.startDate)}</div>
                <div><span className="font-medium">Scadenza:</span> {formatDate(selected.dueDate)}</div>
                <div><span className="font-medium">Prossima fattura:</span> {formatDate(selected.nextInvoiceDate)}</div>
                <div><span className="font-medium">Pagato:</span> {selected.isPaid ? "Si" : "No"}</div>
                <div><span className="font-medium">Consultecno:</span> {selected.isConsultecno ? "Si" : "No"}</div>
                <div><span className="font-medium">Rif. Fattura:</span> {selected.invoiceRef || "-"}</div>
                {selected.description && <div className="col-span-2"><span className="font-medium">Descrizione:</span> {selected.description}</div>}
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
              <AlertDialogTitle>Eliminare il contratto?</AlertDialogTitle>
              <AlertDialogDescription>Il contratto "{selected?.contractNumber}" verrà eliminato permanentemente.</AlertDialogDescription>
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
