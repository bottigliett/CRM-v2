import FieldSettingsPage from "@/components/field-settings-page"

export default function SalesOrdersSettingsPage() {
  return (
    <FieldSettingsPage
      title="Gestione Campi — Ordini di Vendita"
      backPath="/sales-orders"
      fields={[
        { table: "sales_orders", field: "status", label: "Stato ordine" },
        { table: "sales_orders", field: "invoiceStatus", label: "Stato fatturazione" },
      ]}
    />
  )
}
