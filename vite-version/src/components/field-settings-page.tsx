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
import { getFieldValues, renameFieldValue, type FieldValue } from "@/lib/field-values-api"

interface FieldConfig {
  table: string
  field: string
  label: string  // e.g. "Tipo chiamata"
}

interface FieldSettingsPageProps {
  title: string
  backPath: string
  fields: FieldConfig[]
}

function FieldSection({ config, allSections }: { config: FieldConfig; allSections?: boolean }) {
  const [values, setValues] = useState<FieldValue[]>([])
  const [loading, setLoading] = useState(true)
  const [renameTarget, setRenameTarget] = useState<FieldValue | null>(null)
  const [newName, setNewName] = useState("")
  const [confirmRename, setConfirmRename] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const [mergeSource, setMergeSource] = useState("")
  const [mergeTarget, setMergeTarget] = useState("")
  const [confirmMerge, setConfirmMerge] = useState(false)

  const loadValues = async () => {
    try {
      setLoading(true)
      const data = await getFieldValues(config.table, config.field)
      setValues(data)
    } catch (err: any) {
      toast.error(err.message || "Errore")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadValues() }, [config.table, config.field])

  const openRename = (v: FieldValue, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setRenameTarget(v)
    setNewName(v.name)
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
      await renameFieldValue(config.table, config.field, renameTarget.name, newName.trim())
      toast.success(`"${renameTarget.name}" → "${newName.trim()}"`)
      setRenameTarget(null)
      setConfirmRename(false)
      loadValues()
    } catch (err: any) { toast.error(err.message) } finally { setSubmitting(false) }
  }

  const sourceType = values.find(v => v.name === mergeSource)
  const targetType = values.find(v => v.name === mergeTarget)

  const handleMergeSubmit = () => {
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return
    setShowMerge(false)
    setConfirmMerge(true)
  }

  const executeMerge = async () => {
    if (!mergeSource || !mergeTarget) return
    try {
      setSubmitting(true)
      await renameFieldValue(config.table, config.field, mergeSource, mergeTarget)
      toast.success(`"${mergeSource}" unito in "${mergeTarget}"`)
      setConfirmMerge(false)
      setMergeSource("")
      setMergeTarget("")
      loadValues()
    } catch (err: any) { toast.error(err.message) } finally { setSubmitting(false) }
  }

  const total = values.reduce((s, v) => s + v.count, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{config.label}</h2>
          <p className="text-sm text-muted-foreground">{values.length} valori · {total} record totali</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setMergeSource(""); setMergeTarget(""); setShowMerge(true) }} disabled={values.length < 2}>
          <Merge className="mr-2 h-3.5 w-3.5" />Unisci
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : values.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nessun valore trovato</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {values.map(v => (
            <Card key={v.name} className="group">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">{v.count}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => openRename(v, e)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Merge dialog */}
      <Dialog open={showMerge} onOpenChange={setShowMerge}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unisci valori — {config.label}</DialogTitle>
            <DialogDescription>Il valore sorgente verrà rinominato nel valore destinazione.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Da eliminare (sorgente)</Label>
              <Select value={mergeSource} onValueChange={v => { setMergeSource(v); if (v === mergeTarget) setMergeTarget("") }}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>{values.map(v => <SelectItem key={v.name} value={v.name}>{v.name} ({v.count})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destinazione (mantiene il nome)</Label>
              <Select value={mergeTarget} onValueChange={setMergeTarget}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>{values.filter(v => v.name !== mergeSource).map(v => <SelectItem key={v.name} value={v.name}>{v.name} ({v.count})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {mergeSource && mergeTarget && mergeSource !== mergeTarget && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground"><strong>{sourceType?.count || 0}</strong> record da "{mergeSource}" → "{mergeTarget}". Totale: <strong>{(sourceType?.count || 0) + (targetType?.count || 0)}</strong>.</p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMerge(false)}>Annulla</Button>
            <Button onClick={handleMergeSubmit} disabled={!mergeSource || !mergeTarget || mergeSource === mergeTarget}>Unisci</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge confirmation */}
      <AlertDialog open={confirmMerge} onOpenChange={setConfirmMerge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma unione</AlertDialogTitle>
            <AlertDialogDescription>
              Spostare {sourceType?.count || 0} record da "{mergeSource}" a "{mergeTarget}"? Operazione non reversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={executeMerge} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget && !confirmRename} onOpenChange={open => { if (!open) setRenameTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rinomina — {config.label}</DialogTitle>
            <DialogDescription>Usato da {renameTarget?.count} record.</DialogDescription>
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
              Rinominare "{renameTarget?.name}" in "{newName.trim()}"? Aggiornerà {renameTarget?.count} record.
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
    </div>
  )
}

export default function FieldSettingsPage({ title, backPath, fields }: FieldSettingsPageProps) {
  const navigate = useNavigate()

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-md border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Le modifiche influenzano i record esistenti. Rinominare un valore aggiorna tutti i record associati.
          </p>
        </div>

        <div className="space-y-8">
          {fields.map((f, i) => (
            <div key={`${f.table}-${f.field}`}>
              {i > 0 && <Separator className="mb-8" />}
              <FieldSection config={f} />
            </div>
          ))}
        </div>
      </div>
    </BaseLayout>
  )
}
