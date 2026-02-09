"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Code, Terminal, Database, Zap } from "lucide-react"

export default function SandboxPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [apiEndpoint, setApiEndpoint] = useState("")
  const [apiMethod, setApiMethod] = useState("GET")
  const [apiBody, setApiBody] = useState("")
  const [apiResponse, setApiResponse] = useState("")
  const [loading, setLoading] = useState(false)

  // Role protection - redirect if not DEVELOPER
  useEffect(() => {
    if (user && user.role !== 'DEVELOPER') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const testApiCall = async () => {
    if (!apiEndpoint) {
      toast.error("Inserisci un endpoint")
      return
    }

    try {
      setLoading(true)
      setApiResponse("Loading...")

      let response
      const endpoint = apiEndpoint.startsWith("/") ? apiEndpoint : `/${apiEndpoint}`

      switch (apiMethod) {
        case "GET":
          response = await api.get(endpoint)
          break
        case "POST":
          response = await api.post(endpoint, apiBody ? JSON.parse(apiBody) : {})
          break
        case "PUT":
          response = await api.put(endpoint, apiBody ? JSON.parse(apiBody) : {})
          break
        case "DELETE":
          response = await api.delete(endpoint)
          break
        default:
          response = await api.get(endpoint)
      }

      setApiResponse(JSON.stringify(response.data, null, 2))
      toast.success("Richiesta completata")
    } catch (error: any) {
      const errorData = error.response?.data || error.message
      setApiResponse(JSON.stringify(errorData, null, 2))
      toast.error("Errore nella richiesta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <BaseLayout
      title="Developer Sandbox"
      description="Strumenti di sviluppo e testing"
    >
      <div className="px-4 lg:px-6 space-y-6">
        <Tabs defaultValue="api" className="w-full">
          <TabsList>
            <TabsTrigger value="api">
              <Terminal className="mr-2 h-4 w-4" />
              API Tester
            </TabsTrigger>
            <TabsTrigger value="info">
              <Database className="mr-2 h-4 w-4" />
              System Info
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Zap className="mr-2 h-4 w-4" />
              Quick Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  API Tester
                </CardTitle>
                <CardDescription>
                  Testa le API del backend direttamente dalla dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-32">
                    <Label>Metodo</Label>
                    <select
                      value={apiMethod}
                      onChange={(e) => setApiMethod(e.target.value)}
                      className="w-full mt-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <Label>Endpoint</Label>
                    <Input
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                      placeholder="/api/users"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={testApiCall} disabled={loading}>
                      {loading ? "..." : "Invia"}
                    </Button>
                  </div>
                </div>

                {(apiMethod === "POST" || apiMethod === "PUT") && (
                  <div>
                    <Label>Body (JSON)</Label>
                    <Textarea
                      value={apiBody}
                      onChange={(e) => setApiBody(e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={4}
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                )}

                <div>
                  <Label>Response</Label>
                  <pre className="mt-1 p-4 bg-muted rounded-lg overflow-auto max-h-96 text-sm font-mono">
                    {apiResponse || "Nessuna risposta"}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Sistema</CardTitle>
                <CardDescription>
                  Dettagli tecnici dell'ambiente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Environment</p>
                    <p className="text-sm text-muted-foreground">
                      {import.meta.env.MODE}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">API URL</p>
                    <p className="text-sm text-muted-foreground">
                      {import.meta.env.VITE_API_URL || "Non configurato"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Build Time</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date().toISOString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">User Agent</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {navigator.userAgent.substring(0, 50)}...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Tools</CardTitle>
                <CardDescription>
                  Strumenti rapidi per il debug
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.clear()
                      toast.success("LocalStorage svuotato")
                    }}
                  >
                    Clear LocalStorage
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      sessionStorage.clear()
                      toast.success("SessionStorage svuotato")
                    }}
                  >
                    Clear SessionStorage
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.clear()
                      toast.success("Console svuotata")
                    }}
                  >
                    Clear Console
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.reload()
                    }}
                  >
                    Reload Page
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Console Log</p>
                  <div className="flex gap-2">
                    <Input
                      id="consoleLog"
                      placeholder="Messaggio da loggare..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const input = e.target as HTMLInputElement
                          console.log("[Sandbox]", input.value)
                          toast.success("Loggato in console")
                          input.value = ""
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById("consoleLog") as HTMLInputElement
                        if (input?.value) {
                          console.log("[Sandbox]", input.value)
                          toast.success("Loggato in console")
                          input.value = ""
                        }
                      }}
                    >
                      Log
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BaseLayout>
  )
}
