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
  const orgName = selectedOrg?.name || ""
  const orgAddress = selectedOrg ? [selectedOrg.billStreet, selectedOrg.billCity, selectedOrg.billState, selectedOrg.billCode, selectedOrg.billCountry].filter(Boolean).join(", ") : ""
  const orgVat = selectedOrg?.vatNumber || ""

  // Build the exact same HTML used in exportPDF for the live preview
  const previewHTML = (() => {
    const itemsHTML = validItems.map((item: FormItem) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${item.icon ? '&#x1F4E6; ' : ''}${item.itemName}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">€ ${(parseFloat(item.unitPrice) || 0).toFixed(2)}</td>
        ${hasDiscount ? `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.discount}%</td>` : ''}
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">€ ${(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join("")

    return `
<div class="page-wrapper">
  <div class="header">
    <div>
      <div class="company">Consultecno S.R.L.</div>
      <div class="company-info">
        <span>Via Chiesolina 19</span>
        <span>37066 Sommacampagna (VR) - Verona</span>
        <span>Tel: 045/9990036</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4mm;">
      <img src="/logo-consultecno.png" alt="Consultecno" style="max-height:18mm;max-width:50mm;object-fit:contain;" />
      <div class="quote-meta">
        <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1mm;">Preventivo</div>
        <div class="num">BOZZA</div>
        <span>Data: ${new Date().toLocaleDateString("it-IT")}</span>
        ${formData.validUntil ? `<span>Valido fino: ${fmtDate(formData.validUntil)}</span>` : ''}
      </div>
    </div>
  </div>

  ${selectedOrg ? `
  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="client-name">${orgName}</div>
    ${orgVat ? `<div class="client-detail">P.IVA ${orgVat}</div>` : ''}
    ${orgAddress ? `<div class="client-detail">${orgAddress}</div>` : ''}
  </div>` : ''}

  ${formData.subject ? `
  <div class="section">
    <div class="section-title">Oggetto</div>
    <div style="font-size:12px;font-weight:500;">${formData.subject}</div>
    ${formData.description ? `<div style="font-size:10px;color:#555;margin-top:1mm;">${formData.description}</div>` : ''}
  </div>` : ''}

  ${validItems.length > 0 ? `
  <div class="section">
    <table>
      <thead>
        <tr>
          <th style="${hasDiscount ? 'width:40%' : 'width:48%'}">Voce</th>
          <th style="width:10%">Qtà</th>
          <th style="${hasDiscount ? 'width:18%' : 'width:20%'}">Prezzo Unit.</th>
          ${hasDiscount ? '<th style="width:12%">Sconto</th>' : ''}
          <th style="${hasDiscount ? 'width:20%' : 'width:22%'}">Totale</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row"><span>Subtotale</span><span>€ ${subtotal.toFixed(2)}</span></div>
        <div class="totals-row"><span>IVA 22%</span><span>€ ${vat.toFixed(2)}</span></div>
        <div class="totals-row grand"><span>Totale</span><span>€ ${total.toFixed(2)}</span></div>
      </div>
    </div>
  </div>` : `
  <div class="section" style="text-align:center;padding:20px 0;color:#9ca3af;font-size:11px;border:1px dashed #d1d5db;border-radius:4px;">
    Aggiungi voci al preventivo per vedere l'anteprima
  </div>`}

  ${formData.termsConditions ? `
  <div class="terms">
    <div class="section-title">Condizioni di pagamento</div>
    <div class="terms-text">${formData.termsConditions}</div>
  </div>` : ''}

  <div class="footer">
    <div class="footer-text">Preventivo BOZZA — Consultecno S.R.L. | Via Chiesolina 19, 37066 Sommacampagna (VR) | Tel: 045/9990036</div>
  </div>
</div>`
  })()

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

          {/* RIGHT — Live PDF preview (exact same HTML/CSS as exportPDF) */}
          <div className="w-1/2 overflow-y-auto bg-muted/30 p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground self-start">
              <FileText className="h-4 w-4" />
              <span>Anteprima Preventivo</span>
            </div>
            <div className="w-full" style={{ maxWidth: "210mm" }}>
              <style dangerouslySetInnerHTML={{ __html: `
                .pdf-preview * { box-sizing:border-box; margin:0; padding:0; font-size:11px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
                .pdf-preview { background:#fff; color:#000; }
                .pdf-preview .page-wrapper { width:100%; min-height:297mm; padding:12mm; display:flex; flex-direction:column; }
                .pdf-preview .header { display:flex; justify-content:space-between; margin-bottom:8mm; }
                .pdf-preview .company { font-size:13px; font-weight:700; margin-bottom:2mm; }
                .pdf-preview .company-info span { display:block; font-size:10px; color:#555; }
                .pdf-preview .quote-meta { text-align:right; }
                .pdf-preview .quote-meta .num { font-size:16px; font-weight:700; color:#000; }
                .pdf-preview .quote-meta span { display:block; font-size:10px; color:#555; margin-top:1mm; }
                .pdf-preview .section { margin-top:6mm; }
                .pdf-preview .section-title { font-size:10px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2mm; }
                .pdf-preview .client-name { font-size:12px; font-weight:600; }
                .pdf-preview .client-detail { font-size:10px; color:#555; }
                .pdf-preview table { width:100%; border-collapse:collapse; margin-top:4mm; }
                .pdf-preview thead th { background:#f3f4f6; padding:6px 8px; font-size:9px; font-weight:600; text-transform:uppercase; text-align:left; border-bottom:2px solid #d1d5db; }
                .pdf-preview thead th:nth-child(2) { text-align:center; }
                .pdf-preview thead th:nth-child(3), .pdf-preview thead th:nth-child(5) { text-align:right; }
                .pdf-preview thead th:nth-child(4) { text-align:center; }
                .pdf-preview .totals { margin-top:4mm; display:flex; justify-content:flex-end; }
                .pdf-preview .totals-box { width:55mm; }
                .pdf-preview .totals-row { display:flex; justify-content:space-between; padding:2mm 0; font-size:11px; }
                .pdf-preview .totals-row.grand { font-weight:700; font-size:13px; border-top:2px solid #000; padding-top:3mm; }
                .pdf-preview .footer { margin-top:auto; padding-top:6mm; border-top:1px solid #e5e7eb; }
                .pdf-preview .footer-text { font-size:9px; color:#6b7280; }
                .pdf-preview .terms { margin-top:4mm; }
                .pdf-preview .terms-text { font-size:9px; color:#555; white-space:pre-wrap; }
              `}} />
              <div
                className="pdf-preview rounded-lg shadow-lg border"
                dangerouslySetInnerHTML={{ __html: previewHTML }}
              />
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}
