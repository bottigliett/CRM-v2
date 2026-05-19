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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, MoreHorizontal, Edit, Trash2, Loader2, Eye, FileSignature, TrendingUp, AlertTriangle,
} from "lucide-react"
import { serviceContractsAPI, type ServiceContract } from "@/lib/service-contracts-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { userPreferencesAPI } from "@/lib/user-preferences-api"
import { toast } from "sonner"
import { TablePagination } from "@/components/ui/table-pagination"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"

const PAGE_NAME = "service-contracts"

const DEFAULT_COLUMNS: ToggleColumnDef[] = [
  { id: "contractNumber",  label: "Numero" },
  { id: "contractType",    label: "Tipo" },
  { id: "organization",    label: "Organizzazione" },
  { id: "status",          label: "Stato" },
  { id: "contractValue",   label: "Valore" },
  { id: "startDate",       label: "Data inizio" },
  { id: "nextInvoiceDate", label: "Prossima fattura" },
  { id: "isConsultecno",   label: "Consultecno" },
  { id: "subject",         label: "Info aggiuntive" },
]

const DEFAULT_VISIBLE_IDS = new Set([
  "contractNumber", "contractType", "organization", "status",
  "contractValue", "startDate", "nextInvoiceDate",
])

const STATUSES = ["Attivo", "In attesa fatturazione", "Scaduto", "Non attivo", "Blocco Amministrativo", "In attesa pagamento"]
const CONTRACT_TYPES = ["TECNOCASA ESTESO", "TECNOCASA BASE", "HOSTING", "SERVER", "ALTRO"]

