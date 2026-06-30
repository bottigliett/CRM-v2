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
  ChevronsUpDown, Check, Download,
} from "lucide-react"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
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
  { id: "orgName",         label: "Organizzazione" },
  { id: "organization",    label: "Denominazione ufficio" },
  { id: "orgCode",         label: "Codice BDT" },
  { id: "legalRep",        label: "Legale rappresentante" },
  { id: "shareholders",    label: "Compagine sociale" },
  { id: "status",          label: "Stato" },
  { id: "contractValue",   label: "Valore" },
  { id: "startDate",       label: "Data inizio" },
  { id: "dueDate",         label: "Data di scadenza" },
  { id: "nextInvoiceDate", label: "Prossima fattura" },
  { id: "subject",         label: "Info aggiuntive" },
]

const DEFAULT_VISIBLE_IDS = new Set([
  "contractNumber", "contractType", "orgName", "organization", "status",
  "contractValue", "startDate", "nextInvoiceDate",
])

const STATUSES = ["Attivo", "In attesa fatturazione", "Scaduto", "Non attivo", "Blocco Amministrativo", "In attesa pagamento"]
const CONTRACT_TYPES = ["ASSISTENZA TECNICA", "Tecnocasa esteso", "BACKUP ANNUALE", "BACKUP DROPBOX", "Backup CLOUD", "HOSTING CRM", "ALTRO"]

