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
  Plus, MoreHorizontal, Edit, Trash2, Loader2, Eye, Warehouse,
  Monitor, Server, Shield, Cpu, HardDrive, Globe, Printer, Phone,
  Wifi, Cloud, Database, Lock, Mail, Settings, Wrench, Headphones,
  Camera, Laptop, Tablet, Smartphone,
} from "lucide-react"
import { productsAPI, type Product } from "@/lib/products-api"
import { toast } from "sonner"
import { TablePagination } from "@/components/ui/table-pagination"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"

const PAGE_NAME = "warehouse"

const DEFAULT_COLUMNS: ToggleColumnDef[] = [
  { id: "name",        label: "Nome" },
  { id: "type",        label: "Tipo" },
  { id: "unitPrice",   label: "Prezzo Unitario" },
  { id: "icon",        label: "Icona" },
  { id: "description", label: "Descrizione" },
  { id: "isActive",    label: "Attivo" },
]

const DEFAULT_VISIBLE_IDS = new Set([
  "name", "type", "unitPrice", "icon", "isActive",
])

const PRODUCT_TYPES = ["PRODOTTO", "SERVIZIO"]

const ICON_OPTIONS = [
  "Monitor", "Server", "Shield", "Cpu", "HardDrive", "Globe", "Printer", "Phone",
  "Wifi", "Cloud", "Database", "Lock", "Mail", "Settings", "Wrench", "Headphones",
  "Camera", "Laptop", "Tablet", "Smartphone",
]

const ICON_MAP: Record<string, React.ReactNode> = {
  Monitor: <Monitor className="h-4 w-4" />,
  Server: <Server className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
  Cpu: <Cpu className="h-4 w-4" />,
  HardDrive: <HardDrive className="h-4 w-4" />,
  Globe: <Globe className="h-4 w-4" />,
  Printer: <Printer className="h-4 w-4" />,
  Phone: <Phone className="h-4 w-4" />,
  Wifi: <Wifi className="h-4 w-4" />,
  Cloud: <Cloud className="h-4 w-4" />,
  Database: <Database className="h-4 w-4" />,
  Lock: <Lock className="h-4 w-4" />,
  Mail: <Mail className="h-4 w-4" />,
  Settings: <Settings className="h-4 w-4" />,
  Wrench: <Wrench className="h-4 w-4" />,
  Headphones: <Headphones className="h-4 w-4" />,
  Camera: <Camera className="h-4 w-4" />,
  Laptop: <Laptop className="h-4 w-4" />,
  Tablet: <Tablet className="h-4 w-4" />,
  Smartphone: <Smartphone className="h-4 w-4" />,
}

const emptyForm: any = {
  name: "", unitPrice: "", description: "", icon: "", type: "SERVIZIO", isActive: true,
}