const STATUS_COLORS: Record<string, string> = {
  "Attivo":                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Scaduto":                 "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Non attivo":              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  "In attesa fatturazione":  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Blocco Amministrativo":   "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "In attesa pagamento":     "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

const emptyForm: any = {
  contractType: "", status: "Attivo", organizationId: "",
  contractValue: "", startDate: "", nextInvoiceDate: "",
  isConsultecno: false, subject: "",
}

export default function ServiceContractsPage() {
  const [items, setItems] = useState<ServiceContract[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState<any>(null)
  const [limit, setLimit] = useState(20)

  const SELECT_FILTER_COLS = new Set(["status", "contractType", "isConsultecno"])
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

  const [columns, setColumns] = useState<ToggleColumnDef[]>(DEFAULT_COLUMNS)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, DEFAULT_VISIBLE_IDS.has(c.id)]))
  )
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const defaultVis = Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, DEFAULT_VISIBLE_IDS.has(c.id)]))

    const applyOrder = (order: string[]) => [
      ...order.map(id => DEFAULT_COLUMNS.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[],
      ...DEFAULT_COLUMNS.filter(c => !order.includes(c.id)),
    ]
    const mergeVis = (saved: Record<string, boolean>) => ({ ...defaultVis, ...saved })

    // Fast path: localStorage
    const savedOrder = localStorage.getItem(`crm_col_order_${PAGE_NAME}`)
    const savedVis   = localStorage.getItem(`crm_col_vis_${PAGE_NAME}`)
    if (savedOrder) { try { setColumns(applyOrder(JSON.parse(savedOrder))) } catch {} }
    if (savedVis)   { try { setVisibleColumns(mergeVis(JSON.parse(savedVis))) } catch {} }

    // DB sync
    userPreferencesAPI.getUserPreferences(PAGE_NAME)
      .then(prefs => {
        if (!prefs) return
        if (prefs.columnOrder) {
          try {
            const order: string[] = JSON.parse(prefs.columnOrder)
            setColumns(applyOrder(order))
            localStorage.setItem(`crm_col_order_${PAGE_NAME}`, prefs.columnOrder)
          } catch {}
        }
        if (prefs.columnVisibility) {
          try {
            const merged = mergeVis(JSON.parse(prefs.columnVisibility))
            setVisibleColumns(merged)
            localStorage.setItem(`crm_col_vis_${PAGE_NAME}`, JSON.stringify(merged))
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  const persistPreferences = useCallback((cols: ToggleColumnDef[], vis: Record<string, boolean>) => {
    localStorage.setItem(`crm_col_order_${PAGE_NAME}`, JSON.stringify(cols.map(c => c.id)))
    localStorage.setItem(`crm_col_vis_${PAGE_NAME}`, JSON.stringify(vis))
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      userPreferencesAPI.saveUserPreferences(PAGE_NAME, {
        columnOrder: cols.map(c => c.id),
        columnVisibility: vis,
      }).catch(() => {})
    }, 600)
  }, [])

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => {
      const next = { ...prev, [columnId]: !prev[columnId] }
      persistPreferences(columns, next)
      return next
    })
  }

  const handleReorder = (newOrder: string[]) => {
    const reordered = [
      ...newOrder.map(id => columns.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[],
      ...columns.filter(c => !newOrder.includes(c.id)),
    ]
    setColumns(reordered)
    persistPreferences(reordered, visibleColumns)
  }

  const isColVisible = (columnId: string) => visibleColumns[columnId] === true

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selected, setSelected] = useState<ServiceContract | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })
  const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 })
      .then(r => setOrgs(r.data.organizations.map((o: any) => ({ id: o.id, name: o.denomination || o.name }))))
      .catch(() => {})
  }, [])

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const f = debouncedFilters
      const response = await serviceContractsAPI.getAll({
        page, limit,
        status: f.status || undefined,
        includeStats: "true",
        contractNumber: f.contractNumber || undefined,
        contractType: f.contractType || undefined,
        orgName: f.organization || undefined,
        subject: f.subject || undefined,
        startDateFrom: f.startDate || undefined,
        nextInvoiceDateFrom: f.nextInvoiceDate || undefined,
        isConsultecno: f.isConsultecno || undefined,
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
  }, [debouncedFilters, limit])

  useEffect(() => {
    loadData()
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
      contractType:    item.contractType    || "",
      status:          item.status,
      organizationId:  item.organizationId?.toString() || "",
      contractValue:   item.contractValue?.toString()  || "",
      startDate:       item.startDate       ? new Date(item.startDate).toISOString().split("T")[0]       : "",
      nextInvoiceDate: item.nextInvoiceDate ? new Date(item.nextInvoiceDate).toISOString().split("T")[0] : "",
      isConsultecno:   item.isConsultecno,
      subject:         item.subject || "",
    })
    setIsEditOpen(true)
  }

  const formatDate     = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"
  const formatCurrency = (v: number | null) =>
    v != null ? `€ ${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "-"

  const renderForm = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo contratto</Label>
          <Select value={formData.contractType} onValueChange={v => setFormData({ ...formData, contractType: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
          <Select value={formData.organizationId} onValueChange={v => setFormData({ ...formData, organizationId: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>
              {orgs.map(o => <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Valore (EUR)</Label>
          <Input
            type="number" step="0.01"
            value={formData.contractValue}
            onChange={e => setFormData({ ...formData, contractValue: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data inizio</Label>
          <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
        </div>
        <div>
          <Label>Data prossima fattura</Label>
          <Input type="date" value={formData.nextInvoiceDate} onChange={e => setFormData({ ...formData, nextInvoiceDate: e.target.value })} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox" id="isConsultecno"
          checked={formData.isConsultecno}
          onChange={e => setFormData({ ...formData, isConsultecno: e.target.checked })}
        />
        <Label htmlFor="isConsultecno">Contratto Consultecno</Label>
      </div>

      <div>
        <Label>Informazioni aggiuntive</Label>
        <Textarea
          value={formData.subject}
          onChange={e => setFormData({ ...formData, subject: e.target.value })}
          rows={3}
          placeholder="Note, annotazioni, informazioni aggiuntive..."
        />
      </div>
    </div>
  )

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="h-6 w-6" />Contratti di Servizio
            </h1>
            <p className="text-muted-foreground">{totalCount} contratti totali</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm }); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nuovo Contratto
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Contratti Attivi</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{stats.activeContracts}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-4 w-4" />Valore Totale</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4" />In Scadenza (30gg)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{stats.expiringSoon}</p></CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center gap-4">
          <ColumnToggle columns={columns} visibleColumns={visibleColumns} onToggle={toggleColumn} onReorder={handleReorder} />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isColVisible("contractNumber")  && <TableHead>Numero</TableHead>}
                {isColVisible("contractType")    && <TableHead>Tipo</TableHead>}
                {isColVisible("organization")    && <TableHead>Organizzazione</TableHead>}
                {isColVisible("status")          && <TableHead>Stato</TableHead>}
                {isColVisible("contractValue")   && <TableHead>Valore</TableHead>}
                {isColVisible("startDate")       && <TableHead>Data inizio</TableHead>}
                {isColVisible("nextInvoiceDate") && <TableHead>Prossima fattura</TableHead>}
                {isColVisible("isConsultecno")   && <TableHead>Consultecno</TableHead>}
                {isColVisible("subject")         && <TableHead>Info aggiuntive</TableHead>}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
              <TableRow>
                {isColVisible("contractNumber")  && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Numero..." value={columnFilters.contractNumber || ""} onChange={e => updateColumnFilter("contractNumber", e.target.value)} /></TableHead>}
                {isColVisible("contractType")    && <TableHead className="p-1"><Select value={columnFilters.contractType || ""} onValueChange={v => updateColumnFilter("contractType", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></TableHead>}
                {isColVisible("organization")    && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Organizzazione..." value={columnFilters.organization || ""} onChange={e => updateColumnFilter("organization", e.target.value)} /></TableHead>}
                {isColVisible("status")          && <TableHead className="p-1"><Select value={columnFilters.status || ""} onValueChange={v => updateColumnFilter("status", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableHead>}
                {isColVisible("contractValue")   && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Valore..." value={columnFilters.contractValue || ""} onChange={e => updateColumnFilter("contractValue", e.target.value)} /></TableHead>}
                {isColVisible("startDate")       && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="gg/mm/aaaa" value={columnFilters.startDate || ""} onChange={e => updateColumnFilter("startDate", e.target.value)} /></TableHead>}
                {isColVisible("nextInvoiceDate") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="gg/mm/aaaa" value={columnFilters.nextInvoiceDate || ""} onChange={e => updateColumnFilter("nextInvoiceDate", e.target.value)} /></TableHead>}
                {isColVisible("isConsultecno")   && <TableHead className="p-1"><Select value={columnFilters.isConsultecno || ""} onValueChange={v => updateColumnFilter("isConsultecno", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tutti" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem><SelectItem value="true">Si</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></TableHead>}
                {isColVisible("subject")         && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Info..." value={columnFilters.subject || ""} onChange={e => updateColumnFilter("subject", e.target.value)} /></TableHead>}
                <TableHead className="w-[50px] p-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={DEFAULT_COLUMNS.length + 1} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={DEFAULT_COLUMNS.length + 1} className="text-center py-8 text-muted-foreground">
                    Nessun contratto trovato
                  </TableCell>
                </TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  {isColVisible("contractNumber")  && <TableCell className="font-mono text-sm">{item.contractNumber}</TableCell>}
                  {isColVisible("contractType")    && <TableCell>{item.contractType || "-"}</TableCell>}
                  {isColVisible("organization")    && <TableCell>{item.organization?.name || "-"}</TableCell>}
                  {isColVisible("status")          && <TableCell><Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge></TableCell>}
                  {isColVisible("contractValue")   && <TableCell>{formatCurrency(item.contractValue)}</TableCell>}
                  {isColVisible("startDate")       && <TableCell>{formatDate(item.startDate)}</TableCell>}
                  {isColVisible("nextInvoiceDate") && <TableCell>{formatDate(item.nextInvoiceDate)}</TableCell>}
                  {isColVisible("isConsultecno")   && <TableCell><Badge variant={item.isConsultecno ? "default" : "secondary"}>{item.isConsultecno ? "Si" : "No"}</Badge></TableCell>}
                  {isColVisible("subject")         && <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">{item.subject || "-"}</TableCell>}
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                          <Eye className="mr-2 h-4 w-4" />Visualizza
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(item)}>
                          <Edit className="mr-2 h-4 w-4" />Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(item); setIsDeleteOpen(true) }} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />Elimina
                        </DropdownMenuItem>
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

        {/* Create */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuovo Contratto</DialogTitle>
              <DialogDescription>Crea un nuovo contratto di servizio.</DialogDescription>
            </DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Contratto — {selected?.contractNumber}</DialogTitle>
              <DialogDescription>Modifica i dati del contratto.</DialogDescription>
            </DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected?.contractNumber}</DialogTitle>
              <DialogDescription>Dettagli contratto</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><span className="font-medium text-muted-foreground">Tipo:</span><br />{selected.contractType || "-"}</div>
                <div><span className="font-medium text-muted-foreground">Stato:</span><br /><Badge className={STATUS_COLORS[selected.status] || ""}>{selected.status}</Badge></div>
                <div><span className="font-medium text-muted-foreground">Organizzazione:</span><br />{selected.organization?.name || "-"}</div>
                <div><span className="font-medium text-muted-foreground">Valore:</span><br />{formatCurrency(selected.contractValue)}</div>
                <div><span className="font-medium text-muted-foreground">Data inizio:</span><br />{formatDate(selected.startDate)}</div>
                <div><span className="font-medium text-muted-foreground">Prossima fattura:</span><br />{formatDate(selected.nextInvoiceDate)}</div>
                <div><span className="font-medium text-muted-foreground">Consultecno:</span><br />{selected.isConsultecno ? "Si" : "No"}</div>
                {selected.subject && (
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">Informazioni aggiuntive:</span>
                    <p className="mt-1 whitespace-pre-wrap">{selected.subject}</p>
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

        {/* Delete */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare il contratto?</AlertDialogTitle>
              <AlertDialogDescription>
                Il contratto "{selected?.contractNumber}" verrà eliminato permanentemente.
              </AlertDialogDescription>
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
