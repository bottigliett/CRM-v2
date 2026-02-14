"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useModuleSettingsStore } from "@/store/module-settings-store"
import { useNavigate } from "react-router-dom"
import { Settings2, Eye, EyeOff, RefreshCw, ExternalLink } from "lucide-react"

// Map module names to their routes
const moduleRoutes: Record<string, string> = {
  dashboard: "/dashboard",
  on_duty: "/on-duty",
  lead_board: "/lead-board",
  contacts: "/contacts",
  clients: "/clients",
  tickets: "/tickets",
  organizations: "/organizations",
  helpdesk: "/helpdesk",
  calendar: "/calendar",
  tasks: "/tasks",
  projects: "/projects",
  finance: "/finance",
  invoices: "/invoices",
  service_contracts: "/service-contracts",
  vt_quotes: "/vt-quotes",
  sales_orders: "/sales-orders",
}

export function ModuleSettings() {
  const { modules, isLoading, fetchModules, toggleModule } = useModuleSettingsStore()
  const [updating, setUpdating] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  const handleToggle = async (moduleName: string, currentState: boolean) => {
    setUpdating(moduleName)
    try {
      await toggleModule(moduleName, !currentState)
      toast.success(`Modulo "${moduleName}" ${!currentState ? 'attivato' : 'disattivato'}`)
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'aggiornamento')
    } finally {
      setUpdating(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Page Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Page Visibility
            </CardTitle>
            <CardDescription>
              Gestisci la visibilità globale delle pagine. Le pagine disabilitate non appariranno nella sidebar per gli altri utenti.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchModules()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nessun modulo trovato.</p>
            <p className="text-sm mt-2">Verifica che il backend sia aggiornato e che la tabella module_settings contenga dati.</p>
          </div>
        ) : (
        <div className="space-y-3">
          {modules.map((module) => (
            <div
              key={module.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                module.isEnabled
                  ? 'bg-card hover:bg-muted/50'
                  : 'bg-muted/30 opacity-75'
              }`}
            >
              <div className="flex items-center gap-3">
                {module.isEnabled ? (
                  <Eye className="h-5 w-5 text-green-500" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{module.label}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {module.moduleName}
                    </Badge>
                    {!module.isEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        Nascosto
                      </Badge>
                    )}
                  </div>
                  {module.description && (
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {moduleRoutes[module.moduleName] && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(moduleRoutes[module.moduleName])}
                    title={`Apri ${module.label}`}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Apri
                  </Button>
                )}
                <Switch
                  checked={module.isEnabled}
                  onCheckedChange={() => handleToggle(module.moduleName, module.isEnabled)}
                  disabled={updating === module.moduleName}
                />
              </div>
            </div>
          ))}
        </div>
        )}

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Le pagine disabilitate non appaiono nella sidebar per nessun ruolo.
            Come Developer puoi comunque accedervi tramite il bottone "Apri" qui sopra o navigando direttamente all'URL.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
