"use client"

import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { serviceContractsAPI, type ServiceContract } from "@/lib/service-contracts-api"

const STATUS_COLORS: Record<string, string> = {
  "Attivo":                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Scaduto":                 "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "Non attivo":              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  "In attesa fatturazione":  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Blocco Amministrativo":   "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "In attesa pagamento":     "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

export default function ServiceContractTypeDetailPage() {
  const navigate = useNavigate()
  const { typeName } = useParams<{ typeName: string }>()
  const decodedType = decodeURIComponent(typeName || "")

  const [contracts, setContracts] = useState<ServiceContract[]>([])
  const [loading, setLoading] = useState(true)

  // Rename
  const [showRename, setShowRename] = useState(false)
  const [newName, setNewName] = useState("")
  const [confirmRename, setConfirmRename] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadContracts = async () => {
    if (!decodedType) return
    try {
      setLoading(true)
      const res = await serviceContractsAPI.getAll({ contractType: decodedType, limit: 500 })
      setContracts(res.data.contracts)
    } catch (err: any) {
      toast.error(err.message || "Errore nel caricamento")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadContracts() }, [decodedType])

  const openRename = () => {
    setNewName(decodedType)
    setShowRename(true)
  }

  const handleRenameSubmit = () => {
    if (!newName.trim() || newName.trim() === decodedType) { setShowRename(false); return }
    setShowRename(false)
    setConfirmRename(true)
  }

  const executeRename = async () => {
    try {
      setSubmitting(true)
      await serviceContractsAPI.renameType(decodedType, newName.trim())
      toast.success(`Tipo rinominato: "${decodedType}" → "${newName.trim()}"`)
      setConfirmRename(false)
      navigate(`/service-contracts/settings/type/${encodeURIComponent(newName.trim())}`, { replace: true })
    } catch (err: any) {
      toast.error(err.message || "Errore nella rinomina")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"
  const formatCurrency = (v: number | null) => v != null ? `€ ${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}` : "-"

  const totalValue = contracts.reduce((s, c) => s + (c.contractValue || 0), 0)
  const activeCount = contracts.filter(c => c.status === "Attivo").length

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/service-contracts/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{decodedType}</h1>
              <p className="text-muted-foreground">
                {contracts.length} contratt{contracts.length === 1 ? "o" : "i"} · {activeCount} attiv{activeCount === 1 ? "o" : "i"} · Valore totale {formatCurrency(totalValue)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openRename}>
              <Pencil className="mr-2 h-4 w-4" />Rinomina
            </Button>
            <Button onClick={() => navigate(`/service-contracts?contractType=${encodeURIComponent(decodedType)}`)}>
              <ExternalLink className="mr-2 h-4 w-4" />Apri nella lista
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : contracts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nessun contratto trovato per questo tipo</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Organizzazione</TableHead>
                  <TableHead>Denominazione ufficio</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Valore</TableHead>
                  <TableHead>Inizio</TableHead>
                  <TableHead>Scadenza</TableHead>
                  <TableHead>Prossima fattura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.contractNumber}</TableCell>
                    <TableCell>{c.organization?.name || "-"}</TableCell>
                    <TableCell>{c.organization?.denomination || "-"}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[c.status] || ""}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(c.contractValue)}</TableCell>
                    <TableCell>{formatDate(c.startDate)}</TableCell>
                    <TableCell>{formatDate(c.dueDate)}</TableCell>
                    <TableCell>{formatDate(c.nextInvoiceDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Rename dialog */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rinomina tipo contratto</DialogTitle>
            <DialogDescription>Questo tipo è usato da {contracts.length} contratt{contracts.length === 1 ? "o" : "i"}.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Nuovo nome</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && handleRenameSubmit()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRename(false)}>Annulla</Button>
            <Button onClick={handleRenameSubmit} disabled={!newName.trim() || newName.trim() === decodedType}>Rinomina</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation */}
      <AlertDialog open={confirmRename} onOpenChange={setConfirmRename}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma rinomina</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per rinominare "{decodedType}" in "{newName.trim()}". Questa operazione aggiornerà {contracts.length} contratt{contracts.length === 1 ? "o" : "i"}.
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
