"use client"

import { useEffect, useState } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { WeatherWidget } from "./components/weather-widget"
import { PomodoroTimer } from "./components/pomodoro-timer"
import { TodoList } from "./components/todo-list"
import { TaskSelector } from "./components/task-selector"
import { TaskPhases } from "./components/task-phases"
import { onDutyAPI, type DailyTodo, type WeeklyTodo } from "@/lib/on-duty-api"
import { type Task } from "@/lib/tasks-api"
import { toast } from "sonner"

export default function OnDutyPage() {
  // Daily Todos State
  const [dailyTodos, setDailyTodos] = useState<DailyTodo[]>([])
  const [loadingDaily, setLoadingDaily] = useState(true)

  // Weekly Todos State
  const [weeklyTodos, setWeeklyTodos] = useState<WeeklyTodo[]>([])
  const [loadingWeekly, setLoadingWeekly] = useState(true)

  // Selected Task State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Load todos and selected task on mount
  useEffect(() => {
    loadDailyTodos()
    loadWeeklyTodos()

    // Restore selected task from localStorage
    const savedTaskId = localStorage.getItem('onduty_selected_task_id')
    if (savedTaskId) {
      loadTaskById(parseInt(savedTaskId))
    }
  }, [])

  // Save selected task ID to localStorage when it changes
  useEffect(() => {
    if (selectedTask) {
      localStorage.setItem('onduty_selected_task_id', selectedTask.id.toString())
    } else {
      localStorage.removeItem('onduty_selected_task_id')
    }
  }, [selectedTask])

  // Load task by ID
  const loadTaskById = async (taskId: number) => {
    try {
      const response = await tasksAPI.getTaskById(taskId)
      if (response.success) {
        setSelectedTask(response.data)
      }
    } catch (error) {
      console.error("Errore nel caricamento task:", error)
      // If task not found or error, clear from localStorage
      localStorage.removeItem('onduty_selected_task_id')
    }
  }

  // ===================================
  // DAILY TODOS HANDLERS
  // ===================================

  const loadDailyTodos = async () => {
    try {
      setLoadingDaily(true)
      const response = await onDutyAPI.getDailyTodos()
      if (response.success) {
        setDailyTodos(response.data)
      }
    } catch (error) {
      console.error("Errore caricamento daily todos:", error)
      toast.error("Errore nel caricamento dei todo giornalieri")
    } finally {
      setLoadingDaily(false)
    }
  }

  const handleAddDailyTodo = async (text: string) => {
    const response = await onDutyAPI.createDailyTodo({ text })
    if (response.success) {
      setDailyTodos([...dailyTodos, response.data])
      toast.success("Todo aggiunto")
    }
  }

  const handleToggleDailyTodo = async (id: number, completed: boolean) => {
    const response = await onDutyAPI.updateDailyTodo(id, { completed })
    if (response.success) {
      setDailyTodos(dailyTodos.map(t =>
        t.id === id ? { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined } : t
      ))
    }
  }

  const handleDeleteDailyTodo = async (id: number) => {
    await onDutyAPI.deleteDailyTodo(id)
    setDailyTodos(dailyTodos.filter(t => t.id !== id))
    toast.success("Todo eliminato")
  }

  const handleResetDailyTodos = async () => {
    const response = await onDutyAPI.resetDailyTodos()
    if (response.success) {
      setDailyTodos(response.data)
    }
  }

  // ===================================
  // WEEKLY TODOS HANDLERS
  // ===================================

  const loadWeeklyTodos = async () => {
    try {
      setLoadingWeekly(true)
      const response = await onDutyAPI.getWeeklyTodos()
      if (response.success) {
        setWeeklyTodos(response.data)
      }
    } catch (error) {
      console.error("Errore caricamento weekly todos:", error)
      toast.error("Errore nel caricamento dei todo settimanali")
    } finally {
      setLoadingWeekly(false)
    }
  }

  const handleAddWeeklyTodo = async (text: string) => {
    const response = await onDutyAPI.createWeeklyTodo({ text })
    if (response.success) {
      setWeeklyTodos([...weeklyTodos, response.data])
      toast.success("Todo aggiunto")
    }
  }

  const handleToggleWeeklyTodo = async (id: number, completed: boolean) => {
    const response = await onDutyAPI.updateWeeklyTodo(id, { completed })
    if (response.success) {
      setWeeklyTodos(weeklyTodos.map(t =>
        t.id === id ? { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined } : t
      ))
    }
  }

  const handleDeleteWeeklyTodo = async (id: number) => {
    await onDutyAPI.deleteWeeklyTodo(id)
    setWeeklyTodos(weeklyTodos.filter(t => t.id !== id))
    toast.success("Todo eliminato")
  }

  const handleResetWeeklyTodos = async () => {
    const response = await onDutyAPI.resetWeeklyTodos()
    if (response.success) {
      setWeeklyTodos(response.data)
    }
  }

  return (
    <BaseLayout>
      <div className="flex h-full flex-col gap-6 p-8">
        {/* Top Row: Daily Todos, Weekly Todos, Weather */}
        <div className="grid gap-4 md:grid-cols-3">
          <TodoList
            title="To-do Giornalieri"
            todos={dailyTodos}
            onAdd={handleAddDailyTodo}
            onToggle={handleToggleDailyTodo}
            onDelete={handleDeleteDailyTodo}
            onReset={handleResetDailyTodos}
            loading={loadingDaily}
          />

          <TodoList
            title="To-do Settimanali"
            todos={weeklyTodos}
            onAdd={handleAddWeeklyTodo}
            onToggle={handleToggleWeeklyTodo}
            onDelete={handleDeleteWeeklyTodo}
            onReset={handleResetWeeklyTodos}
            loading={loadingWeekly}
          />

          <WeatherWidget />
        </div>

        {/* Bottom Row: Pomodoro Timer, Task Selector, Task Phases */}
        <div className="grid gap-4 md:grid-cols-3">
          <PomodoroTimer
            selectedTaskEstimatedHours={selectedTask?.estimatedHours}
          />

          <TaskSelector
            selectedTask={selectedTask}
            onTaskSelect={setSelectedTask}
          />

          <TaskPhases
            taskId={selectedTask?.id ?? null}
          />
        </div>
      </div>
    </BaseLayout>
  )
}
