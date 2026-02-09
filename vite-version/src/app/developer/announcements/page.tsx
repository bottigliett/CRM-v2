"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Pencil, Trash2, Info, AlertTriangle, Wrench, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { announcementsAPI, type SystemAnnouncement, type CreateAnnouncementData } from "@/lib/announcements-api"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const typeConfig = {
  INFO: { label: "Info", icon: Info, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  WARNING: { label: "Avviso", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  MAINTENANCE: { label: "Manutenzione", icon: Wrench, color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  CRITICAL: { label: "Critico", icon: AlertCircle, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
}

const roleOptions = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "ADMIN", label: "Admin" },
  { value: "USER", label: "Utente" },
  { value: "CLIENT", label: "Cliente" },
]

export default function AnnouncementsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<SystemAnnouncement | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: "",
    message: "",
    type: "INFO",
    priority: 0,
    targetRoles: null,
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: null,
  })
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)

  // Role protection - redirect if not DEVELOPER
  useEffect(() => {
    if (user && user.role !== 'DEVELOPER') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await announcementsAPI.getAll()
      setAnnouncements(data)
    } catch (error) {
      console.error("Error loading announcements:", error)
      toast.error("Errore nel caricamento degli annunci")
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingAnnouncement(null)
    setFormData({
      title: "",
      message: "",
      type: "INFO",
      priority: 0,
      targetRoles: null,
      startsAt: new Date().toISOString().slice(0, 16),
      endsAt: null,
    })
    setSelectedRoles([])
    setIsActive(true)
    setDialogOpen(true)
  }

  const openEditDialog = (announcement: SystemAnnouncement) => {
    setEditingAnnouncement(announcement)
    const targetRoles = announcement.targetRoles ? JSON.parse(announcement.targetRoles) : []
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      targetRoles: targetRoles.length > 0 ? targetRoles : null,
      startsAt: announcement.startsAt.slice(0, 16),
      endsAt: announcement.endsAt ? announcement.endsAt.slice(0, 16) : null,
    })
    setSelectedRoles(targetRoles)
    setIsActive(announcement.isActive)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title || !formData.message) {
      toast.error("Titolo e messaggio sono obbligatori")
      return
    }

    try {
      setSaving(true)
      const dataToSend = {
        ...formData,
        targetRoles: selectedRoles.length > 0 ? selectedRoles : null,
      }

      if (editingAnnouncement) {
        await announcementsAPI.update(editingAnnouncement.id, {
          ...dataToSend,
          isActive,
        })
        toast.success("Annuncio aggiornato")
      } else {
        await announcementsAPI.create(dataToSend)
        toast.success("Annuncio creato")
      }

      setDialogOpen(false)
      loadAnnouncements()
    } catch (error) {
      console.error("Error saving announcement:", error)
      toast.error("Errore nel salvataggio")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Sei sicuro di voler eliminare questo annuncio?")) return

    try {
      await announcementsAPI.delete(id)
      toast.success("Annuncio eliminato")
      loadAnnouncements()
    } catch (error) {
      console.error("Error deleting announcement:", error)
      toast.error("Errore nell'eliminazione")
    }
  }

  const toggleActive = async (announcement: SystemAnnouncement) => {
    try {
      await announcementsAPI.update(announcement.id, {
        isActive: !announcement.isActive,
      })
      toast.success(announcement.isActive ? "Annuncio disattivato" : "Annuncio attivato")
      loadAnnouncements()
    } catch (error) {
      console.error("Error toggling announcement:", error)
      toast.error("Errore nell'aggiornamento")
    }
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  return (
    <BaseLayout
      title="Gestione Annunci"
      description="Crea e gestisci annunci di sistema per gli utenti"
      headerAction={
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Annuncio
        </Button>
      }
    >
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Annunci di Sistema</CardTitle>
            <CardDescription>
              Gli annunci attivi vengono mostrati a tutti gli utenti nella dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun annuncio presente
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Creato da</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => {
                    const config = typeConfig[announcement.type]
                    const Icon = config.icon
                    const targetRoles = announcement.targetRoles
                      ? JSON.parse(announcement.targetRoles)
                      : []

                    return (
                      <TableRow key={announcement.id}>
                        <TableCell>
                          <Switch
                            checked={announcement.isActive}
                            onCheckedChange={() => toggleActive(announcement)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={config.color}>
                            <Icon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{announcement.title}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {announcement.message}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {targetRoles.length === 0 ? (
                            <span className="text-muted-foreground">Tutti</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {targetRoles.map((role: string) => (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>
                              Da: {format(new Date(announcement.startsAt), "dd/MM/yyyy HH:mm", { locale: it })}
                            </div>
                            {announcement.endsAt && (
                              <div className="text-muted-foreground">
                                A: {format(new Date(announcement.endsAt), "dd/MM/yyyy HH:mm", { locale: it })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {announcement.createdBy.firstName || announcement.createdBy.username}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(announcement)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(announcement.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? "Modifica Annuncio" : "Nuovo Annuncio"}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement
                ? "Modifica i dettagli dell'annuncio"
                : "Crea un nuovo annuncio di sistema"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="es. Manutenzione programmata"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Messaggio *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Descrivi il contenuto dell'annuncio..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as CreateAnnouncementData["type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priorità</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Data inizio *</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endsAt">Data fine (opzionale)</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={formData.endsAt || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, endsAt: e.target.value || null })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ruoli destinatari</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Lascia vuoto per mostrare a tutti
              </p>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((role) => (
                  <div key={role.value} className="flex items-center gap-2">
                    <Checkbox
                      id={role.value}
                      checked={selectedRoles.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <label htmlFor={role.value} className="text-sm cursor-pointer">
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {editingAnnouncement && (
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Annuncio attivo</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : editingAnnouncement ? "Salva" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BaseLayout>
  )
}
