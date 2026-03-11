"use client"

import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface ColumnDef {
  id: string
  label: string
}

interface ColumnToggleProps {
  columns: ColumnDef[]
  visibleColumns: Record<string, boolean>
  onToggle: (columnId: string) => void
}

export function ColumnToggle({ columns, visibleColumns, onToggle }: ColumnToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 lg:flex cursor-pointer">
          <Settings2 className="mr-2 h-4 w-4" />
          Colonne
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>Mostra colonne</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            className="cursor-pointer"
            checked={visibleColumns[col.id] !== false}
            onCheckedChange={() => onToggle(col.id)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
