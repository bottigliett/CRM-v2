import FieldSettingsPage from "@/components/field-settings-page"

export default function VtQuotesSettingsPage() {
  return (
    <FieldSettingsPage
      title="Gestione Campi — Preventivi"
      backPath="/vt-quotes"
      fields={[
        { table: "vt_quotes", field: "stage", label: "Stato preventivo" },
      ]}
    />
  )
}
