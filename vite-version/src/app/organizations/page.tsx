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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus, MoreHorizontal, Edit, Trash2, Loader2, Eye, Building2,
} from "lucide-react"
import { organizationsAPI, type Organization } from "@/lib/organizations-api"
import { userPreferencesAPI } from "@/lib/user-preferences-api"
import { toast } from "sonner"
import { TablePagination } from "@/components/ui/table-pagination"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"

const PAGE_NAME = "organizations"

const DEFAULT_COLUMNS: ToggleColumnDef[] = [
  { id: "accountType",  label: "Tipo" },
  { id: "code",         label: "Codice BDT" },
  { id: "denomination", label: "Denominazione" },
  { id: "phone",        label: "Telefono" },
  { id: "createdAt",    label: "Data di Creazione" },
  { id: "vatNumber",    label: "P.IVA" },
  { id: "mobile",       label: "Cellulare" },
  { id: "industry",     label: "Settore" },
  { id: "email",        label: "Email" },
  { id: "uniqueCode",   label: "Cod. Univoco" },
  { id: "pec",          label: "PEC" },
  { id: "legalRep",     label: "Legale Rappresentante" },
  { id: "shareholders", label: "Compagine Sociale" },
  { id: "coordinator",  label: "Coordinatrice" },
  { id: "bankName",     label: "Banca" },
  { id: "iban",         label: "IBAN" },
  { id: "devices",      label: "Dispositivi" },
  { id: "nasInfo",      label: "Info NAS" },
  { id: "nasContract",  label: "Contratto NAS" },
]

const DEFAULT_VISIBLE_IDS = new Set(["accountType", "code", "denomination", "phone", "createdAt"])

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  "SI Contratto": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "NO Contratto": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const INDUSTRIES = ["Immobiliare", "Creditizio"]
const ACCOUNT_TYPES = ["NO Contratto", "SI Contratto"]

const emptyForm = {
  name: "", denomination: "", code: "", vatNumber: "", uniqueCode: "", pec: "",
  email: "", phone: "", mobile: "", industry: "", accountType: "", isActive: true,
  devices: "", nasInfo: "", nasContract: "", legalRep: "", coordinator: "",
  shareholders: "", description: "",
  billStreet: "", billCity: "", billState: "", billCode: "", billCountry: "",
  shipStreet: "", shipCity: "", shipState: "", shipCode: "", shipCountry: "",
  bankName: "", iban: "",
}

