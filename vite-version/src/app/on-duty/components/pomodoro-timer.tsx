"use client"

import { useEffect, useState, useRef } from "react"
import { Play, Pause, RotateCcw, Coffee, Timer as TimerIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface PomodoroTimerProps {
  selectedTaskEstimatedHours?: number
  onTimerComplete?: () => void
}

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

const WORK_MINUTES = 25
const SHORT_BREAK_MINUTES = 5
const LONG_BREAK_MINUTES = 15
const POMODOROS_UNTIL_LONG_BREAK = 4

export function PomodoroTimer({ selectedTaskEstimatedHours, onTimerComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>('work')
  const [minutes, setMinutes] = useState(WORK_MINUTES)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [completedPomodoros, setCompletedPomodoros] = useState(0)
  const [totalPomodoros, setTotalPomodoros] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Calculate total pomodoros from estimated hours
  useEffect(() => {
    if (selectedTaskEstimatedHours) {
      // 1 pomodoro = 25 minutes = 0.42 hours approximately
      // So hours / 0.42 = number of pomodoros
      const calculated = Math.ceil(selectedTaskEstimatedHours / 0.42)
      setTotalPomodoros(calculated)
    } else {
      setTotalPomodoros(0)
    }
  }, [selectedTaskEstimatedHours])

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer complete
            handleTimerComplete()
          } else {
            setMinutes(minutes - 1)
            setSeconds(59)
          }
        } else {
          setSeconds(seconds - 1)
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, minutes, seconds])

  const handleTimerComplete = () => {
    setIsRunning(false)
    playNotificationSound()
    showNotification()

    if (mode === 'work') {
      const newCompleted = completedPomodoros + 1
      setCompletedPomodoros(newCompleted)

      // Determine next mode
      if (newCompleted % POMODOROS_UNTIL_LONG_BREAK === 0) {
        setMode('longBreak')
        setMinutes(LONG_BREAK_MINUTES)
      } else {
        setMode('shortBreak')
        setMinutes(SHORT_BREAK_MINUTES)
      }
    } else {
      // Break completed, back to work
      setMode('work')
      setMinutes(WORK_MINUTES)
    }

    setSeconds(0)
    onTimerComplete?.()
  }

  const playNotificationSound = () => {
    // Simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }

  const showNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = mode === 'work' ? 'Pomodoro Completato!' : 'Pausa Completata!'
      const body = mode === 'work'
        ? 'Ottimo lavoro! Prenditi una pausa.'
        : 'La pausa è finita. Torna al lavoro!'

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'pomodoro-timer',
      })
    }
  }

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setMinutes(mode === 'work' ? WORK_MINUTES : mode === 'shortBreak' ? SHORT_BREAK_MINUTES : LONG_BREAK_MINUTES)
    setSeconds(0)
  }

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode)
    setIsRunning(false)
    setSeconds(0)

    switch (newMode) {
      case 'work':
        setMinutes(WORK_MINUTES)
        break
      case 'shortBreak':
        setMinutes(SHORT_BREAK_MINUTES)
        break
      case 'longBreak':
        setMinutes(LONG_BREAK_MINUTES)
        break
    }
  }

  const getModeColor = () => {
    switch (mode) {
      case 'work':
        return 'text-red-500'
      case 'shortBreak':
        return 'text-green-500'
      case 'longBreak':
        return 'text-blue-500'
    }
  }

  const getModeLabel = () => {
    switch (mode) {
      case 'work':
        return 'Lavoro'
      case 'shortBreak':
        return 'Pausa Breve'
      case 'longBreak':
        return 'Pausa Lunga'
    }
  }

  const getTotalMinutes = () => {
    switch (mode) {
      case 'work':
        return WORK_MINUTES
      case 'shortBreak':
        return SHORT_BREAK_MINUTES
      case 'longBreak':
        return LONG_BREAK_MINUTES
    }
  }

  const getProgress = () => {
    const total = getTotalMinutes() * 60
    const remaining = minutes * 60 + seconds
    return ((total - remaining) / total) * 100
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Pomodoro Timer</CardTitle>
          <Badge variant="outline" className={getModeColor()}>
            {getModeLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className={`text-6xl font-bold tabular-nums ${getModeColor()}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <Progress value={getProgress()} className="mt-4 h-2" />
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={toggleTimer}
            size="lg"
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pausa
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Avvia
              </>
            )}
          </Button>
          <Button
            onClick={resetTimer}
            size="lg"
            variant="outline"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode Switchers */}
        <div className="flex gap-2">
          <Button
            onClick={() => switchMode('work')}
            variant={mode === 'work' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            disabled={isRunning}
          >
            <TimerIcon className="mr-1 h-3 w-3" />
            Lavoro
          </Button>
          <Button
            onClick={() => switchMode('shortBreak')}
            variant={mode === 'shortBreak' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            disabled={isRunning}
          >
            <Coffee className="mr-1 h-3 w-3" />
            Pausa
          </Button>
          <Button
            onClick={() => switchMode('longBreak')}
            variant={mode === 'longBreak' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            disabled={isRunning}
          >
            <Coffee className="mr-1 h-3 w-3" />
            Lunga
          </Button>
        </div>

        {/* Pomodoro Counter */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pomodori completati oggi:</span>
            <span className="font-semibold">{completedPomodoros}</span>
          </div>
          {totalPomodoros > 0 && (
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Target per task corrente:</span>
              <span className="font-semibold">
                {completedPomodoros} / {totalPomodoros}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