export default function WarehousePage() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [limit, setLimit] = useState(20)

  const SELECT_FILTER_COLS = new Set(["type", "isActive"])
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

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => ({ ...prev, [columnId]: !prev[columnId] }))
  }

  const handleReorder = (newOrder: string[]) => {
    const reordered = [
      ...newOrder.map(id => columns.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[],
      ...columns.filter(c => !newOrder.includes(c.id)),
    ]
    setColumns(reordered)
  }

  const isColVisible = (columnId: string) => visibleColumns[columnId] === true

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const f = debouncedFilters
      const response = await productsAPI.getAll({
        page, limit,
        search: f.name || undefined,
        type: f.type || undefined,
        isActive: f.isActive || undefined,
      })
      setItems(response.data.products)
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
    if (!formData.unitPrice) { toast.error("Il prezzo unitario è obbligatorio"); return }
    try {
      setSubmitting(true)
      await productsAPI.create({ ...formData, unitPrice: parseFloat(formData.unitPrice) })
      toast.success("Prodotto creato con successo!")
      setIsCreateOpen(false)
      setFormData({ ...emptyForm })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleEdit = async () => {
    if (!selected || !formData.name) { toast.error("Il nome è obbligatorio"); return }
    try {
      setSubmitting(true)
      await productsAPI.update(selected.id, { ...formData, unitPrice: parseFloat(formData.unitPrice) })
      toast.success("Prodotto aggiornato!")
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
      await productsAPI.delete(selected.id)
      toast.success("Prodotto eliminato!")
      setIsDeleteOpen(false)
      setSelected(null)
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const openEdit = (item: Product) => {
    setSelected(item)
    setFormData({
      name: item.name,
      unitPrice: item.unitPrice.toString(),
      description: item.description || "",
      icon: item.icon || "",
      type: item.type,
      isActive: item.isActive,
    })
    setIsEditOpen(true)
  }

  const formatCurrency = (v: number) =>
    `€ ${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome *</Label>
          <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        </div>
        <div>
          <Label>Prezzo Unitario (EUR) *</Label>
          <Input type="number" step="0.01" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Icona</Label>
          <Select value={formData.icon} onValueChange={v => setFormData({ ...formData, icon: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona icona..." /></SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map(icon => (
                <SelectItem key={icon} value={icon}>
                  <span className="flex items-center gap-2">{ICON_MAP[icon]} {icon}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Descrizione</Label>
        <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox" id="isActive"
          checked={formData.isActive}
          onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
        />
        <Label htmlFor="isActive">Attivo</Label>
      </div>
    </div>
  )

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Warehouse className="h-6 w-6" />Magazzino
            </h1>
            <p className="text-muted-foreground">{totalCount} prodotti/servizi totali</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm }); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nuovo Prodotto
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <ColumnToggle columns={columns} visibleColumns={visibleColumns} onToggle={toggleColumn} onReorder={handleReorder} />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isColVisible("name")        && <TableHead>Nome</TableHead>}
                {isColVisible("type")        && <TableHead>Tipo</TableHead>}
                {isColVisible("unitPrice")   && <TableHead>Prezzo Unitario</TableHead>}
                {isColVisible("icon")        && <TableHead>Icona</TableHead>}
                {isColVisible("description") && <TableHead>Descrizione</TableHead>}
                {isColVisible("isActive")    && <TableHead>Attivo</TableHead>}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
              <TableRow>
                {isColVisible("name")        && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Nome..." value={columnFilters.name || ""} onChange={e => updateColumnFilter("name", e.target.value)} /></TableHead>}
                {isColVisible("type")        && <TableHead className="p-1"><Select value={columnFilters.type || ""} onValueChange={v => updateColumnFilter("type", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{PRODUCT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></TableHead>}
                {isColVisible("unitPrice")   && <TableHead className="p-1"></TableHead>}
                {isColVisible("icon")        && <TableHead className="p-1"></TableHead>}
                {isColVisible("description") && <TableHead className="p-1"></TableHead>}
                {isColVisible("isActive")    && <TableHead className="p-1"><Select value={columnFilters.isActive || ""} onValueChange={v => updateColumnFilter("isActive", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tutti" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem><SelectItem value="true">Si</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></TableHead>}
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
                    Nessun prodotto trovato
                  </TableCell>
                </TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  {isColVisible("name")        && <TableCell className="font-medium">{item.name}</TableCell>}
                  {isColVisible("type")        && <TableCell><Badge variant={item.type === "PRODOTTO" ? "default" : "secondary"}>{item.type}</Badge></TableCell>}
                  {isColVisible("unitPrice")   && <TableCell>{formatCurrency(item.unitPrice)}</TableCell>}
                  {isColVisible("icon")        && <TableCell>{item.icon ? ICON_MAP[item.icon] || item.icon : "-"}</TableCell>}
                  {isColVisible("description") && <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">{item.description || "-"}</TableCell>}
                  {isColVisible("isActive")    && <TableCell><Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? "Si" : "No"}</Badge></TableCell>}
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
              <DialogTitle>Nuovo Prodotto/Servizio</DialogTitle>
              <DialogDescription>Aggiungi un nuovo articolo al magazzino.</DialogDescription>
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
              <DialogTitle>Modifica Prodotto — {selected?.name}</DialogTitle>
              <DialogDescription>Modifica i dati del prodotto.</DialogDescription>
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
              <DialogTitle>{selected?.name}</DialogTitle>
              <DialogDescription>Dettagli prodotto/servizio</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div><span className="font-medium text-muted-foreground">Nome:</span><br />{selected.name}</div>
                <div><span className="font-medium text-muted-foreground">Tipo:</span><br /><Badge variant={selected.type === "PRODOTTO" ? "default" : "secondary"}>{selected.type}</Badge></div>
                <div><span className="font-medium text-muted-foreground">Prezzo unitario:</span><br />{formatCurrency(selected.unitPrice)}</div>
                <div><span className="font-medium text-muted-foreground">Icona:</span><br />{selected.icon ? <span className="flex items-center gap-2">{ICON_MAP[selected.icon]} {selected.icon}</span> : "-"}</div>
                <div><span className="font-medium text-muted-foreground">Attivo:</span><br />{selected.isActive ? "Si" : "No"}</div>
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
              <AlertDialogTitle>Eliminare il prodotto?</AlertDialogTitle>
              <AlertDialogDescription>
                Il prodotto "{selected?.name}" verrà eliminato permanentemente.
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
