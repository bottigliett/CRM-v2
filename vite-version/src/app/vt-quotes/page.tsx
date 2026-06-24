"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
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
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Plus, MoreHorizontal, Edit, Trash2, Loader2, Eye, FileText, X,
  ChevronsUpDown, Check, Download,
  Monitor, Server, Shield, Cpu, HardDrive, Globe, Printer, Phone,
  Wifi, Cloud, Database, Lock, Mail, Settings, Wrench, Headphones,
  Camera, Laptop, Tablet, Smartphone,
} from "lucide-react"
import { vtQuotesAPI, type VtQuote, type VtQuoteItem } from "@/lib/vt-quotes-api"
import { productsAPI, type Product } from "@/lib/products-api"
import { organizationsAPI } from "@/lib/organizations-api"
import { userPreferencesAPI } from "@/lib/user-preferences-api"
import { toast } from "sonner"
import { TablePagination } from "@/components/ui/table-pagination"
import { ColumnToggle, type ColumnDef as ToggleColumnDef } from "@/components/ui/column-toggle"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

const PAGE_NAME = "vt-quotes"

const DEFAULT_COLUMNS: ToggleColumnDef[] = [
  { id: "quoteNumber",  label: "Numero" },
  { id: "subject",      label: "Oggetto" },
  { id: "organization", label: "Organizzazione" },
  { id: "stage",        label: "Stadio" },
  { id: "assignedTo",   label: "Assegnato a" },
  { id: "validUntil",   label: "Valido fino a" },
]

const DEFAULT_VISIBLE_IDS = new Set([
  "quoteNumber", "subject", "organization", "stage", "assignedTo",
])

const STAGES = ["Creato", "Scaduto", "Accettato", "Rifiutato"]

const STAGE_COLORS: Record<string, string> = {
  "Creato":    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Scaduto":   "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  "Accettato": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Rifiutato": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

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

const emptyForm: any = {
  subject: "", organizationId: "", assignedToId: "", stage: "Creato",
  validUntil: "", description: "", termsConditions: "",
  items: [{ ...emptyItem }],
}

function calcItemTotal(item: FormItem): number {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.unitPrice) || 0
  const disc = parseFloat(item.discount) || 0
  return (price * qty) * (1 - disc / 100)
}

