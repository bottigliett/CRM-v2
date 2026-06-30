"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
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
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Plus, MoreHorizontal, Edit, Trash2, Loader2, Eye, ShoppingCart,
  ChevronsUpDown, Check,
} from "lucide-react"
import { salesOrdersAPI, type SalesOrder } from "@/lib/sales-orders-api"
import { vtQuotesAPI, type VtQuoteItem } from "@/lib/vt-quotes-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { toast } from "sonner"
import { TablePagination } from "@/components/ui/table-pagination"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"

const COLUMNS: ToggleColumnDef[] = [
  { id: "orderNumber", label: "Numero" },
  { id: "subject", label: "Oggetto" },
  { id: "organization", label: "Organizzazione" },
  { id: "status", label: "Stato" },
  { id: "invoiceStatus", label: "Fatturazione" },
  { id: "dueDate", label: "Scadenza" },
  { id: "quote", label: "Preventivo" },
  { id: "assignedTo", label: "Assegnato a" },
]

const STATUSES = ["Creato", "Approvato", "Cancellato", "Installazione Programmata", "Consegnato"]
const INVOICE_STATUSES = ["Da Fatturare", "Non Fatturato", "Fatturato"]

const STATUS_COLORS: Record<string, string> = {
  "Creato": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Approvato": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Cancellato": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Installazione Programmata": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Consegnato": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

const emptyForm: any = {
  subject: "", organizationId: "", contactId: "", quoteId: "", assignedToId: "",
  invoiceStatus: "Da Fatturare", dueDate: "",
  status: "Creato",
  termsConditions: "", description: "",
}

export default function SalesOrdersPage() {
  const [items, setItems] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [limit, setLimit] = useState(20)

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})
  const toggleColumn = (columnId: string) => setVisibleColumns(prev => ({ ...prev, [columnId]: prev[columnId] === false ? true : false }))
  const isColVisible = (columnId: string) => visibleColumns[columnId] !== false

  const SELECT_FILTER_COLS = new Set(["status", "invoiceStatus"])
  const updateColumnFilter = useCallback((colId: string, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev, [colId]: value }
      if (SELECT_FILTER_COLS.has(colId)) {
        setDebouncedFilters(d => ({ ...d, [colId]: value }))
        setCurrentPage(1)
      } else {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          setDebouncedFilters(d => ({ ...d, [colId]: value }))
          setCurrentPage(1)
        }, 500)
      }
      return next
    })
  }, [])

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selected, setSelected] = useState<SalesOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })
  const [orgs, setOrgs] = useState<{ id: number; name: string; denomination: string }[]>([])
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false)
  const [quoteItems, setQuoteItems] = useState<VtQuoteItem[]>([])

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 })
      .then(r => setOrgs(r.data.organizations.map((o: any) => ({
        id: o.id,
        name: o.name,
        denomination: o.denomination || "",
      })))).catch(() => {})
  }, [])

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const f = debouncedFilters
      const response = await salesOrdersAPI.getAll({
        page, limit,
        status: f.status || undefined,
        invoiceStatus: f.invoiceStatus || undefined,
        orderNumber: f.orderNumber || undefined,
        subject: f.subject || undefined,
        orgName: f.organization || undefined,
        assignedTo: f.assignedTo || undefined,
        quoteNumber: f.quote || undefined,
        dueDateFrom: f.dueDate || undefined,
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
  }, [debouncedFilters, limit])

  useEffect(() => { loadData() }, [loadData])

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
      subject: item.subject,
      organizationId: item.organizationId?.toString() || "",
      contactId: item.contactId?.toString() || "",
      quoteId: item.quoteId?.toString() || "",
      assignedToId: item.assignedToId?.toString() || "",
      invoiceStatus: item.invoiceStatus || "",
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "",
      status: item.status,
      termsConditions: item.termsConditions || "",
      description: item.description || "",
    })
    setIsEditOpen(true)
  }

  const openPreview = async (item: SalesOrder) => {
    setSelected(item)
    setQuoteItems([])
    setIsPreviewOpen(true)
    if (item.quoteId) {
      try {
        const res = await vtQuotesAPI.getById(item.quoteId)
        setQuoteItems(res.data?.items || [])
      } catch {}
    }
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"

  const getSelectedOrgLabel = () => {
    if (!formData.organizationId) return "Seleziona..."
    const org = orgs.find(o => o.id.toString() === formData.organizationId)
    if (!org) return "Seleziona..."
    return org.denomination || org.name
  }

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Oggetto *</Label><Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} /></div>
        <div>
          <Label>Stato</Label>
          <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Organizzazione</Label>
          <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                <span className="truncate">{getSelectedOrgLabel()}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cerca organizzazione..." />
                <CommandList>
                  <CommandEmpty>Nessuna organizzazione trovata.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => { setFormData({ ...formData, organizationId: "" }); setOrgPopoverOpen(false) }}>
                      <Check className={cn("mr-2 h-4 w-4", !formData.organizationId ? "opacity-100" : "opacity-0")} />
                      <span className="text-muted-foreground italic">Nessuna</span>
                    </CommandItem>
                    {orgs.map(o => (
                      <CommandItem
                        key={o.id}
                        value={`${o.denomination} ${o.name}`}
                        onSelect={() => { setFormData({ ...formData, organizationId: o.id.toString() }); setOrgPopoverOpen(false) }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", formData.organizationId === o.id.toString() ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span>{o.denomination || o.name}</span>
                          {o.denomination && <span className="text-xs text-muted-foreground">{o.name}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>Stato fatturazione</Label>
          <Select value={formData.invoiceStatus} onValueChange={v => setFormData({ ...formData, invoiceStatus: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>{INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Scadenza</Label><Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} /></div>
      </div>
      <Separator />
      <div><Label>Termini e Condizioni</Label><Textarea value={formData.termsConditions} onChange={e => setFormData({ ...formData, termsConditions: e.target.value })} rows={3} /></div>
      <div><Label>Descrizione</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
    </div>
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
          <ColumnToggle columns={COLUMNS} visibleColumns={visibleColumns} onToggle={toggleColumn} />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isColVisible("orderNumber") && <TableHead>Numero</TableHead>}
                {isColVisible("subject") && <TableHead>Oggetto</TableHead>}
                {isColVisible("organization") && <TableHead>Organizzazione</TableHead>}
                {isColVisible("status") && <TableHead>Stato</TableHead>}
                {isColVisible("invoiceStatus") && <TableHead>Fatturazione</TableHead>}
                {isColVisible("dueDate") && <TableHead>Scadenza</TableHead>}
                {isColVisible("quote") && <TableHead>Preventivo</TableHead>}
                {isColVisible("assignedTo") && <TableHead>Assegnato a</TableHead>}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
              <TableRow>
                {isColVisible("orderNumber") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Numero..." value={columnFilters.orderNumber || ""} onChange={e => updateColumnFilter("orderNumber", e.target.value)} /></TableHead>}
                {isColVisible("subject") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Oggetto..." value={columnFilters.subject || ""} onChange={e => updateColumnFilter("subject", e.target.value)} /></TableHead>}
                {isColVisible("organization") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Organizzazione..." value={columnFilters.organization || ""} onChange={e => updateColumnFilter("organization", e.target.value)} /></TableHead>}
                {isColVisible("status") && <TableHead className="p-1"><Select value={columnFilters.status || ""} onValueChange={v => updateColumnFilter("status", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableHead>}
                {isColVisible("invoiceStatus") && <TableHead className="p-1"><Select value={columnFilters.invoiceStatus || ""} onValueChange={v => updateColumnFilter("invoiceStatus", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Fattura" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableHead>}
                {isColVisible("dueDate") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="gg/mm/aaaa" value={columnFilters.dueDate || ""} onChange={e => updateColumnFilter("dueDate", e.target.value)} /></TableHead>}
                {isColVisible("quote") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Preventivo..." value={columnFilters.quote || ""} onChange={e => updateColumnFilter("quote", e.target.value)} /></TableHead>}
                {isColVisible("assignedTo") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Assegnato a..." value={columnFilters.assignedTo || ""} onChange={e => updateColumnFilter("assignedTo", e.target.value)} /></TableHead>}
                <TableHead className="w-[50px] p-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center py-8 text-muted-foreground">Nessun ordine trovato</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => openPreview(item)}>
                  {isColVisible("orderNumber") && <TableCell className="font-mono text-sm">{item.orderNumber}</TableCell>}
                  {isColVisible("subject") && <TableCell className="font-medium">{item.subject}</TableCell>}
                  {isColVisible("organization") && <TableCell>{item.organization?.name || "-"}</TableCell>}
                  {isColVisible("status") && <TableCell><Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge></TableCell>}
                  {isColVisible("invoiceStatus") && <TableCell>{item.invoiceStatus || "-"}</TableCell>}
                  {isColVisible("dueDate") && <TableCell>{formatDate(item.dueDate)}</TableCell>}
                  {isColVisible("quote") && <TableCell>{item.quote?.quoteNumber || "-"}</TableCell>}
                  {isColVisible("assignedTo") && <TableCell>{item.assignedTo ? `${item.assignedTo.firstName || ""} ${item.assignedTo.lastName || ""}`.trim() || item.assignedTo.username : "-"}</TableCell>}
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPreview(item)}><Eye className="mr-2 h-4 w-4" />Visualizza</DropdownMenuItem>
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

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          limit={limit}
          onPageChange={(page) => loadData(page)}
          onLimitChange={(newLimit) => { setLimit(newLimit); setCurrentPage(1) }}
        />

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuovo Ordine</DialogTitle><DialogDescription>Crea un nuovo ordine di vendita.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Oggetto:</span> {selected.subject}</div>
                  <div><span className="font-medium">Stato:</span> <Badge className={STATUS_COLORS[selected.status] || ""}>{selected.status}</Badge></div>
                  <div><span className="font-medium">Organizzazione:</span> {selected.organization?.name || "-"}</div>
                  <div><span className="font-medium">Fatturazione:</span> {selected.invoiceStatus || "-"}</div>
                  <div><span className="font-medium">Scadenza:</span> {formatDate(selected.dueDate)}</div>
                  <div><span className="font-medium">Preventivo collegato:</span> {selected.quote?.quoteNumber || "-"}</div>
                  {selected.description && <div className="col-span-2"><span className="font-medium">Descrizione:</span><p className="mt-1 whitespace-pre-wrap">{selected.description}</p></div>}
                </div>

                {quoteItems.length > 0 && (
                  <div>
                    <Separator />
                    <p className="text-sm font-medium mt-3 mb-2">Articoli dal preventivo</p>
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium">Voce</th>
                            <th className="text-center p-2 font-medium w-16">Qtà</th>
                            <th className="text-right p-2 font-medium w-28">Prezzo unit.</th>
                            <th className="text-right p-2 font-medium w-24">Totale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quoteItems.map((it, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{it.itemName}</td>
                              <td className="p-2 text-center">{it.quantity}</td>
                              <td className="p-2 text-right">€ {it.unitPrice.toFixed(2)}</td>
                              <td className="p-2 text-right font-medium">€ {it.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30 border-t">
                          <tr>
                            <td colSpan={3} className="p-2 text-right font-medium">Totale (+ IVA 22%)</td>
                            <td className="p-2 text-right font-bold">
                              € {(quoteItems.reduce((s, i) => s + i.total, 0) * 1.22).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
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
