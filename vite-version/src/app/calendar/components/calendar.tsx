"use client"

import { useState, useEffect } from "react"
import { CalendarSidebar } from "./calendar-sidebar"
import { CalendarMain } from "./calendar-main"
import { EventForm } from "./event-form"
import { EventPreview } from "./event-preview"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type CalendarEvent } from "../types"
import { useCalendar } from "../use-calendar"
import { usersAPI, type User } from "@/lib/users-api"

interface CalendarProps {
  events: CalendarEvent[]
  eventDates: Array<{ date: Date; count: number }>
}

export function Calendar({ events, eventDates }: CalendarProps) {
  const calendar = useCalendar(events)
  const [hideSidebar, setHideSidebar] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("all")

  useEffect(() => {
    usersAPI.getAdminUsers().then(r => setUsers(r.data.users)).catch(() => {})
  }, [])

  // Load sidebar preference
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await usersAPI.getCalendarPreferences()
        if (response.success && response.data.hideSidebar !== undefined) {
          setHideSidebar(response.data.hideSidebar)
        }
      } catch (error) {
        // Fallback to localStorage
        const saved = localStorage.getItem('calendar-user-preferences')
        if (saved) {
          const prefs = JSON.parse(saved)
          setHideSidebar(prefs.hideSidebar ?? false)
        }
      }
    }
    loadPreferences()
  }, [])

  // Filter events based on hidden categories and selected user
  const filteredEvents = calendar.events.filter(event => {
    if (event.categoryId && calendar.hiddenCategories.has(event.categoryId)) return false
    if (selectedUserId !== "all" && event.assignedTo?.toString() !== selectedUserId) return false
    return true
  })

  // Debug log to show filtering
  console.log('[DEBUG] Event filtering:', {
    totalEvents: calendar.events.length,
    hiddenCategories: Array.from(calendar.hiddenCategories),
    filteredEvents: filteredEvents.length,
    hiddenEventsCount: calendar.events.length - filteredEvents.length
  })

  return (
    <>
      {users.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-muted-foreground">Responsabile:</span>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[200px] h-8 text-sm">
              <SelectValue placeholder="Tutti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id.toString()}>
                  {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="border rounded-lg bg-background relative">
        <div className="flex min-h-[800px]">
          {/* Desktop Sidebar - Hidden on mobile/tablet, shown on extra large screens */}
          {!hideSidebar && (
            <div className="hidden xl:block w-80 flex-shrink-0 border-r">
              <CalendarSidebar
                selectedDate={calendar.selectedDate}
                onDateSelect={calendar.handleDateSelect}
                onNewCalendar={calendar.handleNewCalendar}
                onNewEvent={calendar.handleNewEvent}
                onCategoryToggle={calendar.handleCategoryToggle}
                hiddenCategories={calendar.hiddenCategories}
                events={eventDates}
                className="h-full"
              />
            </div>
          )}

          {/* Main Calendar Panel */}
          <div className="flex-1 min-w-0">
            <CalendarMain
              selectedDate={calendar.selectedDate}
              onDateSelect={calendar.handleDateSelect}
              onMenuClick={() => calendar.setShowCalendarSheet(true)}
              events={filteredEvents}
              onEventClick={calendar.handleEventClick}
              onTimeSlotClick={calendar.handleNewEventAtTime}
              currentView={calendar.currentView}
              onViewChange={calendar.setCurrentView}
              hideSidebar={hideSidebar}
            />
          </div>
        </div>

        {/* Mobile/Tablet Sheet - Positioned relative to calendar container */}
        <Sheet open={calendar.showCalendarSheet} onOpenChange={calendar.setShowCalendarSheet}>
          <SheetContent side="left" className="w-80 p-0" style={{ position: 'absolute' }}>
            <SheetHeader className="p-4 pb-2">
              <SheetTitle>Calendar</SheetTitle>
              <SheetDescription>
                Browse dates and manage your calendar events
              </SheetDescription>
            </SheetHeader>
            <CalendarSidebar
              selectedDate={calendar.selectedDate}
              onDateSelect={calendar.handleDateSelect}
              onNewCalendar={calendar.handleNewCalendar}
              onNewEvent={calendar.handleNewEvent}
              onCategoryToggle={calendar.handleCategoryToggle}
              hiddenCategories={calendar.hiddenCategories}
              events={eventDates}
              className="h-full"
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Event Preview Dialog */}
      <EventPreview
        event={calendar.previewEvent}
        open={calendar.showEventPreview}
        onOpenChange={calendar.setShowEventPreview}
        onEdit={() => {
          if (calendar.previewEvent) {
            calendar.handleEditEvent(calendar.previewEvent)
          }
        }}
        onDelete={() => {
          if (calendar.previewEvent?.id) {
            calendar.handleDeleteEvent(calendar.previewEvent.id)
          }
        }}
      />

      {/* Event Form Dialog */}
      <EventForm
        event={calendar.editingEvent}
        open={calendar.showEventForm}
        onOpenChange={calendar.setShowEventForm}
        onSave={calendar.handleSaveEvent}
        onDelete={calendar.handleDeleteEvent}
      />
    </>
  )
}
