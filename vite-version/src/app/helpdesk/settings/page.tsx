import FieldSettingsPage from "@/components/field-settings-page"

export default function HelpdeskSettingsPage() {
  return (
    <FieldSettingsPage
      title="Gestione Campi — Assistenza Clienti"
      backPath="/helpdesk"
      fields={[
        { table: "help_desk_tickets", field: "callType", label: "Tipo di chiamata" },
        { table: "help_desk_tickets", field: "status", label: "Stato" },
        { table: "help_desk_tickets", field: "ticketOrigin", label: "Origine" },
        { table: "help_desk_tickets", field: "priority", label: "Priorità" },
      ]}
    />
  )
}