const STATUS_COLORS: Record<string, string> = {
  "Attivo":                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Scaduto":                 "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Non attivo":              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  "In attesa fatturazione":  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Blocco Amministrativo":   "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "In attesa pagamento":     "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

const emptyForm: any = {
  contractType: "ASSISTENZA TECNICA", status: "Attivo", organizationId: "",
  contractValue: "", startDate: "", dueDate: "", nextInvoiceDate: "",
  subject: "",
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
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false)

  const SELECT_FILTER_COLS = new Set(["status", "contractType"])
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
  const [orgs, setOrgs] = useState<{ id: number; name: string; denomination: string }[]>([])

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 })
      .then(r => setOrgs(r.data.organizations.map((o: any) => ({ id: o.id, name: o.name, denomination: o.denomination || "" }))))
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
      contractType:    item.contractType    || "ASSISTENZA TECNICA",
      status:          item.status,
      organizationId:  item.organizationId?.toString() || "",
      contractValue:   item.contractValue?.toString()  || "",
      startDate:       item.startDate       ? new Date(item.startDate).toISOString().split("T")[0]       : "",
      dueDate:         item.dueDate         ? new Date(item.dueDate).toISOString().split("T")[0]         : "",
      nextInvoiceDate: item.nextInvoiceDate ? new Date(item.nextInvoiceDate).toISOString().split("T")[0] : "",
      subject:         item.subject || "",
    })
    setIsEditOpen(true)
  }

  const formatDate     = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"

  const exportCSV = async () => {
    try {
      const all = await serviceContractsAPI.getAll({
        limit: 9999,
        status: debouncedFilters.status || undefined,
        contractType: debouncedFilters.contractType || undefined,
        orgName: debouncedFilters.organization || undefined,
        subject: debouncedFilters.subject || undefined,
        contractNumber: debouncedFilters.contractNumber || undefined,
      })
      const list = (all.data.contracts as any[]).slice().sort((a, b) => {
        const repA = (a.organization?.legalRep || '').toLowerCase()
        const repB = (b.organization?.legalRep || '').toLowerCase()
        if (repA !== repB) return repA.localeCompare(repB, 'it')
        return (a.organization?.code || '').localeCompare(b.organization?.code || '', 'it')
      })
      const headers = ['Numero','Tipo','Organizzazione','Denominazione ufficio','Codice BDT','Legale rapp.','Compagine sociale','Stato','Valore (EUR)','Data inizio','Data scadenza','Prossima fattura']
      const rows = list.map((c: any) => [
        c.contractNumber, c.contractType || '', c.organization?.name || '', c.organization?.denomination || '',
        c.organization?.code || '', c.organization?.legalRep || '', c.organization?.shareholders || '',
        c.status, c.contractValue != null ? c.contractValue.toString().replace('.', ',') : '',
        c.startDate ? new Date(c.startDate).toLocaleDateString('it-IT') : '',
        c.dueDate ? new Date(c.dueDate).toLocaleDateString('it-IT') : '',
        c.nextInvoiceDate ? new Date(c.nextInvoiceDate).toLocaleDateString('it-IT') : '',
      ])
      const csv = [headers, ...rows].map(r => r.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contratti_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Errore durante l\'esportazione') }
  }

  const formatCurrency = (v: number | null) =>
    v != null ? `€ ${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "-"

  const renderForm = () => {
    const selectedOrg = orgs.find(o => o.id.toString() === formData.organizationId)
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo contratto</Label>
            <Select value={formData.contractType} onValueChange={v => setFormData({ ...formData, contractType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
            <Label>Denominazione ufficio</Label>
            <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={orgPopoverOpen} className="w-full justify-between font-normal">
                  <span className="truncate">
                    {selectedOrg ? (selectedOrg.denomination || selectedOrg.name) : 'Seleziona...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cerca per denominazione o ragione sociale..." />
                  <CommandList>
                    <CommandEmpty>Nessuna organizzazione trovata.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="__none__" onSelect={() => { setFormData({ ...formData, organizationId: '' }); setOrgPopoverOpen(false) }}>
                        <Check className={cn("mr-2 h-4 w-4", !formData.organizationId ? "opacity-100" : "opacity-0")} />
                        <span className="text-muted-foreground italic">Nessuna</span>
                      </CommandItem>
                      {orgs.map(o => (
                        <CommandItem key={o.id} value={`${o.denomination} ${o.name}`} onSelect={() => { setFormData({ ...formData, organizationId: o.id.toString() }); setOrgPopoverOpen(false) }}>
                          <Check className={cn("mr-2 h-4 w-4", formData.organizationId === o.id.toString() ? "opacity-100" : "opacity-0")} />
                          <div>
                            <div className="text-sm">{o.denomination || o.name}</div>
                            {o.denomination && <div className="text-xs text-muted-foreground">{o.name}</div>}
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
            <Label>Organizzazione (ragione sociale)</Label>
            <Input value={selectedOrg?.name || ""} disabled className="bg-muted/50" placeholder="Seleziona una denominazione ufficio..." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Valore (EUR)</Label>
            <Input type="number" step="0.01" value={formData.contractValue} onChange={e => setFormData({ ...formData, contractValue: e.target.value })} />
          </div>
          <div>
            <Label>Data inizio</Label>
            <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
          </div>
          <div>
            <Label>Data di scadenza</Label>
            <Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
          </div>
          <div>
            <Label>Data prossima fattura</Label>
            <Input type="date" value={formData.nextInvoiceDate} onChange={e => setFormData({ ...formData, nextInvoiceDate: e.target.value })} />
          </div>
        </div>

        <div>
          <Label>Informazioni aggiuntive</Label>
          <Textarea value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} rows={3} placeholder="Note, annotazioni, informazioni aggiuntive..." />
        </div>
      </div>
    )
  }

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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />Esporta CSV
            </Button>
            <Button onClick={() => { setFormData({ ...emptyForm }); setIsCreateOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />Nuovo Contratto
            </Button>
          </div>
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
                {columns.filter(c => isColVisible(c.id)).map(c => <TableHead key={c.id}>{c.label}</TableHead>)}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
              <TableRow>
                {columns.filter(c => isColVisible(c.id)).map(c => {
                  if (c.id === "contractType") return <TableHead key={`f-${c.id}`} className="p-1"><Select value={columnFilters.contractType || ""} onValueChange={v => updateColumnFilter("contractType", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></TableHead>
                  if (c.id === "status") return <TableHead key={`f-${c.id}`} className="p-1"><Select value={columnFilters.status || ""} onValueChange={v => updateColumnFilter("status", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stato" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableHead>
                  const placeholders: Record<string, string> = { contractNumber: "Numero...", orgName: "Organizzazione...", organization: "Denominazione...", orgCode: "Codice...", legalRep: "Legale rapp...", shareholders: "Compagine...", contractValue: "Valore...", startDate: "gg/mm/aaaa", dueDate: "gg/mm/aaaa", nextInvoiceDate: "gg/mm/aaaa", subject: "Info..." }
                  return <TableHead key={`f-${c.id}`} className="p-1"><Input className="h-8 text-xs" placeholder={placeholders[c.id] || "Filtra..."} value={columnFilters[c.id] || ""} onChange={e => updateColumnFilter(c.id, e.target.value)} /></TableHead>
                })}
                <TableHead className="w-[50px] p-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={columns.filter(c => isColVisible(c.id)).length + 1} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={columns.filter(c => isColVisible(c.id)).length + 1} className="text-center py-8 text-muted-foreground">Nessun contratto trovato</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  {isColVisible("contractNumber")  && <TableCell className="font-mono text-sm">{item.contractNumber}</TableCell>}
                  {isColVisible("contractType")    && <TableCell>{item.contractType || "-"}</TableCell>}
                  {isColVisible("orgName")         && <TableCell className="font-medium">{item.organization?.name || "-"}</TableCell>}
                  {isColVisible("organization")    && <TableCell>{item.organization?.denomination || "-"}</TableCell>}
                  {isColVisible("orgCode")         && <TableCell className="font-mono text-sm">{item.organization?.code || "-"}</TableCell>}
                  {isColVisible("legalRep")        && <TableCell>{item.organization?.legalRep || "-"}</TableCell>}
                  {isColVisible("shareholders")    && <TableCell className="max-w-[160px] truncate">{item.organization?.shareholders || "-"}</TableCell>}
                  {isColVisible("status")          && <TableCell><Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge></TableCell>}
                  {isColVisible("contractValue")   && <TableCell>{formatCurrency(item.contractValue)}</TableCell>}
                  {isColVisible("startDate")       && <TableCell>{formatDate(item.startDate)}</TableCell>}
                  {isColVisible("dueDate")         && <TableCell>{formatDate(item.dueDate)}</TableCell>}
                  {isColVisible("nextInvoiceDate") && <TableCell>{formatDate(item.nextInvoiceDate)}</TableCell>}
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
                <div><span className="font-medium text-muted-foreground">Denominazione ufficio:</span><br />{selected.organization?.denomination || "-"}</div>
                {selected.organization?.code && <div><span className="font-medium text-muted-foreground">Codice BDT:</span><br /><span className="font-mono">{selected.organization.code}</span></div>}
                {selected.organization?.legalRep && <div><span className="font-medium text-muted-foreground">Legale rappresentante:</span><br />{selected.organization.legalRep}</div>}
                <div><span className="font-medium text-muted-foreground">Valore:</span><br />{formatCurrency(selected.contractValue)}</div>
                <div><span className="font-medium text-muted-foreground">Data inizio:</span><br />{formatDate(selected.startDate)}</div>
                <div><span className="font-medium text-muted-foreground">Data scadenza:</span><br />{formatDate(selected.dueDate)}</div>
                <div><span className="font-medium text-muted-foreground">Prossima fattura:</span><br />{formatDate(selected.nextInvoiceDate)}</div>
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
