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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, MoreHorizontal, Edit, Trash2, Loader2, Eye, FileText,
} from "lucide-react"
import { vtQuotesAPI, type VtQuote } from "@/lib/vt-quotes-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { userPreferencesAPI } from "@/lib/user-preferences-api"
import { toast } from "sonner"
import { TablePagination } from "@/components/ui/table-pagination"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"

const PAGE_NAME = "vt-quotes"

const DEFAULT_COLUMNS: ToggleColumnDef[] = [
  { id: "quoteNumber",  label: "Numero" },
  { id: "subject",      label: "Oggetto" },
  { id: "organization", label: "Organizzazione" },
  { id: "stage",        label: "Stadio" },
  { id: "assignedTo",   label: "Assegnato a" },
  { id: "validUntil",   label: "Valido fino a" },
]

const DEFAULT_VISIBLE_IDS = new Set([
  "quoteNumber", "subject", "organization", "stage", "assignedTo",
])

const STAGES = ["Creato", "Consegnato", "Revisionato", "Scaduto", "Accettato", "Rifiutato", "Annullato"]

const STAGE_COLORS: Record<string, string> = {
  "Creato":     "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Consegnato": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  "Revisionato":"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Scaduto":    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  "Accettato":  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Rifiutato":  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Annullato":  "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
}

const emptyForm: any = {
  subject: "", organizationId: "", assignedToId: "", stage: "Creato",
  validUntil: "", description: "",
}

