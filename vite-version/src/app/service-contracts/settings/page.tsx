"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Pencil, Loader2, AlertTriangle, ChevronRight, Merge } from "lucide-react"
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { serviceContractsAPI } from "@/lib/service-contracts-api"

interface ContractType {
  name: string
  count: number
}

export default function ServiceContractSettingsPage() {
  const navigate = useNavigate()
  const [types, setTypes] = useState<ContractType[]>([])
  const [loading, setLoading] = useState(true)

  // Rename state
  const [renameTarget, setRenameTarget] = useState<ContractType | null>(null)
  const [newName, setNewName] = useState("")
  const [confirmRename, setConfirmRename] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Merge state
  const [showMerge, setShowMerge] = useState(false)
  const [mergeSource, setMergeSource] = useState("")
  const [mergeTarget, setMergeTarget] = useState("")
  const [confirmMerge, setConfirmMerge] = useState(false)

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

  const openRename = (t: ContractType, e?: React.MouseEvent) => {
    e?.stopPropagation()
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

  // Merge = rename source → target name
  const sourceType = types.find(t => t.name === mergeSource)
  const targetType = types.find(t => t.name === mergeTarget)

  const handleMergeSubmit = () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return
    setShowMerge(false)
    setConfirmMerge(true)
  }

  const executeMerge = async () => {
    if (!mergeSource || !mergeTarget) return
    try {
      setSubmitting(true)
      await serviceContractsAPI.renameType(mergeSource, mergeTarget)
      toast.success(`"${mergeSource}" unito in "${mergeTarget}" — ${sourceType?.count || 0} contratti spostati`)
      setConfirmMerge(false)
      setMergeSource("")
      setMergeTarget("")
      loadTypes()
    } catch (err: any) {
      toast.error(err.message || "Errore nell'unione")
    } finally {
      setSubmitting(false)
    }
  }

  const totalContracts = types.reduce((s, t) => s + t.count, 0)

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/service-contracts")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gestione Tipi Contratto</h1>
              <p className="text-muted-foreground">{types.length} tipi · {totalContracts} contratti totali</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { setMergeSource(""); setMergeTarget(""); setShowMerge(true) }} disabled={types.length < 2}>
            <Merge className="mr-2 h-4 w-4" />Unisci tipi
          </Button>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Le modifiche ai tipi influenzano i contratti esistenti. Clicca su un tipo per vedere i contratti associati.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : types.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Nessun tipo contratto trovato</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map(t => (
              <Card
                key={t.name}
                className="group cursor-pointer hover:bg-accent/40 transition-colors"
                onClick={() => navigate(`/service-contracts/settings/type/${encodeURIComponent(t.name)}`)}
              >
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

      {/* Merge dialog */}
      <Dialog open={showMerge} onOpenChange={setShowMerge}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unisci tipi contratto</DialogTitle>
            <DialogDescription>
              Tutti i contratti del tipo sorgente verranno spostati nel tipo destinazione. Il tipo sorgente scomparirà.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo da eliminare (sorgente)</Label>
              <Select value={mergeSource} onValueChange={v => { setMergeSource(v); if (v === mergeTarget) setMergeTarget("") }}>
                <SelectTrigger><SelectValue placeholder="Seleziona tipo..." /></SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t.name} value={t.name}>{t.name} ({t.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo destinazione (mantiene il nome)</Label>
              <Select value={mergeTarget} onValueChange={setMergeTarget}>
                <SelectTrigger><SelectValue placeholder="Seleziona tipo..." /></SelectTrigger>
                <SelectContent>
                  {types.filter(t => t.name !== mergeSource).map(t => (
                    <SelectItem key={t.name} value={t.name}>{t.name} ({t.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mergeSource && mergeTarget && mergeSource !== mergeTarget && (
              <>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  <p><strong>{sourceType?.count || 0}</strong> contratti da "{mergeSource}" verranno spostati in "{mergeTarget}".</p>
                  <p className="mt-1">Risultato: <strong>{(sourceType?.count || 0) + (targetType?.count || 0)}</strong> contratti in "{mergeTarget}".</p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMerge(false)}>Annulla</Button>
            <Button onClick={handleMergeSubmit} disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget}>
              Unisci
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge confirmation */}
      <AlertDialog open={confirmMerge} onOpenChange={setConfirmMerge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma unione</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per spostare {sourceType?.count || 0} contratti da "{mergeSource}" a "{mergeTarget}". Il tipo "{mergeSource}" scomparirà. Questa operazione non è reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmMerge(false)}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={executeMerge} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Conferma unione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Rename confirmation */}
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
