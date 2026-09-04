"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Pencil, Loader2, AlertTriangle, ChevronRight, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { serviceContractsAPI, type ServiceContract } from "@/lib/service-contracts-api"

interface ContractType {
  name: string
  count: number
}

const STATUS_COLORS: Record<string, string> = {
  "Attivo":                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Scaduto":                 "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Non attivo":              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  "In attesa fatturazione":  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Blocco Amministrativo":   "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "In attesa pagamento":     "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

export default function ServiceContractSettingsPage() {
  const navigate = useNavigate()
  const [types, setTypes] = useState<ContractType[]>([])
  const [loading, setLoading] = useState(true)

  // Detail view state
  const [selectedType, setSelectedType] = useState<ContractType | null>(null)
  const [typeContracts, setTypeContracts] = useState<ServiceContract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(false)

  // Rename state
  const [renameTarget, setRenameTarget] = useState<ContractType | null>(null)
  const [newName, setNewName] = useState("")
  const [confirmRename, setConfirmRename] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadTypes = async () => {
    try {
      setLoading(true)
      const res = await serviceContractsAPI.getTypes()
      setTypes(res.data)
    } catch (err: any) {
      toast.error(err.message || "Errore nel caricamento")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTypes() }, [])

  const openDetail = async (t: ContractType) => {
    setSelectedType(t)
    setTypeContracts([])
    setLoadingContracts(true)
    try {
      const res = await serviceContractsAPI.getAll({ contractType: t.name, limit: 500 })
      setTypeContracts(res.data.contracts)
    } catch (err: any) {
      toast.error(err.message || "Errore nel caricamento contratti")
    } finally {
      setLoadingContracts(false)
    }
  }

  const openRename = (t: ContractType, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedType(null)
    setRenameTarget(t)
    setNewName(t.name)
  }

  const openRenameFromDetail = () => {
    if (!selectedType) return
    const t = selectedType
    setSelectedType(null)
    setRenameTarget(t)
    setNewName(t.name)
  }

  const handleRenameSubmit = () => {
    if (!newName.trim() || !renameTarget) return
    if (newName.trim() === renameTarget.name) { setRenameTarget(null); return }
    setConfirmRename(true)
  }

  const executeRename = async () => {
    if (!renameTarget || !newName.trim()) return
    try {
      setSubmitting(true)
      await serviceContractsAPI.renameType(renameTarget.name, newName.trim())
      toast.success(`Tipo rinominato: "${renameTarget.name}" → "${newName.trim()}"`)
      setRenameTarget(null)
      setConfirmRename(false)
      loadTypes()
    } catch (err: any) {
      toast.error(err.message || "Errore nella rinomina")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"
  const formatCurrency = (v: number | null) => v != null ? `€ ${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "-"
  const totalContracts = types.reduce((s, t) => s + t.count, 0)

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6 max-w-5xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/service-contracts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestione Tipi Contratto</h1>
            <p className="text-muted-foreground">{types.length} tipi · {totalContracts} contratti totali</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Le modifiche ai tipi influenzano i contratti esistenti. Rinominare un tipo aggiorna tutti i contratti associati.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : types.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nessun tipo contratto trovato</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map(t => (
              <Card key={t.name} className="group cursor-pointer hover:bg-accent/40 transition-colors" onClick={() => openDetail(t)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{t.name}</p>
                    <Badge variant="secondary" className="mt-1">{t.count} contratt{t.count === 1 ? "o" : "i"}</Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => openRename(t, e)}
                      title="Rinomina"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog — contracts list */}
      <Dialog open={!!selectedType} onOpenChange={open => { if (!open) setSelectedType(null) }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedType?.name}
              <Badge variant="secondary">{selectedType?.count} contratt{selectedType?.count === 1 ? "o" : "i"}</Badge>
            </DialogTitle>
            <DialogDescription>
              Contratti associati a questo tipo. La rinomina aggiornerà tutti questi contratti.
            </DialogDescription>
          </DialogHeader>

          {loadingContracts ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : typeContracts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nessun contratto trovato</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Organizzazione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Valore</TableHead>
                    <TableHead>Inizio</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeContracts.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.contractNumber}</TableCell>
                      <TableCell>{c.organization?.denomination || c.organization?.name || "-"}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[c.status] || ""}>{c.status}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(c.contractValue)}</TableCell>
                      <TableCell>{formatDate(c.startDate)}</TableCell>
                      <TableCell>{formatDate(c.dueDate)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => navigate(`/service-contracts?contractType=${encodeURIComponent(selectedType!.name)}`)}
                          title="Apri nella lista contratti"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedType(null)}>Chiudi</Button>
            <Button variant="outline" onClick={openRenameFromDetail}>
              <Pencil className="mr-2 h-4 w-4" />Rinomina tipo
            </Button>
            <Button onClick={() => navigate(`/service-contracts?contractType=${encodeURIComponent(selectedType!.name)}`)}>
              <ExternalLink className="mr-2 h-4 w-4" />Vedi nella lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget && !confirmRename} onOpenChange={open => { if (!open) setRenameTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rinomina tipo contratto</DialogTitle>
            <DialogDescription>
              Questo tipo è usato da {renameTarget?.count} contratt{renameTarget?.count === 1 ? "o" : "i"}.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nuovo nome</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && handleRenameSubmit()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Annulla</Button>
            <Button onClick={handleRenameSubmit} disabled={!newName.trim() || newName.trim() === renameTarget?.name}>Rinomina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation */}
      <AlertDialog open={confirmRename} onOpenChange={setConfirmRename}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma rinomina</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per rinominare "{renameTarget?.name}" in "{newName.trim()}". Questa operazione aggiornerà {renameTarget?.count} contratt{renameTarget?.count === 1 ? "o" : "i"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmRename(false)}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={executeRename} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BaseLayout>
  )
}
