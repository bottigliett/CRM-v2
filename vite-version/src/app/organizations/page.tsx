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
  Plus, Search, MoreHorizontal, Edit, Trash2, Loader2, Eye, Building2,
} from "lucide-react"
import { organizationsAPI, type Organization } from "@/lib/organizations-api"
import { toast } from "sonner"

const INDUSTRIES = ["Tecnologia", "Edilizia", "Commercio", "Servizi", "Manifattura", "Sanità", "Istruzione", "Altro"]
const ACCOUNT_TYPES = ["NO Contratto", "SI Contratto"]

const emptyForm = {
  name: "", vatNumber: "", uniqueCode: "", pec: "", isActive: true, code: "",
  denomination: "", phone: "", otherPhone: "", mobile: "", fax: "", email: "",
  employees: "", industry: "", accountType: "", devices: "", parentId: "",
  nasInfo: "", shareholders: "", nasContract: "", legalRep: "", secretary: "",
  assignedToId: "", priceList: "",
  billStreet: "", billCity: "", billState: "", billCode: "", billCountry: "",
  shipStreet: "", shipCity: "", shipState: "", shipCode: "", shipCountry: "",
  bankName: "", iban: "", description: "",
}

export default function OrganizationsPage() {
  const [items, setItems] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [industryFilter, setIndustryFilter] = useState("")
  const [accountTypeFilter, setAccountTypeFilter] = useState("")
  const [isActiveFilter, setIsActiveFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

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
      const response = await organizationsAPI.getAll({
        page, limit: 20, search: searchQuery,
        industry: industryFilter || undefined,
        accountType: accountTypeFilter || undefined,
        isActive: isActiveFilter || undefined,
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
  }, [searchQuery, industryFilter, accountTypeFilter, isActiveFilter])

  useEffect(() => {
    const timer = setTimeout(() => loadData(), searchQuery ? 500 : 0)
    return () => clearTimeout(timer)
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
      name: item.name || "", vatNumber: item.vatNumber || "", uniqueCode: item.uniqueCode || "",
      pec: item.pec || "", isActive: item.isActive, code: item.code || "",
      denomination: item.denomination || "", phone: item.phone || "", otherPhone: item.otherPhone || "",
      mobile: item.mobile || "", fax: item.fax || "", email: item.email || "",
      employees: item.employees?.toString() || "", industry: item.industry || "",
      accountType: item.accountType || "", devices: item.devices || "",
      parentId: item.parentId?.toString() || "", nasInfo: item.nasInfo || "",
      shareholders: item.shareholders || "", nasContract: item.nasContract || "",
      legalRep: item.legalRep || "", secretary: item.secretary || "",
      assignedToId: item.assignedToId?.toString() || "", priceList: item.priceList || "",
      billStreet: item.billStreet || "", billCity: item.billCity || "",
      billState: item.billState || "", billCode: item.billCode || "", billCountry: item.billCountry || "",
      shipStreet: item.shipStreet || "", shipCity: item.shipCity || "",
      shipState: item.shipState || "", shipCode: item.shipCode || "", shipCountry: item.shipCountry || "",
      bankName: item.bankName || "", iban: item.iban || "", description: item.description || "",
    })
    setIsEditOpen(true)
  }

  const renderForm = () => (
    <Tabs defaultValue="generale" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="generale">Generale</TabsTrigger>
        <TabsTrigger value="indirizzi">Indirizzi</TabsTrigger>
        <TabsTrigger value="banca">Banca</TabsTrigger>
        <TabsTrigger value="altro">Altro</TabsTrigger>
      </TabsList>
      <TabsContent value="generale" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Nome *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
          <div><Label>P.IVA</Label><Input value={formData.vatNumber} onChange={e => setFormData({ ...formData, vatNumber: e.target.value })} /></div>
          <div><Label>Codice Univoco (SDI)</Label><Input value={formData.uniqueCode} onChange={e => setFormData({ ...formData, uniqueCode: e.target.value })} /></div>
          <div><Label>PEC</Label><Input value={formData.pec} onChange={e => setFormData({ ...formData, pec: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
          <div><Label>Telefono</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
          <div><Label>Altro telefono</Label><Input value={formData.otherPhone} onChange={e => setFormData({ ...formData, otherPhone: e.target.value })} /></div>
          <div><Label>Cellulare</Label><Input value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} /></div>
          <div><Label>Fax</Label><Input value={formData.fax} onChange={e => setFormData({ ...formData, fax: e.target.value })} /></div>
          <div><Label>Codice</Label><Input value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} /></div>
          <div><Label>Denominazione</Label><Input value={formData.denomination} onChange={e => setFormData({ ...formData, denomination: e.target.value })} /></div>
          <div><Label>Dipendenti</Label><Input type="number" value={formData.employees} onChange={e => setFormData({ ...formData, employees: e.target.value })} /></div>
          <div>
            <Label>Settore</Label>
            <Select value={formData.industry} onValueChange={v => setFormData({ ...formData, industry: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={formData.accountType} onValueChange={v => setFormData({ ...formData, accountType: v })}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
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
      </TabsContent>
      <TabsContent value="banca" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Nome Banca</Label><Input value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} /></div>
          <div><Label>IBAN</Label><Input value={formData.iban} onChange={e => setFormData({ ...formData, iban: e.target.value })} /></div>
        </div>
      </TabsContent>
      <TabsContent value="altro" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Dispositivi</Label><Input value={formData.devices} onChange={e => setFormData({ ...formData, devices: e.target.value })} placeholder="NAS,PC,MAC" /></div>
          <div><Label>Listino</Label><Input value={formData.priceList} onChange={e => setFormData({ ...formData, priceList: e.target.value })} /></div>
          <div><Label>Contratto NAS</Label><Input value={formData.nasContract} onChange={e => setFormData({ ...formData, nasContract: e.target.value })} /></div>
          <div><Label>Info NAS</Label><Input value={formData.nasInfo} onChange={e => setFormData({ ...formData, nasInfo: e.target.value })} /></div>
          <div><Label>Legale Rappresentante</Label><Input value={formData.legalRep} onChange={e => setFormData({ ...formData, legalRep: e.target.value })} /></div>
          <div><Label>Segretaria</Label><Input value={formData.secretary} onChange={e => setFormData({ ...formData, secretary: e.target.value })} /></div>
          <div><Label>Compagine Sociale</Label><Input value={formData.shareholders} onChange={e => setFormData({ ...formData, shareholders: e.target.value })} /></div>
        </div>
        <div><Label>Descrizione</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
      </TabsContent>
    </Tabs>
  )

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

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} className="pl-10" />
          </div>
          <Select value={industryFilter} onValueChange={v => { setIndustryFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Settore" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i settori</SelectItem>
              {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={accountTypeFilter} onValueChange={v => { setAccountTypeFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              {ACCOUNT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={isActiveFilter} onValueChange={v => { setIsActiveFilter(v === "all" ? "" : v); setCurrentPage(1) }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="true">Attivi</SelectItem>
              <SelectItem value="false">Non attivi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>P.IVA</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Settore</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Assegnato a</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nessuna organizzazione trovata</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => { setSelected(item); setIsPreviewOpen(true) }}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.vatNumber || "-"}</TableCell>
                  <TableCell>{item.accountType || "-"}</TableCell>
                  <TableCell>{item.industry || "-"}</TableCell>
                  <TableCell>{item.phone || "-"}</TableCell>
                  <TableCell>{item.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Attivo" : "Non attivo"}
                    </Badge>
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

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuova Organizzazione</DialogTitle>
              <DialogDescription>Compila i campi per creare una nuova organizzazione.</DialogDescription>
            </DialogHeader>
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
            <DialogHeader>
              <DialogTitle>Modifica Organizzazione</DialogTitle>
              <DialogDescription>Modifica i dati dell'organizzazione.</DialogDescription>
            </DialogHeader>
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
              <DialogTitle>{selected?.name}</DialogTitle>
              <DialogDescription>Dettagli organizzazione</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">P.IVA:</span> {selected.vatNumber || "-"}</div>
                <div><span className="font-medium">Cod. Univoco:</span> {selected.uniqueCode || "-"}</div>
                <div><span className="font-medium">PEC:</span> {selected.pec || "-"}</div>
                <div><span className="font-medium">Email:</span> {selected.email || "-"}</div>
                <div><span className="font-medium">Telefono:</span> {selected.phone || "-"}</div>
                <div><span className="font-medium">Cellulare:</span> {selected.mobile || "-"}</div>
                <div><span className="font-medium">Settore:</span> {selected.industry || "-"}</div>
                <div><span className="font-medium">Tipo:</span> {selected.accountType || "-"}</div>
                <div><span className="font-medium">Stato:</span> <Badge variant={selected.isActive ? "default" : "secondary"}>{selected.isActive ? "Attivo" : "Non attivo"}</Badge></div>
                <div><span className="font-medium">Codice:</span> {selected.code || "-"}</div>
                {selected.billCity && <div><span className="font-medium">Indirizzo fatt.:</span> {selected.billStreet}, {selected.billCity} {selected.billState} {selected.billCode}</div>}
                {selected.bankName && <div><span className="font-medium">Banca:</span> {selected.bankName}</div>}
                {selected.iban && <div><span className="font-medium">IBAN:</span> {selected.iban}</div>}
                {selected.description && <div className="col-span-2"><span className="font-medium">Descrizione:</span> {selected.description}</div>}
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
              <AlertDialogTitle>Eliminare l'organizzazione?</AlertDialogTitle>
              <AlertDialogDescription>Questa azione non può essere annullata. L'organizzazione "{selected?.name}" verrà eliminata permanentemente.</AlertDialogDescription>
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