export default function VtQuotesPage() {
  const [items, setItems] = useState<VtQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [limit, setLimit] = useState(20)

  const SELECT_FILTER_COLS = new Set(["stage"])
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

    const savedOrder = localStorage.getItem(`crm_col_order_${PAGE_NAME}`)
    const savedVis   = localStorage.getItem(`crm_col_vis_${PAGE_NAME}`)
    if (savedOrder) { try { setColumns(applyOrder(JSON.parse(savedOrder))) } catch {} }
    if (savedVis)   { try { setVisibleColumns(mergeVis(JSON.parse(savedVis))) } catch {} }

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
  const [selected, setSelected] = useState<VtQuote | null>(null)
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
      const response = await vtQuotesAPI.getAll({
        page, limit,
        stage: f.stage || undefined,
        quoteNumber: f.quoteNumber || undefined,
        subject: f.subject || undefined,
        orgName: f.organization || undefined,
        assignedTo: f.assignedTo || undefined,
        validUntilFrom: f.validUntil || undefined,
      })
      setItems(response.data.quotes)
      setCurrentPage(response.data.pagination.page)
      setTotalPages(response.data.pagination.totalPages)
      setTotalCount(response.data.pagination.total)
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
    if (!formData.subject) { toast.error("L'oggetto è obbligatorio"); return }
    try {
      setSubmitting(true)
      await vtQuotesAPI.create(formData)
      toast.success("Preventivo creato con successo!")
      setIsCreateOpen(false)
      setFormData({ ...emptyForm })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleEdit = async () => {
    if (!selected || !formData.subject) { toast.error("L'oggetto è obbligatorio"); return }
    try {
      setSubmitting(true)
      await vtQuotesAPI.update(selected.id, formData)
      toast.success("Preventivo aggiornato!")
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
      await vtQuotesAPI.delete(selected.id)
      toast.success("Preventivo eliminato!")
      setIsDeleteOpen(false)
      setSelected(null)
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const openEdit = (item: VtQuote) => {
    setSelected(item)
    setFormData({
      subject:        item.subject,
      organizationId: item.organizationId?.toString() || "",
      assignedToId:   item.assignedToId?.toString()   || "",
      stage:          item.stage,
      validUntil:     item.validUntil ? new Date(item.validUntil).toISOString().split("T")[0] : "",
      description:    item.description || "",
    })
    setIsEditOpen(true)
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Oggetto *</Label>
          <Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
        </div>
        <div>
          <Label>Stadio</Label>
          <Select value={formData.stage} onValueChange={v => setFormData({ ...formData, stage: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
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
          <Label>Valido fino a</Label>
          <Input type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} />
        </div>
      </div>
      <div>
        <Label>Descrizione</Label>
        <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
      </div>
    </div>
  )

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />Preventivi
            </h1>
            <p className="text-muted-foreground">{totalCount} preventivi totali</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm }); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nuovo Preventivo
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <ColumnToggle columns={columns} visibleColumns={visibleColumns} onToggle={toggleColumn} onReorder={handleReorder} />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isColVisible("quoteNumber")  && <TableHead>Numero</TableHead>}
                {isColVisible("subject")      && <TableHead>Oggetto</TableHead>}
                {isColVisible("organization") && <TableHead>Organizzazione</TableHead>}
                {isColVisible("stage")        && <TableHead>Stadio</TableHead>}
                {isColVisible("assignedTo")   && <TableHead>Assegnato a</TableHead>}
                {isColVisible("validUntil")   && <TableHead>Valido fino a</TableHead>}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
              <TableRow>
                {isColVisible("quoteNumber")  && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Numero..." value={columnFilters.quoteNumber || ""} onChange={e => updateColumnFilter("quoteNumber", e.target.value)} /></TableHead>}
                {isColVisible("subject")      && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Oggetto..." value={columnFilters.subject || ""} onChange={e => updateColumnFilter("subject", e.target.value)} /></TableHead>}
                {isColVisible("organization") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Organizzazione..." value={columnFilters.organization || ""} onChange={e => updateColumnFilter("organization", e.target.value)} /></TableHead>}
                {isColVisible("stage")        && <TableHead className="p-1"><Select value={columnFilters.stage || ""} onValueChange={v => updateColumnFilter("stage", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stadio" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableHead>}
                {isColVisible("assignedTo")   && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Assegnato a..." value={columnFilters.assignedTo || ""} onChange={e => updateColumnFilter("assignedTo", e.target.value)} /></TableHead>}
                {isColVisible("validUntil")   && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="gg/mm/aaaa" value={columnFilters.validUntil || ""} onChange={e => updateColumnFilter("validUntil", e.target.value)} /></TableHead>}
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
                    Nessun preventivo trovato
                  </TableCell>
                </TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  {isColVisible("quoteNumber")  && <TableCell className="font-mono text-sm">{item.quoteNumber}</TableCell>}
                  {isColVisible("subject")      && <TableCell className="font-medium">{item.subject}</TableCell>}
                  {isColVisible("organization") && <TableCell>{item.organization?.name || "-"}</TableCell>}
                  {isColVisible("stage")        && <TableCell><Badge className={STAGE_COLORS[item.stage] || ""}>{item.stage}</Badge></TableCell>}
                  {isColVisible("assignedTo")   && <TableCell>{item.assignedTo ? `${item.assignedTo.firstName || ""} ${item.assignedTo.lastName || ""}`.trim() || item.assignedTo.username : "-"}</TableCell>}
                  {isColVisible("validUntil")   && <TableCell>{formatDate(item.validUntil)}</TableCell>}
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
              <DialogTitle>Nuovo Preventivo</DialogTitle>
              <DialogDescription>Crea un nuovo preventivo.</DialogDescription>
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
              <DialogTitle>Modifica Preventivo — {selected?.quoteNumber}</DialogTitle>
              <DialogDescription>Modifica i dati del preventivo.</DialogDescription>
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
              <DialogTitle>{selected?.quoteNumber}</DialogTitle>
              <DialogDescription>Dettagli preventivo</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><span className="font-medium text-muted-foreground">Oggetto:</span><br />{selected.subject}</div>
                <div><span className="font-medium text-muted-foreground">Stadio:</span><br /><Badge className={STAGE_COLORS[selected.stage] || ""}>{selected.stage}</Badge></div>
                <div><span className="font-medium text-muted-foreground">Organizzazione:</span><br />{selected.organization?.name || "-"}</div>
                <div><span className="font-medium text-muted-foreground">Assegnato a:</span><br />{selected.assignedTo ? `${selected.assignedTo.firstName || ""} ${selected.assignedTo.lastName || ""}`.trim() || selected.assignedTo.username : "-"}</div>
                <div><span className="font-medium text-muted-foreground">Valido fino a:</span><br />{formatDate(selected.validUntil)}</div>
                {selected.description && (
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">Descrizione:</span>
                    <p className="mt-1 whitespace-pre-wrap">{selected.description}</p>
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
              <AlertDialogTitle>Eliminare il preventivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Il preventivo "{selected?.quoteNumber}" verrà eliminato permanentemente.
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
