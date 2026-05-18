"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useLocation } from "react-router-dom"
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
  ChevronsUpDown, Check,
} from "lucide-react"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { helpdeskAPI, type HelpDeskTicket } from "@/lib/helpdesk-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { usersAPI, type User } from "@/lib/users-api"
import { userPreferencesAPI } from "@/lib/user-preferences-api"
import { toast } from "sonner"
import { TablePagination } from "@/components/ui/table-pagination"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"

const PAGE_NAME = "helpdesk"

const DEFAULT_COLUMNS: ToggleColumnDef[] = [
  { id: "createdAt",    label: "Data" },
  { id: "orgCode",      label: "Codice Ufficio" },
  { id: "organization", label: "Denominazione Uff." },
  { id: "title",        label: "Titolo" },
  { id: "assignedTo",   label: "Assegnato a" },
  { id: "callType",     label: "Tipo Chiamata" },
  { id: "description",  label: "Descrizione" },
  { id: "status",       label: "Stato" },
  { id: "ticketNumber", label: "N. Ticket" },
]

const DEFAULT_VISIBLE_IDS = new Set(["createdAt", "orgCode", "organization", "title", "assignedTo", "callType", "description", "status"])

const STATUSES = ["Aperto", "In Corso", "In attesa risposta", "Chiuso"]
const PRIORITIES = ["Bloccante", "Principale", "Secondario"]
const CALL_TYPES = ["Atelier", "Browser", "Tecnico", "Gestionale", "Server", "Hardware", "Software", "Rete", "Altro"]
const ORIGINS = ["Telefono", "Whatsapp", "Email", "Di persona", "Portale"]
const INDUSTRIES = ["Immobiliare", "Creditizio"]

const STATUS_COLORS: Record<string, string> = {
  "Aperto":              "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "In Corso":            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "In attesa risposta":  "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  "Chiuso":              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
}

const emptyForm: any = {
  title: "", status: "Aperto", callType: "", ticketOrigin: "",
  organizationId: "", assignedToId: "", description: "",
}