export default function OrganizationsPage() {
  const [items, setItems] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [limit, setLimit] = useState(20)

  const SELECT_FILTER_COLS = new Set(["accountType", "industry"])
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
    const savedVis = localStorage.getItem(`crm_col_vis_${PAGE_NAME}`)
    if (savedOrder) {
      try { setColumns(applyOrder(JSON.parse(savedOrder))) } catch {}
    }
    if (savedVis) {
      try { setVisibleColumns(mergeVis(JSON.parse(savedVis))) } catch {}
    }

    // DB sync — overwrites localStorage when it arrives
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
  const [selected, setSelected] = useState<Organization | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const f = debouncedFilters
      const response = await organizationsAPI.getAll({
        page, limit,
        industry: f.industry || undefined,
        accountType: f.accountType || undefined,
        code: f.code || undefined,
        denomination: f.denomination || undefined,
        phone: f.phone || undefined,
        vatNumber: f.vatNumber || undefined,
        mobile: f.mobile || undefined,
        email: f.email || undefined,
        uniqueCode: f.uniqueCode || undefined,
        pec: f.pec || undefined,
        legalRep: f.legalRep || undefined,
        shareholders: f.shareholders || undefined,
        coordinator: f.coordinator || undefined,
        bankName: f.bankName || undefined,
        iban: f.iban || undefined,
        devices: f.devices || undefined,
        nasInfo: f.nasInfo || undefined,
        nasContract: f.nasContract || undefined,
        dateFrom: f.createdAt || undefined,
      })
      setItems(response.data.organizations)
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
    if (!formData.name) { toast.error("Il nome è obbligatorio"); return }
    try {
      setSubmitting(true)
      await organizationsAPI.create(formData)
      toast.success("Organizzazione creata con successo!")
      setIsCreateOpen(false)
      setFormData({ ...emptyForm })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleEdit = async () => {
    if (!selected || !formData.name) { toast.error("Il nome è obbligatorio"); return }
    try {
      setSubmitting(true)
      await organizationsAPI.update(selected.id, formData)
      toast.success("Organizzazione aggiornata!")
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
      await organizationsAPI.delete(selected.id)
      toast.success("Organizzazione eliminata!")
      setIsDeleteOpen(false)
      setSelected(null)
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const openEdit = (item: Organization) => {
    setSelected(item)
    setFormData({
      name: item.name || "", denomination: item.denomination || "", code: item.code || "",
      vatNumber: item.vatNumber || "", uniqueCode: item.uniqueCode || "",
      pec: item.pec || "", email: item.email || "", phone: item.phone || "",
      mobile: item.mobile || "", industry: item.industry || "",
      accountType: item.accountType || "", isActive: item.isActive,
      devices: item.devices || "", nasInfo: item.nasInfo || "",
      nasContract: item.nasContract || "", legalRep: item.legalRep || "",
      coordinator: item.coordinator || "", shareholders: item.shareholders || "",
      description: item.description || "",
      billStreet: item.billStreet || "", billCity: item.billCity || "",
      billState: item.billState || "", billCode: item.billCode || "", billCountry: item.billCountry || "",
      shipStreet: item.shipStreet || "", shipCity: item.shipCity || "",
      shipState: item.shipState || "", shipCode: item.shipCode || "", shipCountry: item.shipCountry || "",
      bankName: item.bankName || "", iban: item.iban || "",
    })
    setIsEditOpen(true)
  }

  const renderForm = () => (
    <Tabs defaultValue="generale" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="generale">Generale</TabsTrigger>
        <TabsTrigger value="indirizzi">Indirizzi</TabsTrigger>
        <TabsTrigger value="dettagli">Dettagli</TabsTrigger>
      </TabsList>
      <TabsContent value="generale" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Nome Organizzazione *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><Label>Denominazione</Label><Input value={formData.denomination} onChange={e => setFormData({ ...formData, denomination: e.target.value })} /></div>
          <div><Label>Codice BDT</Label><Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={formData.accountType} onValueChange={v => setFormData({ ...formData, accountType: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Settore</Label>
            <Select value={formData.industry} onValueChange={v => setFormData({ ...formData, industry: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>P.IVA</Label><Input value={formData.vatNumber} onChange={e => setFormData({ ...formData, vatNumber: e.target.value })} /></div>
          <div><Label>Codice Univoco (SDI)</Label><Input value={formData.uniqueCode} onChange={e => setFormData({ ...formData, uniqueCode: e.target.value })} /></div>
          <div><Label>PEC</Label><Input value={formData.pec} onChange={e => setFormData({ ...formData, pec: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
          <div><Label>Telefono</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
          <div><Label>Cellulare</Label><Input value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} /></div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} id="isActive" />
            <Label htmlFor="isActive">Attivo</Label>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="indirizzi" className="space-y-4 mt-4">
        <h4 className="font-medium">Indirizzo Fatturazione</h4>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Via</Label><Input value={formData.billStreet} onChange={e => setFormData({ ...formData, billStreet: e.target.value })} /></div>
          <div><Label>Città</Label><Input value={formData.billCity} onChange={e => setFormData({ ...formData, billCity: e.target.value })} /></div>
          <div><Label>Provincia</Label><Input value={formData.billState} onChange={e => setFormData({ ...formData, billState: e.target.value })} /></div>
          <div><Label>CAP</Label><Input value={formData.billCode} onChange={e => setFormData({ ...formData, billCode: e.target.value })} /></div>
          <div><Label>Paese</Label><Input value={formData.billCountry} onChange={e => setFormData({ ...formData, billCountry: e.target.value })} /></div>
        </div>
        <h4 className="font-medium mt-4">Indirizzo Spedizione</h4>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Via</Label><Input value={formData.shipStreet} onChange={e => setFormData({ ...formData, shipStreet: e.target.value })} /></div>
          <div><Label>Città</Label><Input value={formData.shipCity} onChange={e => setFormData({ ...formData, shipCity: e.target.value })} /></div>
          <div><Label>Provincia</Label><Input value={formData.shipState} onChange={e => setFormData({ ...formData, shipState: e.target.value })} /></div>
          <div><Label>CAP</Label><Input value={formData.shipCode} onChange={e => setFormData({ ...formData, shipCode: e.target.value })} /></div>
          <div><Label>Paese</Label><Input value={formData.shipCountry} onChange={e => setFormData({ ...formData, shipCountry: e.target.value })} /></div>
        </div>
        <h4 className="font-medium mt-4">Banca</h4>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Nome Banca</Label><Input value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} /></div>
          <div><Label>IBAN</Label><Input value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} /></div>
        </div>
      </TabsContent>
      <TabsContent value="dettagli" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Legale Rappresentante</Label><Input value={formData.legalRep} onChange={e => setFormData({ ...formData, legalRep: e.target.value })} /></div>
          <div><Label>Coordinatrice</Label><Input value={formData.coordinator} onChange={e => setFormData({ ...formData, coordinator: e.target.value })} /></div>
          <div><Label>Dispositivi</Label><Input value={formData.devices} onChange={e => setFormData({ ...formData, devices: e.target.value })} placeholder="NAS, PC, MAC" /></div>
          <div><Label>Info NAS</Label><Input value={formData.nasInfo} onChange={e => setFormData({ ...formData, nasInfo: e.target.value })} /></div>
          <div><Label>Contratto NAS</Label><Input value={formData.nasContract} onChange={e => setFormData({ ...formData, nasContract: e.target.value })} /></div>
        </div>
        <div><Label>Compagine Sociale</Label><Textarea value={formData.shareholders} onChange={e => setFormData({ ...formData, shareholders: e.target.value })} placeholder="Inserisci nomi separati da virgola o a capo" rows={3} /></div>
        <div><Label>Descrizione</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
      </TabsContent>
    </Tabs>
  )

  const renderCell = (columnId: string, item: Organization) => {
    switch (columnId) {
      case "accountType":
        return <TableCell key={columnId}>{item.accountType ? <Badge className={ACCOUNT_TYPE_COLORS[item.accountType] || "bg-gray-100 text-gray-800"}>{item.accountType}</Badge> : "-"}</TableCell>
      case "code":         return <TableCell key={columnId} className="font-mono text-sm">{item.code || "-"}</TableCell>
      case "denomination": return <TableCell key={columnId} className="font-medium">{item.denomination || item.name}</TableCell>
      case "phone":        return <TableCell key={columnId}>{item.phone?.replace(/\//g, ' ') || "-"}</TableCell>
      case "createdAt":    return <TableCell key={columnId} className="tabular-nums text-sm">{new Date(item.createdAt).toLocaleDateString("it-IT")}</TableCell>
      case "vatNumber":    return <TableCell key={columnId} className="font-mono text-sm">{item.vatNumber || "-"}</TableCell>
      case "mobile":       return <TableCell key={columnId}>{item.mobile || "-"}</TableCell>
      case "industry":     return <TableCell key={columnId}>{item.industry || "-"}</TableCell>
      case "email":        return <TableCell key={columnId}>{item.email || "-"}</TableCell>
      case "uniqueCode":   return <TableCell key={columnId} className="font-mono text-sm">{item.uniqueCode || "-"}</TableCell>
      case "pec":          return <TableCell key={columnId}>{item.pec || "-"}</TableCell>
      case "legalRep":     return <TableCell key={columnId}>{item.legalRep || "-"}</TableCell>
      case "shareholders": return <TableCell key={columnId} className="max-w-[160px] truncate">{item.shareholders || "-"}</TableCell>
      case "coordinator":  return <TableCell key={columnId}>{item.coordinator || "-"}</TableCell>
      case "bankName":     return <TableCell key={columnId}>{item.bankName || "-"}</TableCell>
      case "iban":         return <TableCell key={columnId} className="font-mono text-sm">{item.iban || "-"}</TableCell>
      case "devices":      return <TableCell key={columnId}>{item.devices || "-"}</TableCell>
      case "nasInfo":      return <TableCell key={columnId}>{item.nasInfo || "-"}</TableCell>
      case "nasContract":  return <TableCell key={columnId}>{item.nasContract || "-"}</TableCell>
      default: return null
    }
  }

  const visibleCols = columns.filter(c => isColVisible(c.id))

  const renderFilterCell = (columnId: string) => {
    switch (columnId) {
      case "accountType":
        return (
          <TableHead key={`filter-${columnId}`} className="p-1">
            <Select value={columnFilters.accountType || ""} onValueChange={v => updateColumnFilter("accountType", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tutti</SelectItem>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </TableHead>
        )
      case "industry":
        return (
          <TableHead key={`filter-${columnId}`} className="p-1">
            <Select value={columnFilters.industry || ""} onValueChange={v => updateColumnFilter("industry", v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Settore" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tutti</SelectItem>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </TableHead>
        )
      default: {
        const placeholders: Record<string, string> = {
          code: "Codice...",
          denomination: "Denominazione...",
          phone: "Telefono...",
          createdAt: "gg/mm/aaaa",
          vatNumber: "P.IVA...",
          mobile: "Cellulare...",
          email: "Email...",
          uniqueCode: "Cod. Univoco...",
          pec: "PEC...",
          legalRep: "Legale Rapp...",
          shareholders: "Compagine...",
          coordinator: "Coordinatrice...",
          bankName: "Banca...",
          iban: "IBAN...",
          devices: "Dispositivi...",
          nasInfo: "Info NAS...",
          nasContract: "Contratto NAS...",
        }
        return (
          <TableHead key={`filter-${columnId}`} className="p-1">
            <Input
              className="h-8 text-xs"
              placeholder={placeholders[columnId] || "Filtra..."}
              value={columnFilters[columnId] || ""}
              onChange={e => updateColumnFilter(columnId, e.target.value)}
            />
          </TableHead>
        )
      }
    }
  }

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" />Organizzazioni</h1>
            <p className="text-muted-foreground">{totalCount} organizzazioni totali</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm }); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nuova Organizzazione
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ColumnToggle columns={columns} visibleColumns={visibleColumns} onToggle={toggleColumn} onReorder={handleReorder} />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleCols.map(col => <TableHead key={col.id}>{col.label}</TableHead>)}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
              <TableRow>
                {visibleCols.map(col => renderFilterCell(col.id))}
                <TableHead className="w-[50px] p-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={visibleCols.length + 1} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={visibleCols.length + 1} className="text-center py-8 text-muted-foreground">Nessuna organizzazione trovata</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  {visibleCols.map(col => renderCell(col.id, item))}
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

        <TablePagination
          currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} limit={limit}
          onPageChange={(page) => loadData(page)}
          onLimitChange={(newLimit) => { setLimit(newLimit); setCurrentPage(1) }}
        />

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuova Organizzazione</DialogTitle><DialogDescription>Compila i campi per creare una nuova organizzazione.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Modifica Organizzazione</DialogTitle><DialogDescription>Modifica i dati dell'organizzazione.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
              <Button onClick={handleEdit} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {selected?.accountType && <Badge className={ACCOUNT_TYPE_COLORS[selected.accountType] || "bg-gray-100 text-gray-800"}>{selected.accountType}</Badge>}
                {selected?.denomination || selected?.name}
              </DialogTitle>
              <DialogDescription>Dettagli organizzazione</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="font-medium">Codice BDT:</span> <span className="font-mono">{selected.code || "-"}</span></div>
                  <div><span className="font-medium">Settore:</span> {selected.industry || "-"}</div>
                  <div><span className="font-medium">Telefono:</span> {selected.phone?.replace(/\//g, ' ') || "-"}</div>
                  <div><span className="font-medium">Cellulare:</span> {selected.mobile || "-"}</div>
                  <div><span className="font-medium">Email:</span> {selected.email || "-"}</div>
                  <div><span className="font-medium">PEC:</span> {selected.pec || "-"}</div>
                  <div><span className="font-medium">P.IVA:</span> <span className="font-mono">{selected.vatNumber || "-"}</span></div>
                  <div><span className="font-medium">Cod. Univoco:</span> <span className="font-mono">{selected.uniqueCode || "-"}</span></div>
                  <div><span className="font-medium">Data creazione:</span> {new Date(selected.createdAt).toLocaleDateString("it-IT")}</div>
                </div>
                {(selected.legalRep || selected.coordinator || selected.shareholders) && (
                  <div className="border-t pt-3 grid grid-cols-2 gap-3">
                    {selected.legalRep && <div><span className="font-medium">Legale Rappresentante:</span> {selected.legalRep}</div>}
                    {selected.coordinator && <div><span className="font-medium">Coordinatrice:</span> {selected.coordinator}</div>}
                    {selected.shareholders && <div className="col-span-2"><span className="font-medium">Compagine Sociale:</span><p className="mt-1 whitespace-pre-wrap">{selected.shareholders}</p></div>}
                  </div>
                )}
                {(selected.devices || selected.nasInfo || selected.nasContract) && (
                  <div className="border-t pt-3 grid grid-cols-2 gap-3">
                    {selected.devices && <div><span className="font-medium">Dispositivi:</span> {selected.devices}</div>}
                    {selected.nasInfo && <div><span className="font-medium">Info NAS:</span> {selected.nasInfo}</div>}
                    {selected.nasContract && <div><span className="font-medium">Contratto NAS:</span> {selected.nasContract}</div>}
                  </div>
                )}
                {(selected.billStreet || selected.billCity) && (
                  <div className="border-t pt-3">
                    <span className="font-medium">Indirizzo fatt.:</span> {[selected.billStreet, selected.billCity, selected.billState, selected.billCode, selected.billCountry].filter(Boolean).join(', ')}
                  </div>
                )}
                {(selected.bankName || selected.iban) && (
                  <div className="border-t pt-3 grid grid-cols-2 gap-3">
                    {selected.bankName && <div><span className="font-medium">Banca:</span> {selected.bankName}</div>}
                    {selected.iban && <div><span className="font-medium">IBAN:</span> <span className="font-mono">{selected.iban}</span></div>}
                  </div>
                )}
                {selected.description && <div className="border-t pt-3"><span className="font-medium">Descrizione:</span><p className="mt-1 whitespace-pre-wrap bg-muted p-3 rounded">{selected.description}</p></div>}
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
              <AlertDialogTitle>Eliminare l'organizzazione?</AlertDialogTitle>
              <AlertDialogDescription>Questa azione non può essere annullata. L'organizzazione "{selected?.denomination || selected?.name}" verrà eliminata permanentemente.</AlertDialogDescription>
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
