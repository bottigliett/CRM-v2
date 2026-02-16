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
import {
  Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Eye, Headset,
} from "lucide-react"
import { helpdeskAPI, type HelpDeskTicket } from "@/lib/helpdesk-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { toast } from "sonner"

const STATUSES = ["Aperto", "In Corso", "In attesa risposta", "Chiuso"]
const PRIORITIES = ["Bloccante", "Principale", "Secondario"]
const CALL_TYPES = ["Atelier", "Browser", "Tecnico", "Gestionale", "Server", "Hardware", "Software", "Rete", "Altro"]
const ORIGINS = ["Telefono", "Whatsapp", "Email", "Di persona", "Portale"]
const CATEGORIES = ["Intervento on site", "Controllo Remoto", "Consulenza", "Manutenzione", "Altro"]

const STATUS_COLORS: Record<string, string> = {
  "Aperto": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "In Corso": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "In attesa risposta": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  "Chiuso": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

const emptyForm: any = {
  title: "", status: "Aperto", priority: "", callType: "", ticketOrigin: "", category: "",
  organizationId: "", contactId: "", assignedToId: "", description: "", solution: "",
  days: "", hours: "", keywords: "", technicianName: "",
}

export default function HelpDeskPage() {
  const [items, setItems] = useState<HelpDeskTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [callTypeFilter, setCallTypeFilter] = useState("")
  const [originFilter, setOriginFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selected, setSelected] = useState<HelpDeskTicket | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })
  const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 }).then(r => setOrgs(r.data.organizations.map((o: any) => ({ id: o.id, name: o.name })))).catch(() => {})
  }, [])

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const response = await helpdeskAPI.getAll({
        page, limit: 20, search: searchQuery,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        callType: callTypeFilter || undefined,
        ticketOrigin: originFilter || undefined,
      })
      setItems(response.data.tickets)
      setCurrentPage(response.data.pagination.page)
      setTotalPages(response.data.pagination.totalPages)
      setTotalCount(response.data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento")
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, priorityFilter, callTypeFilter, originFilter])

  useEffect(() => {
    const timer = setTimeout(() => loadData(), searchQuery ? 500 : 0)
    return () => clearTimeout(timer)
  }, [loadData])

  const handleCreate = async () => {
    if (!formData.title) { toast.error("Il titolo è obbligatorio"); return }
    try {
      setSubmitting(true)
      await helpdeskAPI.create(formData)
      toast.success("Ticket creato con successo!")
      setIsCreateOpen(false)
      setFormData({ ...emptyForm })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleEdit = async () => {
    if (!selected || !formData.title) { toast.error("Il titolo è obbligatorio"); return }
    try {
      setSubmitting(true)
      await helpdeskAPI.update(selected.id, formData)
      toast.success("Ticket aggiornato!")
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
      await helpdeskAPI.delete(selected.id)
      toast.success("Ticket eliminato!")
      setIsDeleteOpen(false)
      setSelected(null)
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const openEdit = (item: HelpDeskTicket) => {
    setSelected(item)
    setFormData({
      title: item.title, status: item.status, priority: item.priority || "",
      callType: item.callType || "", ticketOrigin: item.ticketOrigin || "",
      category: item.category || "", organizationId: item.organizationId?.toString() || "",
      contactId: item.contactId?.toString() || "", assignedToId: item.assignedToId?.toString() || "",
      description: item.description || "", solution: item.solution || "",
      days: item.days?.toString() || "", hours: item.hours?.toString() || "",
      keywords: item.keywords || "", technicianName: item.technicianName || "",
    })
    setIsEditOpen(true)
  }

  const renderForm = () => (
    <div className="space-y-5">
      <div>
        <Label>Titolo *</Label>
        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Info principali</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Stato</Label>
            <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priorità</Label>
            <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo chiamata</Label>
            <Select value={formData.callType} onValueChange={v => setFormData({ ...formData, callType: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{CALL_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Contesto</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Origine</Label>
            <Select value={formData.ticketOrigin} onValueChange={v => setFormData({ ...formData, ticketOrigin: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Organizzazione</Label>
            <Select value={formData.organizationId} onValueChange={v => setFormData({ ...formData, organizationId: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{orgs.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">Lavoro</p>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Tecnico</Label><Input value={formData.technicianName} onChange={e => setFormData({ ...formData, technicianName: e.target.value })} /></div>
          <div><Label>Giorni</Label><Input type="number" step="0.5" value={formData.days} onChange={e => setFormData({ ...formData, days: e.target.value })} /></div>
          <div><Label>Ore</Label><Input type="number" step="0.25" value={formData.hours} onChange={e => setFormData({ ...formData, hours: e.target.value })} /></div>
        </div>
      </div>

      <div><Label>Descrizione</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
      <div><Label>Soluzione</Label><Textarea value={formData.solution} onChange={e => setFormData({ ...formData, solution: e.target.value })} rows={3} /></div>
    </div>
  )

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Headset className="h-6 w-6" />Assistenza Clienti</h1>
            <p className="text-muted-foreground">{totalCount} ticket totali</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm }); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nuovo Ticket
          </Button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti gli stati</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Priorità" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutte le priorità</SelectItem>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={callTypeFilter} onValueChange={v => { setCallTypeFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti i tipi</SelectItem>{CALL_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Titolo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Priorità</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origine</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nessun ticket trovato</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  <TableCell className="font-mono text-sm">{item.ticketNumber}</TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge></TableCell>
                  <TableCell>{item.priority || "-"}</TableCell>
                  <TableCell>{item.callType || "-"}</TableCell>
                  <TableCell>{item.ticketOrigin || "-"}</TableCell>
                  <TableCell>{item.organization?.name || "-"}</TableCell>
                  <TableCell>{item.hours ? `${item.hours}h` : "-"}</TableCell>
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

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuovo Ticket</DialogTitle><DialogDescription>Crea un nuovo ticket di assistenza.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Modifica Ticket</DialogTitle><DialogDescription>Modifica i dati del ticket.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
              <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected?.ticketNumber} - {selected?.title}</DialogTitle>
              <DialogDescription>Dettagli ticket</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Stato:</span> <Badge className={STATUS_COLORS[selected.status] || ""}>{selected.status}</Badge></div>
                  <div><span className="font-medium">Priorità:</span> {selected.priority || "-"}</div>
                  <div><span className="font-medium">Tipo:</span> {selected.callType || "-"}</div>
                  <div><span className="font-medium">Origine:</span> {selected.ticketOrigin || "-"}</div>
                  <div><span className="font-medium">Categoria:</span> {selected.category || "-"}</div>
                  <div><span className="font-medium">Organizzazione:</span> {selected.organization?.name || "-"}</div>
                  <div><span className="font-medium">Contatto:</span> {selected.contact?.name || "-"}</div>
                  <div><span className="font-medium">Tecnico:</span> {selected.technicianName || "-"}</div>
                  <div><span className="font-medium">Giorni:</span> {selected.days || "-"}</div>
                  <div><span className="font-medium">Ore:</span> {selected.hours || "-"}</div>
                </div>
                {selected.description && <div><span className="font-medium text-sm">Descrizione:</span><p className="text-sm mt-1 whitespace-pre-wrap bg-muted p-3 rounded">{selected.description}</p></div>}
                {selected.solution && <div><span className="font-medium text-sm">Soluzione:</span><p className="text-sm mt-1 whitespace-pre-wrap bg-green-50 dark:bg-green-950 p-3 rounded">{selected.solution}</p></div>}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Chiudi</Button>
              <Button onClick={() => { setIsPreviewOpen(false); if (selected) openEdit(selected) }}>Modifica</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare il ticket?</AlertDialogTitle>
              <AlertDialogDescription>Il ticket "{selected?.ticketNumber}" verrà eliminato permanentemente.</AlertDialogDescription>
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