export default function HelpDeskPage() {
  const location = useLocation()
  const [items, setItems] = useState<HelpDeskTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [callTypeFilter, setCallTypeFilter] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [limit, setLimit] = useState(20)

  const [columns, setColumns] = useState<ToggleColumnDef[]>(DEFAULT_COLUMNS)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, DEFAULT_VISIBLE_IDS.has(c.id)]))
  )
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Fast path: localStorage
    const savedOrder = localStorage.getItem(`crm_col_order_${PAGE_NAME}`)
    const savedVis = localStorage.getItem(`crm_col_vis_${PAGE_NAME}`)
    if (savedOrder) {
      try {
        const order: string[] = JSON.parse(savedOrder)
        setColumns([
          ...order.map(id => DEFAULT_COLUMNS.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[],
          ...DEFAULT_COLUMNS.filter(c => !order.includes(c.id)),
        ])
      } catch {}
    }
    if (savedVis) {
      try { setVisibleColumns(JSON.parse(savedVis)) } catch {}
    }

    // DB sync — overwrites localStorage when it arrives
    userPreferencesAPI.getUserPreferences(PAGE_NAME)
      .then(prefs => {
        if (!prefs) return
        if (prefs.columnOrder) {
          try {
            const order: string[] = JSON.parse(prefs.columnOrder)
            setColumns([
              ...order.map(id => DEFAULT_COLUMNS.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[],
              ...DEFAULT_COLUMNS.filter(c => !order.includes(c.id)),
            ])
            localStorage.setItem(`crm_col_order_${PAGE_NAME}`, prefs.columnOrder)
          } catch {}
        }
        if (prefs.columnVisibility) {
          try {
            setVisibleColumns(JSON.parse(prefs.columnVisibility))
            localStorage.setItem(`crm_col_vis_${PAGE_NAME}`, prefs.columnVisibility)
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
  const [selected, setSelected] = useState<HelpDeskTicket | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })
  const [orgs, setOrgs] = useState<{ id: number; name: string }[]>([])
  const [adminUsers, setAdminUsers] = useState<User[]>([])
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false)
  const [userPopoverOpen, setUserPopoverOpen] = useState(false)

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 })
      .then(r => setOrgs(r.data.organizations.map((o: any) => ({ id: o.id, name: o.denomination || o.name }))))
      .catch(() => {})
    usersAPI.getAdminUsers()
      .then(r => setAdminUsers(r.data.users))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const state = location.state as { openCreate?: boolean; prefill?: Partial<typeof emptyForm> } | null
    if (state?.openCreate) {
      setFormData({ ...emptyForm, ...(state.prefill ?? {}) })
      setIsCreateOpen(true)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const response = await helpdeskAPI.getAll({
        page, limit, search: searchQuery,
        status: statusFilter || undefined,
        callType: callTypeFilter || undefined,
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
  }, [searchQuery, statusFilter, callTypeFilter, limit])

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
      setOrgPopoverOpen(false)
      setUserPopoverOpen(false)
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
      setOrgPopoverOpen(false)
      setUserPopoverOpen(false)
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
      title: item.title, status: item.status,
      callType: item.callType || "", ticketOrigin: item.ticketOrigin || "",
      organizationId: item.organizationId?.toString() || "",
      assignedToId: item.assignedToId?.toString() || "",
      description: item.description || "",
    })
    setIsEditOpen(true)
  }

  const getUserLabel = (userId: string) => {
    const u = adminUsers.find(u => u.id.toString() === userId)
    if (!u) return "Seleziona..."
    return `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
  }

  const renderForm = () => (
    <div className="space-y-5">
      <div>
        <Label>Titolo *</Label>
        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Stato</Label>
          <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo Chiamata</Label>
          <Select value={formData.callType} onValueChange={v => setFormData({ ...formData, callType: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>{CALL_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Origine</Label>
          <Select value={formData.ticketOrigin} onValueChange={v => setFormData({ ...formData, ticketOrigin: v })}>
            <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
            <SelectContent>{ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Assegnato a</Label>
          <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={userPopoverOpen} className="w-full justify-between font-normal">
                <span className="truncate">{formData.assignedToId ? getUserLabel(formData.assignedToId) : "Seleziona..."}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cerca utente..." />
                <CommandList>
                  <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => { setFormData({ ...formData, assignedToId: '' }); setUserPopoverOpen(false) }}>
                      <Check className={cn("mr-2 h-4 w-4", !formData.assignedToId ? "opacity-100" : "opacity-0")} />
                      <span className="text-muted-foreground italic">Nessuno</span>
                    </CommandItem>
                    {adminUsers.map(u => {
                      const label = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username
                      return (
                        <CommandItem key={u.id} value={label} onSelect={() => { setFormData({ ...formData, assignedToId: u.id.toString() }); setUserPopoverOpen(false) }}>
                          <Check className={cn("mr-2 h-4 w-4", formData.assignedToId === u.id.toString() ? "opacity-100" : "opacity-0")} />
                          {label}
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="col-span-2">
          <Label>Organizzazione</Label>
          <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={orgPopoverOpen} className="w-full justify-between font-normal">
                <span className="truncate">
                  {formData.organizationId
                    ? orgs.find(o => o.id.toString() === formData.organizationId)?.name ?? 'Seleziona...'
                    : 'Seleziona...'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cerca organizzazione..." />
                <CommandList>
                  <CommandEmpty>Nessuna organizzazione trovata.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => { setFormData({ ...formData, organizationId: '' }); setOrgPopoverOpen(false) }}>
                      <Check className={cn("mr-2 h-4 w-4", !formData.organizationId ? "opacity-100" : "opacity-0")} />
                      <span className="text-muted-foreground italic">Nessuna</span>
                    </CommandItem>
                    {orgs.map(o => (
                      <CommandItem key={o.id} value={o.name} onSelect={() => { setFormData({ ...formData, organizationId: o.id.toString() }); setOrgPopoverOpen(false) }}>
                        <Check className={cn("mr-2 h-4 w-4", formData.organizationId === o.id.toString() ? "opacity-100" : "opacity-0")} />
                        {o.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div><Label>Descrizione</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
    </div>
  )

  const renderCell = (columnId: string, item: HelpDeskTicket) => {
    switch (columnId) {
      case "createdAt":    return <TableCell key={columnId} className="tabular-nums text-sm">{new Date(item.createdAt).toLocaleDateString("it-IT")}</TableCell>
      case "orgCode":      return <TableCell key={columnId} className="font-mono text-sm">{item.organization?.code || "-"}</TableCell>
      case "organization": return <TableCell key={columnId}>{item.organization?.denomination || item.organization?.name || "-"}</TableCell>
      case "title":        return <TableCell key={columnId} className="font-medium">{item.title}</TableCell>
      case "assignedTo":   return <TableCell key={columnId}>{item.assignedTo ? `${item.assignedTo.firstName || ""} ${item.assignedTo.lastName || ""}`.trim() || item.assignedTo.username : "-"}</TableCell>
      case "callType":     return <TableCell key={columnId}>{item.callType || "-"}</TableCell>
      case "description":  return <TableCell key={columnId} className="max-w-[200px] truncate">{item.description || "-"}</TableCell>
      case "status":       return <TableCell key={columnId}><Badge className={STATUS_COLORS[item.status] || ""}>{item.status}</Badge></TableCell>
      case "ticketNumber": return <TableCell key={columnId} className="font-mono text-sm">{item.ticketNumber}</TableCell>
      default: return null
    }
  }

  const visibleCols = columns.filter(c => isColVisible(c.id))

  // client-side industry filter on loaded tickets
  const filteredItems = industryFilter
    ? items.filter(t => t.organization?.industry === industryFilter)
    : items

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

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti gli stati</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={callTypeFilter} onValueChange={v => { setCallTypeFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tipo Chiamata" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti i tipi</SelectItem>{CALL_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={industryFilter} onValueChange={v => setIndustryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Settore" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tutti i settori</SelectItem>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
          </Select>
          <ColumnToggle columns={columns} visibleColumns={visibleColumns} onToggle={toggleColumn} onReorder={handleReorder} />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleCols.map(col => <TableHead key={col.id}>{col.label}</TableHead>)}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={visibleCols.length + 1} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow><TableCell colSpan={visibleCols.length + 1} className="text-center py-8 text-muted-foreground">Nessun ticket trovato</TableCell></TableRow>
              ) : filteredItems.map(item => (
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
            <DialogHeader><DialogTitle>Nuovo Ticket</DialogTitle><DialogDescription>Crea un nuovo ticket di assistenza.</DialogDescription></DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Modifica Ticket</DialogTitle><DialogDescription>Modifica i dati del ticket.</DialogDescription></DialogHeader>
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
                <Badge className={STATUS_COLORS[selected?.status || ""] || ""}>{selected?.status}</Badge>
                {selected?.ticketNumber} — {selected?.title}
              </DialogTitle>
              <DialogDescription>Dettagli ticket</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Data:</span> {new Date(selected.createdAt).toLocaleDateString("it-IT")}</div>
                  <div><span className="font-medium">Tipo Chiamata:</span> {selected.callType || "-"}</div>
                  <div><span className="font-medium">Codice Ufficio:</span> <span className="font-mono">{selected.organization?.code || "-"}</span></div>
                  <div><span className="font-medium">Denominazione Uff.:</span> {selected.organization?.denomination || selected.organization?.name || "-"}</div>
                  <div><span className="font-medium">Settore:</span> {selected.organization?.industry || "-"}</div>
                  <div><span className="font-medium">Origine:</span> {selected.ticketOrigin || "-"}</div>
                  {selected.assignedTo && <div><span className="font-medium">Assegnato a:</span> {`${selected.assignedTo.firstName || ""} ${selected.assignedTo.lastName || ""}`.trim() || selected.assignedTo.username}</div>}
                  {selected.organization?.coordinator && (
                    <div><span className="font-medium">Coordinatrice:</span> {selected.organization.coordinator}</div>
                  )}
                  {selected.organization?.legalRep && (
                    <div><span className="font-medium">Legale Rappresentante:</span> {selected.organization.legalRep}</div>
                  )}
                </div>
                {selected.description && <div><span className="font-medium text-sm">Descrizione:</span><p className="text-sm mt-1 whitespace-pre-wrap bg-muted p-3 rounded">{selected.description}</p></div>}
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
