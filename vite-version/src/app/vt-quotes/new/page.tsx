"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Plus, Loader2, X, ChevronsUpDown, Check, ArrowLeft,
  Monitor, Server, Shield, Cpu, HardDrive, Globe, Printer, Phone,
  Wifi, Cloud, Database, Lock, Mail, Settings, Wrench, Headphones,
  Camera, Laptop, Tablet, Smartphone, FileText,
} from "lucide-react"
import { vtQuotesAPI } from "@/lib/vt-quotes-api"
import { productsAPI, type Product } from "@/lib/products-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { usersAPI, type User } from "@/lib/users-api"
import { toast } from "sonner"

const STAGES = ["Creato", "Scaduto", "Accettato", "Rifiutato", "Consegnato"]

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

interface FormItem {
  productId: string;
  itemName: string;
  description: string;
  icon: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  total: number;
}

const emptyItem: FormItem = {
  productId: "", itemName: "", description: "", icon: "",
  quantity: "1", unitPrice: "0", discount: "0", total: 0,
}

function getEmptyForm() {
  const d = new Date()
  d.setDate(d.getDate() + 15)
  return {
    subject: "", organizationId: "", assignedToId: "", stage: "Creato",
    validUntil: d.toISOString().split("T")[0], description: "", termsConditions: "",
    items: [{ ...emptyItem }],
  }
}

function calcItemTotal(item: FormItem): number {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.unitPrice) || 0
  const disc = parseFloat(item.discount) || 0
  return (price * qty) * (1 - disc / 100)
}

const fmtCurrency = (v: number) => `€ ${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`
const fmtDate = (d: string) => {
  if (!d) return ""
  try { return new Date(d).toLocaleDateString("it-IT") } catch { return d }
}