export default function VtQuotesPage() {
  const [items, setItems] = useState<VtQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [limit, setLimit] = useState(20)

  const SELECT_FILTER_COLS = new Set(["stage"])
  const updateColumnFilter = useCallback((colId: string, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev, [colId]: value }
      if (SELECT_FILTER_COLS.has(colId)) {
        setDebouncedFilters(d => ({ ...d, [colId]: value }))
        setCurrentPage(1)
      } else {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          setDebouncedFilters(d => ({ ...d, [colId]: value }))
          setCurrentPage(1)
        }, 500)
      }
      return next
    })
  }, [])

  const [columns, setColumns] = useState<ToggleColumnDef[]>(DEFAULT_COLUMNS)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, DEFAULT_VISIBLE_IDS.has(c.id)]))
  )
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const defaultVis = Object.fromEntries(DEFAULT_COLUMNS.map(c => [c.id, DEFAULT_VISIBLE_IDS.has(c.id)]))
    const applyOrder = (order: string[]) => [
      ...order.map(id => DEFAULT_COLUMNS.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[],
      ...DEFAULT_COLUMNS.filter(c => !order.includes(c.id)),
    ]
    const mergeVis = (saved: Record<string, boolean>) => ({ ...defaultVis, ...saved })

    const savedOrder = localStorage.getItem(`crm_col_order_${PAGE_NAME}`)
    const savedVis   = localStorage.getItem(`crm_col_vis_${PAGE_NAME}`)
    if (savedOrder) { try { setColumns(applyOrder(JSON.parse(savedOrder))) } catch {} }
    if (savedVis)   { try { setVisibleColumns(mergeVis(JSON.parse(savedVis))) } catch {} }

    userPreferencesAPI.getUserPreferences(PAGE_NAME)
      .then(prefs => {
        if (!prefs) return
        if (prefs.columnOrder) {
          try { const order: string[] = JSON.parse(prefs.columnOrder); setColumns(applyOrder(order)); localStorage.setItem(`crm_col_order_${PAGE_NAME}`, prefs.columnOrder) } catch {}
        }
        if (prefs.columnVisibility) {
          try { const merged = mergeVis(JSON.parse(prefs.columnVisibility)); setVisibleColumns(merged); localStorage.setItem(`crm_col_vis_${PAGE_NAME}`, JSON.stringify(merged)) } catch {}
        }
      }).catch(() => {})
  }, [])

  const persistPreferences = useCallback((cols: ToggleColumnDef[], vis: Record<string, boolean>) => {
    localStorage.setItem(`crm_col_order_${PAGE_NAME}`, JSON.stringify(cols.map(c => c.id)))
    localStorage.setItem(`crm_col_vis_${PAGE_NAME}`, JSON.stringify(vis))
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      userPreferencesAPI.saveUserPreferences(PAGE_NAME, {
        columnOrder: cols.map(c => c.id), columnVisibility: vis,
      }).catch(() => {})
    }, 600)
  }, [])

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => { const next = { ...prev, [columnId]: !prev[columnId] }; persistPreferences(columns, next); return next })
  }
  const handleReorder = (newOrder: string[]) => {
    const reordered = [...newOrder.map(id => columns.find(c => c.id === id)).filter(Boolean) as ToggleColumnDef[], ...columns.filter(c => !newOrder.includes(c.id))]
    setColumns(reordered); persistPreferences(reordered, visibleColumns)
  }
  const isColVisible = (columnId: string) => visibleColumns[columnId] === true

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selected, setSelected] = useState<VtQuote | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({ ...emptyForm })
  const [orgs, setOrgs] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false)
  const [productPopovers, setProductPopovers] = useState<Record<number, boolean>>({})

  useEffect(() => {
    organizationsAPI.getAll({ limit: 1000 })
      .then(r => setOrgs(r.data.organizations.map((o: any) => ({
        id: o.id, name: o.denomination || o.name,
        billStreet: o.billStreet, billCity: o.billCity, billState: o.billState,
        billCode: o.billCode, billCountry: o.billCountry, vatNumber: o.vatNumber,
      })))).catch(() => {})
    productsAPI.getAll({ limit: 1000, isActive: 'true' })
      .then(r => setProducts(r.data.products)).catch(() => {})
  }, [])

  const loadData = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const f = debouncedFilters
      const response = await vtQuotesAPI.getAll({
        page, limit,
        stage: f.stage || undefined,
        quoteNumber: f.quoteNumber || undefined,
        subject: f.subject || undefined,
        orgName: f.organization || undefined,
        assignedTo: f.assignedTo || undefined,
        validUntilFrom: f.validUntil || undefined,
      })
      setItems(response.data.quotes)
      setCurrentPage(response.data.pagination.page)
      setTotalPages(response.data.pagination.totalPages)
      setTotalCount(response.data.pagination.total)
    } catch (error: any) {
      toast.error(error.message || "Errore nel caricamento")
    } finally { setLoading(false) }
  }, [debouncedFilters, limit])

  useEffect(() => { loadData() }, [loadData])

  // Recalculate item totals whenever items change
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

  const getSubtotal = () => (formData.items || []).reduce((sum: number, item: FormItem) => sum + (item.total || 0), 0)
  const getVat = () => getSubtotal() * 0.22
  const getTotal = () => getSubtotal() + getVat()

  const formatCurrency = (v: number) => `€ ${v.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`

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
      setIsCreateOpen(false)
      setFormData({ ...emptyForm, items: [{ ...emptyItem }] })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleEdit = async () => {
    if (!selected || !formData.subject) { toast.error("L'oggetto è obbligatorio"); return }
    try {
      setSubmitting(true)
      await vtQuotesAPI.update(selected.id, buildSubmitData())
      toast.success("Preventivo aggiornato!")
      setIsEditOpen(false)
      setSelected(null)
      setFormData({ ...emptyForm, items: [{ ...emptyItem }] })
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      setSubmitting(true)
      await vtQuotesAPI.delete(selected.id)
      toast.success("Preventivo eliminato!")
      setIsDeleteOpen(false)
      setSelected(null)
      loadData()
    } catch (error: any) { toast.error(error.message) } finally { setSubmitting(false) }
  }

  const openEdit = async (item: VtQuote) => {
    try {
      const response = await vtQuotesAPI.getById(item.id)
      const full = response.data as VtQuote
      setSelected(full)
      setFormData({
        subject: full.subject,
        organizationId: full.organizationId?.toString() || "",
        assignedToId: full.assignedToId?.toString() || "",
        stage: full.stage,
        validUntil: full.validUntil ? new Date(full.validUntil).toISOString().split("T")[0] : "",
        description: full.description || "",
        termsConditions: full.termsConditions || "",
        items: full.items && full.items.length > 0
          ? full.items.map(i => ({
              productId: i.productId?.toString() || "",
              itemName: i.itemName,
              description: i.description || "",
              icon: i.icon || "",
              quantity: i.quantity.toString(),
              unitPrice: i.unitPrice.toString(),
              discount: i.discount.toString(),
              total: i.total,
            }))
          : [{ ...emptyItem }],
      })
      setIsEditOpen(true)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const openPreview = async (item: VtQuote) => {
    try {
      const response = await vtQuotesAPI.getById(item.id)
      setSelected(response.data as VtQuote)
      setIsPreviewOpen(true)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("it-IT") : "-"

  // PDF Export
  const exportPDF = async (quote: VtQuote) => {
    const quoteItems = quote.items || []
    const subtotal = quoteItems.reduce((sum, i) => sum + i.total, 0)
    const vat = subtotal * 0.22
    const total = subtotal + vat

    const org = quote.organization as any
    const orgName = org?.name || ""
    const orgAddress = [org?.billStreet, org?.billCity, org?.billState, org?.billCode, org?.billCountry].filter(Boolean).join(", ")
    const orgVat = org?.vatNumber || ""

    const iframe = document.createElement("iframe")
    iframe.style.position = "absolute"
    iframe.style.left = "-9999px"
    iframe.style.width = "210mm"
    iframe.style.height = "297mm"
    document.body.appendChild(iframe)

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) throw new Error("Could not access iframe document")

      const itemsHTML = quoteItems.map(item => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${item.icon ? '&#x1F4E6; ' : ''}${item.itemName}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">€ ${item.unitPrice.toFixed(2)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.discount}%</td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">€ ${item.total.toFixed(2)}</td>
        </tr>
      `).join("")

      iframeDoc.open()
      iframeDoc.write(`<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing:border-box; margin:0; padding:0; font-size:11px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
  body { background:#fff; color:#000; }
  .page-wrapper { width:210mm; min-height:297mm; padding:12mm; display:flex; flex-direction:column; }
  .header { display:flex; justify-content:space-between; margin-bottom:8mm; }
  .company { font-size:13px; font-weight:700; margin-bottom:2mm; }
  .company-info span { display:block; font-size:10px; color:#555; }
  .quote-meta { text-align:right; }
  .quote-meta .num { font-size:16px; font-weight:700; color:#1a56db; }
  .quote-meta span { display:block; font-size:10px; color:#555; margin-top:1mm; }
  .section { margin-top:6mm; }
  .section-title { font-size:10px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2mm; }
  .client-name { font-size:12px; font-weight:600; }
  .client-detail { font-size:10px; color:#555; }
  table { width:100%; border-collapse:collapse; margin-top:4mm; }
  thead th { background:#f3f4f6; padding:6px 8px; font-size:9px; font-weight:600; text-transform:uppercase; text-align:left; border-bottom:2px solid #d1d5db; }
  thead th:nth-child(2) { text-align:center; }
  thead th:nth-child(3),thead th:nth-child(5) { text-align:right; }
  thead th:nth-child(4) { text-align:center; }
  .totals { margin-top:4mm; display:flex; justify-content:flex-end; }
  .totals-box { width:55mm; }
  .totals-row { display:flex; justify-content:space-between; padding:2mm 0; font-size:11px; }
  .totals-row.grand { font-weight:700; font-size:13px; border-top:2px solid #000; padding-top:3mm; }
  .footer { margin-top:auto; padding-top:6mm; border-top:1px solid #e5e7eb; }
  .footer-text { font-size:9px; color:#6b7280; }
  .terms { margin-top:4mm; }
  .terms-text { font-size:9px; color:#555; white-space:pre-wrap; }
</style>
</head>
<body>
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
      <img src="/logo-consultecno.png" alt="Consultecno" style="max-height:18mm;max-width:50mm;object-fit:contain;" onerror="this.style.display='none'" />
      <div class="quote-meta">
        <div class="num">${quote.quoteNumber}</div>
        <span>Data: ${new Date(quote.createdAt).toLocaleDateString("it-IT")}</span>
        ${quote.validUntil ? `<span>Valido fino: ${new Date(quote.validUntil).toLocaleDateString("it-IT")}</span>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="client-name">${orgName}</div>
    ${orgVat ? `<div class="client-detail">P.IVA ${orgVat}</div>` : ''}
    ${orgAddress ? `<div class="client-detail">${orgAddress}</div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Oggetto</div>
    <div style="font-size:12px;font-weight:500;">${quote.subject}</div>
    ${quote.description ? `<div style="font-size:10px;color:#555;margin-top:1mm;">${quote.description}</div>` : ''}
  </div>

  <div class="section">
    <table>
      <thead>
        <tr>
          <th style="width:40%">Voce</th>
          <th style="width:10%">Qtà</th>
          <th style="width:18%">Prezzo Unit.</th>
          <th style="width:12%">Sconto</th>
          <th style="width:20%">Totale</th>
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
  </div>

  ${quote.termsConditions ? `
  <div class="terms">
    <div class="section-title">Termini e Condizioni</div>
    <div class="terms-text">${quote.termsConditions}</div>
  </div>` : ''}

  <div class="footer">
    <div class="footer-text">Preventivo ${quote.quoteNumber} — Consultecno S.R.L. | Via Chiesolina 19, 37066 Sommacampagna (VR) | Tel: 045/9990036</div>
  </div>
</div>
</body>
</html>`)
      iframeDoc.close()

      await new Promise(resolve => setTimeout(resolve, 800))

      const content = iframeDoc.querySelector(".page-wrapper") as HTMLElement
      if (!content) throw new Error("PDF content not found")

      const canvas = await html2canvas(content, {
        scale: 1.5, useCORS: true, logging: false, backgroundColor: "#ffffff",
        windowWidth: content.scrollWidth, windowHeight: content.scrollHeight,
      })

      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = 210
      const pdfHeight = 297
      const imgData = canvas.toDataURL("image/jpeg", 0.85)
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      if (imgHeight > pdfHeight) {
        const scaledWidth = (pdfHeight * canvas.width) / canvas.height
        const xOffset = (pdfWidth - scaledWidth) / 2
        pdf.addImage(imgData, "JPEG", xOffset, 0, scaledWidth, pdfHeight)
      } else {
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeight)
      }

      pdf.save(`Preventivo_${quote.quoteNumber.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`)
      toast.success("PDF esportato!")
    } catch (err: any) {
      console.error("PDF export error:", err)
      toast.error("Errore nell'esportazione PDF")
    } finally {
      document.body.removeChild(iframe)
    }
  }

  const renderForm = () => (
    <div className="space-y-5">
      {/* Header fields */}
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

      {/* Organization combobox */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Organizzazione</Label>
          <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                <span className="truncate">
                  {formData.organizationId
                    ? orgs.find(o => o.id.toString() === formData.organizationId)?.name ?? "Seleziona..."
                    : "Seleziona..."}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cerca organizzazione..." />
                <CommandList>
                  <CommandEmpty>Nessuna organizzazione trovata.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__none__" onSelect={() => { setFormData({ ...formData, organizationId: "" }); setOrgPopoverOpen(false) }}>
                      <Check className={cn("mr-2 h-4 w-4", !formData.organizationId ? "opacity-100" : "opacity-0")} />
                      <span className="text-muted-foreground italic">Nessuna</span>
                    </CommandItem>
                    {orgs.map(o => (
                      <CommandItem key={o.id} value={o.name} onSelect={() => { setFormData({ ...formData, organizationId: o.id.toString() }); setOrgPopoverOpen(false) }}>
                        <Check className={cn("mr-2 h-4 w-4", formData.organizationId === o.id.toString() ? "opacity-100" : "opacity-0")} />
                        {o.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label>Valido fino a</Label>
          <Input type="date" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} />
        </div>
      </div>

      {/* Terms and description */}
      <div>
        <Label>Descrizione</Label>
        <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
      </div>
      <div>
        <Label>Termini e Condizioni</Label>
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
                {/* Product selector */}
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
                  <div className="h-8 flex items-center text-xs font-semibold">{formatCurrency(item.total || 0)}</div>
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
          <div className="flex justify-between text-sm"><span>Subtotale (senza IVA)</span><span className="font-medium">{formatCurrency(getSubtotal())}</span></div>
          <div className="flex justify-between text-sm mt-1"><span>IVA 22%</span><span className="font-medium">{formatCurrency(getVat())}</span></div>
          <Separator className="my-2" />
          <div className="flex justify-between text-base font-bold"><span>Totale</span><span>{formatCurrency(getTotal())}</span></div>
        </div>
      </div>
    </div>
  )

  return (
    <BaseLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />Preventivi
            </h1>
            <p className="text-muted-foreground">{totalCount} preventivi totali</p>
          </div>
          <Button onClick={() => { setFormData({ ...emptyForm, items: [{ ...emptyItem }] }); setIsCreateOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />Nuovo Preventivo
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <ColumnToggle columns={columns} visibleColumns={visibleColumns} onToggle={toggleColumn} onReorder={handleReorder} />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isColVisible("quoteNumber")  && <TableHead>Numero</TableHead>}
                {isColVisible("subject")      && <TableHead>Oggetto</TableHead>}
                {isColVisible("organization") && <TableHead>Organizzazione</TableHead>}
                {isColVisible("stage")        && <TableHead>Stadio</TableHead>}
                {isColVisible("assignedTo")   && <TableHead>Assegnato a</TableHead>}
                {isColVisible("validUntil")   && <TableHead>Valido fino a</TableHead>}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
              <TableRow>
                {isColVisible("quoteNumber")  && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Numero..." value={columnFilters.quoteNumber || ""} onChange={e => updateColumnFilter("quoteNumber", e.target.value)} /></TableHead>}
                {isColVisible("subject")      && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Oggetto..." value={columnFilters.subject || ""} onChange={e => updateColumnFilter("subject", e.target.value)} /></TableHead>}
                {isColVisible("organization") && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Organizzazione..." value={columnFilters.organization || ""} onChange={e => updateColumnFilter("organization", e.target.value)} /></TableHead>}
                {isColVisible("stage")        && <TableHead className="p-1"><Select value={columnFilters.stage || ""} onValueChange={v => updateColumnFilter("stage", v === "all" ? "" : v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stadio" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti</SelectItem>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></TableHead>}
                {isColVisible("assignedTo")   && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="Assegnato a..." value={columnFilters.assignedTo || ""} onChange={e => updateColumnFilter("assignedTo", e.target.value)} /></TableHead>}
                {isColVisible("validUntil")   && <TableHead className="p-1"><Input className="h-8 text-xs" placeholder="gg/mm/aaaa" value={columnFilters.validUntil || ""} onChange={e => updateColumnFilter("validUntil", e.target.value)} /></TableHead>}
                <TableHead className="w-[50px] p-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={DEFAULT_COLUMNS.length + 1} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={DEFAULT_COLUMNS.length + 1} className="text-center py-8 text-muted-foreground">Nessun preventivo trovato</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => openPreview(item)}>
                  {isColVisible("quoteNumber")  && <TableCell className="font-mono text-sm">{item.quoteNumber}</TableCell>}
                  {isColVisible("subject")      && <TableCell className="font-medium">{item.subject}</TableCell>}
                  {isColVisible("organization") && <TableCell>{item.organization?.name || "-"}</TableCell>}
                  {isColVisible("stage")        && <TableCell><Badge className={STAGE_COLORS[item.stage] || ""}>{item.stage}</Badge></TableCell>}
                  {isColVisible("assignedTo")   && <TableCell>{item.assignedTo ? `${item.assignedTo.firstName || ""} ${item.assignedTo.lastName || ""}`.trim() || item.assignedTo.username : "-"}</TableCell>}
                  {isColVisible("validUntil")   && <TableCell>{formatDate(item.validUntil)}</TableCell>}
                  <TableCell onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPreview(item)}><Eye className="mr-2 h-4 w-4" />Visualizza</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(item)}><Edit className="mr-2 h-4 w-4" />Modifica</DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          try {
                            const res = await vtQuotesAPI.getById(item.id)
                            exportPDF(res.data)
                          } catch (e: any) { toast.error(e.message) }
                        }}><Download className="mr-2 h-4 w-4" />Esporta PDF</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelected(item); setIsDeleteOpen(true) }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Elimina</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} limit={limit}
          onPageChange={(page) => loadData(page)}
          onLimitChange={(newLimit) => { setLimit(newLimit); setCurrentPage(1) }}
        />

        {/* Create */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuovo Preventivo</DialogTitle>
              <DialogDescription>Crea un nuovo preventivo con voci prodotto/servizio.</DialogDescription>
            </DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Preventivo — {selected?.quoteNumber}</DialogTitle>
              <DialogDescription>Modifica i dati del preventivo.</DialogDescription>
            </DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selected?.quoteNumber}</DialogTitle>
              <DialogDescription>Dettagli preventivo</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><span className="font-medium text-muted-foreground">Oggetto:</span><br />{selected.subject}</div>
                  <div><span className="font-medium text-muted-foreground">Stadio:</span><br /><Badge className={STAGE_COLORS[selected.stage] || ""}>{selected.stage}</Badge></div>
                  <div><span className="font-medium text-muted-foreground">Organizzazione:</span><br />{selected.organization?.name || "-"}</div>
                  <div><span className="font-medium text-muted-foreground">Assegnato a:</span><br />{selected.assignedTo ? `${selected.assignedTo.firstName || ""} ${selected.assignedTo.lastName || ""}`.trim() || selected.assignedTo.username : "-"}</div>
                  <div><span className="font-medium text-muted-foreground">Valido fino a:</span><br />{formatDate(selected.validUntil)}</div>
                  {selected.description && (
                    <div className="col-span-2"><span className="font-medium text-muted-foreground">Descrizione:</span><p className="mt-1 whitespace-pre-wrap">{selected.description}</p></div>
                  )}
                </div>

                {/* Items table in preview */}
                {selected.items && selected.items.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Voci Preventivo</h4>
                      <div className="rounded border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Voce</TableHead>
                              <TableHead className="text-xs text-center">Qtà</TableHead>
                              <TableHead className="text-xs text-right">Prezzo</TableHead>
                              <TableHead className="text-xs text-center">Sconto</TableHead>
                              <TableHead className="text-xs text-right">Totale</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selected.items.map((itm, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">
                                  <span className="flex items-center gap-1">
                                    {itm.icon && ICON_MAP[itm.icon]}
                                    {itm.itemName}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-center">{itm.quantity}</TableCell>
                                <TableCell className="text-xs text-right">{formatCurrency(itm.unitPrice)}</TableCell>
                                <TableCell className="text-xs text-center">{itm.discount}%</TableCell>
                                <TableCell className="text-xs text-right font-medium">{formatCurrency(itm.total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-3 text-sm space-y-1">
                        {(() => {
                          const sub = selected.items.reduce((s, i) => s + i.total, 0)
                          const v = sub * 0.22
                          return (
                            <>
                              <div className="flex justify-between"><span className="text-muted-foreground">Subtotale</span><span>{formatCurrency(sub)}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">IVA 22%</span><span>{formatCurrency(v)}</span></div>
                              <Separator />
                              <div className="flex justify-between font-bold"><span>Totale</span><span>{formatCurrency(sub + v)}</span></div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Chiudi</Button>
              <Button variant="outline" onClick={() => { if (selected) exportPDF(selected) }}><Download className="mr-2 h-4 w-4" />PDF</Button>
              <Button onClick={() => { setIsPreviewOpen(false); if (selected) openEdit(selected) }}>Modifica</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare il preventivo?</AlertDialogTitle>
              <AlertDialogDescription>Il preventivo "{selected?.quoteNumber}" verrà eliminato permanentemente.</AlertDialogDescription>
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
