"use client"

import { useEffect, useState } from "react"
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WeatherData {
  temp: number
  feels_like: number
  humidity: number
  description: string
  icon: string
  wind_speed: number
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Coordinate di Pescantina, Verona
  const LAT = 45.4697
  const LON = 10.8508
  const LOCATION = "Pescantina, VR"

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true)
        // Nota: richiede VITE_OPENWEATHER_API_KEY nel file .env
        const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY

        if (!apiKey) {
          setError('API key OpenWeather mancante')
          setLoading(false)
          return
        }

        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${apiKey}&units=metric&lang=it`
        )

        if (!response.ok) {
          throw new Error('Errore nel recupero dati meteo')
        }

        const data = await response.json()

        setWeather({
          temp: Math.round(data.main.temp),
          feels_like: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          description: data.weather[0].description,
          icon: data.weather[0].main,
          wind_speed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        })
        setError(null)
      } catch (err) {
        console.error('Errore meteo:', err)
        setError('Impossibile caricare il meteo')
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
    // Aggiorna ogni 30 minuti
    const interval = setInterval(fetchWeather, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const getWeatherIcon = () => {
    if (!weather) return <Cloud className="h-12 w-12 text-muted-foreground" />

    const iconClass = "h-12 w-12"

    switch (weather.icon.toLowerCase()) {
      case 'clear':
        return <Sun className={`${iconClass} text-yellow-500`} />
      case 'clouds':
        return <Cloud className={`${iconClass} text-gray-400`} />
      case 'rain':
      case 'drizzle':
        return <CloudRain className={`${iconClass} text-blue-500`} />
      case 'snow':
        return <CloudSnow className={`${iconClass} text-blue-300`} />
      case 'thunderstorm':
        return <CloudRain className={`${iconClass} text-purple-500`} />
      default:
        return <Cloud className={`${iconClass} text-gray-400`} />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Meteo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Caricamento...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !weather) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Meteo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Cloud className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{error || 'Dati non disponibili'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{LOCATION}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperature and Icon */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold">{weather.temp}°C</div>
            <p className="text-sm text-muted-foreground capitalize">
              {weather.description}
            </p>
          </div>
          {getWeatherIcon()}
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Umidità</p>
              <p className="text-sm font-medium">{weather.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Vento</p>
              <p className="text-sm font-medium">{weather.wind_speed} km/h</p>
            </div>
          </div>
        </div>

        {/* Feels like */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Percepita: {weather.feels_like}°C
        </div>
      </CardContent>
    </Card>
  )
}