export default function VtQuoteCreatePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>(getEmptyForm())
  const [orgs, setOrgs] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false)
  const [productPopovers, setProductPopovers] = useState<Record<number, boolean>>({})
  const [adminUsers, setAdminUsers] = useState<User[]>([])

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 })
      .then(r => setOrgs(r.data.organizations.map((o: any) => ({
        id: o.id, name: o.name, denomination: o.denomination || "",
        billStreet: o.billStreet, billCity: o.billCity, billState: o.billState,
        billCode: o.billCode, billCountry: o.billCountry, vatNumber: o.vatNumber,
      })))).catch(() => {})
    productsAPI.getAll({ limit: 1000, isActive: 'true' })
      .then(r => setProducts(r.data.products)).catch(() => {})
    usersAPI.getAdminUsers().then(r => setAdminUsers(r.data.users)).catch(() => {})
  }, [])

  const updateFormItem = (index: number, field: string, value: string) => {
    setFormData((prev: any) => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      newItems[index].total = calcItemTotal(newItems[index])
      return { ...prev, items: newItems }
    })
  }

  const addFormItem = () => {
    setFormData((prev: any) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }))
  }

  const removeFormItem = (index: number) => {
    setFormData((prev: any) => {
      const newItems = prev.items.filter((_: any, i: number) => i !== index)
      return { ...prev, items: newItems.length > 0 ? newItems : [{ ...emptyItem }] }
    })
  }

  const selectProduct = (index: number, product: Product) => {
    setFormData((prev: any) => {
      const newItems = [...prev.items]
      newItems[index] = {
        ...newItems[index],
        productId: product.id.toString(),
        itemName: product.name,
        description: product.description || "",
        icon: product.icon || "",
        unitPrice: product.unitPrice.toString(),
      }
      newItems[index].total = calcItemTotal(newItems[index])
      return { ...prev, items: newItems }
    })
    setProductPopovers(prev => ({ ...prev, [index]: false }))
  }

  const validItems = (formData.items || []).filter((i: FormItem) => i.itemName)
  const hasDiscount = validItems.some((i: FormItem) => parseFloat(i.discount) > 0)
  const subtotal = (formData.items || []).reduce((sum: number, item: FormItem) => sum + (item.total || 0), 0)
  const vat = subtotal * 0.22
  const total = subtotal + vat

  const selectedOrg = orgs.find(o => o.id.toString() === formData.organizationId)
  const orgAddress = selectedOrg ? [selectedOrg.billStreet, selectedOrg.billCity, selectedOrg.billState, selectedOrg.billCode, selectedOrg.billCountry].filter(Boolean).join(", ") : ""

  const buildSubmitData = () => ({
    ...formData,
    items: formData.items.filter((i: FormItem) => i.itemName).map((i: FormItem) => ({
      productId: i.productId || null,
      itemName: i.itemName,
      description: i.description || null,
      icon: i.icon || null,
      quantity: parseInt(i.quantity) || 1,
      unitPrice: parseFloat(i.unitPrice) || 0,
      discount: parseFloat(i.discount) || 0,
      total: calcItemTotal(i),
    })),
  })

  const handleCreate = async () => {
    if (!formData.subject) { toast.error("L'oggetto è obbligatorio"); return }
    try {
      setSubmitting(true)
      await vtQuotesAPI.create(buildSubmitData())
      toast.success("Preventivo creato con successo!")
      navigate("/vt-quotes")
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  return (
    <BaseLayout>
      <div className="flex flex-col h-full">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/vt-quotes")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Nuovo Preventivo</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/vt-quotes")}>Annulla</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea Preventivo
            </Button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT — Form */}
          <div className="w-1/2 overflow-y-auto p-6 border-r">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Oggetto *</Label>
                  <Input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                </div>
                <div>
                  <Label>Stato</Label>
                  <Select value={formData.stage} onValueChange={v => setFormData({ ...formData, stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Denominazione ufficio</Label>
                  <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                        <span className="truncate">
                          {formData.organizationId
                            ? (() => { const o = orgs.find(o => o.id.toString() === formData.organizationId); return o ? (o.denomination || o.name) : "Seleziona..." })()
                            : "Seleziona..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca per denominazione o ragione sociale..." />
                        <CommandList>
                          <CommandEmpty>Nessuna organizzazione trovata.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="__none__" onSelect={() => { setFormData({ ...formData, organizationId: "" }); setOrgPopoverOpen(false) }}>
                              <Check className={cn("mr-2 h-4 w-4", !formData.organizationId ? "opacity-100" : "opacity-0")} />
                              <span className="text-muted-foreground italic">Nessuna</span>
                            </CommandItem>
                            {orgs.map(o => (
                              <CommandItem key={o.id} value={`${o.denomination} ${o.name}`} onSelect={() => { setFormData({ ...formData, organizationId: o.id.toString() }); setOrgPopoverOpen(false) }}>
                                <Check className={cn("mr-2 h-4 w-4", formData.organizationId === o.id.toString() ? "opacity-100" : "opacity-0")} />
                                <div>
                                  <div className="text-sm">{o.denomination || o.name}</div>
                                  {o.denomination && <div className="text-xs text-muted-foreground">{o.name}</div>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Organizzazione (ragione sociale)</Label>
                  <Input value={selectedOrg?.name || ""} disabled className="bg-muted/50" placeholder="Seleziona una denominazione ufficio..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valido fino a *</Label>
                  <Input type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} required />
                </div>
                <div>
                  <Label>Assegnato a</Label>
                  <Select value={formData.assignedToId?.toString() || "__none__"} onValueChange={v => setFormData({ ...formData, assignedToId: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nessuno</SelectItem>
                      {adminUsers.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.firstName} {u.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Descrizione</Label>
                <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Condizioni di pagamento</Label>
                <Textarea value={formData.termsConditions} onChange={e => setFormData({ ...formData, termsConditions: e.target.value })} rows={2} />
              </div>

              <Separator />

              {/* Quote Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Voci Preventivo</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addFormItem}>
                    <Plus className="mr-1 h-3 w-3" />Aggiungi voce
                  </Button>
                </div>

                <div className="space-y-3">
                  {(formData.items || []).map((item: FormItem, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-3 relative">
                      {formData.items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeFormItem(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}

                      <div className="grid grid-cols-[1fr_1fr] gap-3">
                        <div>
                          <Label className="text-xs">Prodotto da magazzino</Label>
                          <Popover open={productPopovers[idx] || false} onOpenChange={v => setProductPopovers(prev => ({ ...prev, [idx]: v }))}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full justify-between font-normal h-8 text-xs">
                                <span className="truncate">{item.productId ? products.find(p => p.id.toString() === item.productId)?.name || "Seleziona..." : "Seleziona prodotto..."}</span>
                                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Cerca prodotto..." />
                                <CommandList>
                                  <CommandEmpty>Nessun prodotto trovato.</CommandEmpty>
                                  <CommandGroup>
                                    {products.map(p => (
                                      <CommandItem key={p.id} value={p.name} onSelect={() => selectProduct(idx, p)}>
                                        <Check className={cn("mr-2 h-4 w-4", item.productId === p.id.toString() ? "opacity-100" : "opacity-0")} />
                                        <span className="flex items-center gap-2">
                                          {p.icon && ICON_MAP[p.icon]}
                                          {p.name}
                                          <span className="text-muted-foreground text-xs ml-auto">€ {p.unitPrice.toFixed(2)}</span>
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label className="text-xs">Nome voce *</Label>
                          <Input className="h-8 text-xs" value={item.itemName} onChange={e => updateFormItem(idx, "itemName", e.target.value)} />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Quantità</Label>
                          <Input className="h-8 text-xs" type="number" min="1" value={item.quantity} onChange={e => updateFormItem(idx, "quantity", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Prezzo unitario (€)</Label>
                          <Input className="h-8 text-xs" type="number" step="0.01" value={item.unitPrice} onChange={e => updateFormItem(idx, "unitPrice", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Sconto %</Label>
                          <Input className="h-8 text-xs" type="number" min="0" max="100" value={item.discount} onChange={e => updateFormItem(idx, "discount", e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Totale riga</Label>
                          <div className="h-8 flex items-center text-xs font-semibold">{fmtCurrency(item.total || 0)}</div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Descrizione voce</Label>
                        <Input className="h-8 text-xs" value={item.description} onChange={e => updateFormItem(idx, "description", e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals summary */}
                <div className="mt-4 border rounded-lg p-4 bg-muted/30">
                  <div className="flex justify-between text-sm"><span>Subtotale (senza IVA)</span><span className="font-medium">{fmtCurrency(subtotal)}</span></div>
                  <div className="flex justify-between text-sm mt-1"><span>IVA 22%</span><span className="font-medium">{fmtCurrency(vat)}</span></div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base font-bold"><span>Totale</span><span>{fmtCurrency(total)}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Live PDF preview */}
          <div className="w-1/2 overflow-y-auto bg-muted/30 p-6">
            <div className="sticky top-0">
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Anteprima Preventivo</span>
              </div>
              {/* A4-like card */}
              <div className="bg-white dark:bg-zinc-950 rounded-lg shadow-lg border p-8 text-black dark:text-zinc-100" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" }}>
                {/* Header */}
                <div className="flex justify-between mb-6">
                  <div>
                    <div className="text-sm font-bold">Consultecno S.R.L.</div>
                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                      <span className="block">Via Chiesolina 19</span>
                      <span className="block">37066 Sommacampagna (VR) - Verona</span>
                      <span className="block">Tel: 045/9990036</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Preventivo</div>
                    <div className="text-base font-bold text-muted-foreground/50">BOZZA</div>
                    <div className="text-[10px] text-muted-foreground mt-1">Data: {new Date().toLocaleDateString("it-IT")}</div>
                    {formData.validUntil && <div className="text-[10px] text-muted-foreground">Valido fino: {fmtDate(formData.validUntil)}</div>}
                  </div>
                </div>

                {/* Client section */}
                {selectedOrg && (
                  <div className="mb-4">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cliente</div>
                    <div className="text-xs font-semibold">{selectedOrg.denomination || selectedOrg.name}</div>
                    {selectedOrg.vatNumber && <div className="text-[10px] text-muted-foreground">P.IVA {selectedOrg.vatNumber}</div>}
                    {orgAddress && <div className="text-[10px] text-muted-foreground">{orgAddress}</div>}
                  </div>
                )}

                {/* Subject */}
                {formData.subject && (
                  <div className="mb-4">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Oggetto</div>
                    <div className="text-xs font-medium">{formData.subject}</div>
                    {formData.description && <div className="text-[10px] text-muted-foreground mt-0.5">{formData.description}</div>}
                  </div>
                )}

                {/* Items table */}
                {validItems.length > 0 ? (
                  <div className="mb-4">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-1.5 font-semibold uppercase text-[9px]" style={{ width: hasDiscount ? "40%" : "48%" }}>Voce</th>
                          <th className="text-center p-1.5 font-semibold uppercase text-[9px]" style={{ width: "10%" }}>Qtà</th>
                          <th className="text-right p-1.5 font-semibold uppercase text-[9px]" style={{ width: hasDiscount ? "18%" : "20%" }}>Prezzo Unit.</th>
                          {hasDiscount && <th className="text-center p-1.5 font-semibold uppercase text-[9px]" style={{ width: "12%" }}>Sconto</th>}
                          <th className="text-right p-1.5 font-semibold uppercase text-[9px]" style={{ width: hasDiscount ? "20%" : "22%" }}>Totale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validItems.map((item: FormItem, i: number) => (
                          <tr key={i} className="border-b border-muted">
                            <td className="p-1.5">
                              <span className="flex items-center gap-1">
                                {item.icon && ICON_MAP[item.icon]}
                                {item.itemName}
                              </span>
                            </td>
                            <td className="p-1.5 text-center">{item.quantity}</td>
                            <td className="p-1.5 text-right">€ {(parseFloat(item.unitPrice) || 0).toFixed(2)}</td>
                            {hasDiscount && <td className="p-1.5 text-center">{item.discount}%</td>}
                            <td className="p-1.5 text-right">€ {(item.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end mt-3">
                      <div className="w-48 text-[11px]">
                        <div className="flex justify-between py-1"><span>Subtotale</span><span>€ {subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between py-1"><span>IVA 22%</span><span>€ {vat.toFixed(2)}</span></div>
                        <div className="flex justify-between py-1.5 font-bold text-xs border-t-2 border-foreground mt-1 pt-2"><span>Totale</span><span>€ {total.toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[10px] text-muted-foreground border border-dashed rounded mb-4">
                    Aggiungi voci al preventivo per vedere l'anteprima
                  </div>
                )}

                {/* Terms */}
                {formData.termsConditions && (
                  <div className="mb-4">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Condizioni di pagamento</div>
                    <div className="text-[9px] text-muted-foreground whitespace-pre-wrap">{formData.termsConditions}</div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t pt-3 mt-auto">
                  <div className="text-[9px] text-muted-foreground">Preventivo BOZZA — Consultecno S.R.L. | Via Chiesolina 19, 37066 Sommacampagna (VR) | Tel: 045/9990036</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
