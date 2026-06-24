"use client"

import { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useNavigate } from 'react-router-dom'
import { organizationsAPI } from '@/lib/organizations-api'
import type { Organization } from '@/lib/organizations-api'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Loader2 } from 'lucide-react'

interface GeocodedOrg extends Organization {
  lat: number
  lng: number
}

const CACHE_KEY = 'crm_geocode_v1'

function loadCache(): Record<string, [number, number] | null> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}

function saveCache(c: Record<string, [number, number] | null>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch {}
}

let lastGeoReq = 0

async function geocodeCity(city: string): Promise<[number, number] | null> {
  const key = city.toLowerCase().trim()
  const cache = loadCache()
  if (key in cache) return cache[key]

  const now = Date.now()
  const wait = Math.max(0, 1100 - (now - lastGeoReq))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastGeoReq = Date.now()

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=Italy&format=json&limit=1`,
      { headers: { 'User-Agent': 'CRM-Consultecno/1.0' } }
    )
    const data = await res.json()
    const result: [number, number] | null = data[0]
      ? [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      : null
    cache[key] = result
    saveCache(cache)
    return result
  } catch {
    return null
  }
}

export default function OrganizationsMapPage() {
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [geocoded, setGeocoded] = useState<GeocodedOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  // Initialize Leaflet map once geocoding is done
  useEffect(() => {
    if (loading || !mapRef.current || geocoded.length === 0) return
    if (leafletMap.current) return // already initialized

    import('leaflet').then(({ default: L }) => {
      // Fix default icon URLs
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!).setView([42.5, 12.5], 6)
      leafletMap.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      for (const org of geocoded) {
        const popup = L.popup().setContent(`
          <div style="min-width:180px">
            <p style="font-weight:600;font-size:13px;margin:0 0 2px">${org.denomination || org.name}</p>
            ${org.billCity ? `<p style="color:#666;font-size:12px;margin:0 0 4px">${org.billCity}${org.billState ? ` (${org.billState})` : ''}</p>` : ''}
            ${org.phone ? `<p style="font-size:12px;margin:0 0 6px">📞 ${org.phone}</p>` : ''}
            <a href="/organizations/${org.id}" style="font-size:12px;color:#2563eb" id="org-link-${org.id}">Scheda completa →</a>
          </div>
        `)

        L.marker([org.lat, org.lng])
          .bindPopup(popup)
          .on('popupopen', () => {
            const el = document.getElementById(`org-link-${org.id}`)
            if (el) {
              el.addEventListener('click', (e) => {
                e.preventDefault()
                navigate(`/organizations/${org.id}`)
              })
            }
          })
          .addTo(map)
      }
    })

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [loading, geocoded, navigate])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await organizationsAPI.getAll({ limit: 2000 })
        if (cancelled) return
        const all: Organization[] = res.data || res
        setOrgs(all)

        const withCity = all.filter(o => o.billCity)
        const uniqueCities = [...new Set(withCity.map(o => o.billCity!.toLowerCase().trim()))]
        setProgress({ done: 0, total: uniqueCities.length })

        const cityCoords: Record<string, [number, number] | null> = {}
        for (let i = 0; i < uniqueCities.length; i++) {
          if (cancelled) return
          const city = uniqueCities[i]
          cityCoords[city] = await geocodeCity(city)
          setProgress({ done: i + 1, total: uniqueCities.length })
        }

        if (cancelled) return

        const result: GeocodedOrg[] = []
        for (const org of all) {
          if (!org.billCity) continue
          const coords = cityCoords[org.billCity.toLowerCase().trim()]
          if (!coords) continue
          const jitter = () => (Math.random() - 0.5) * 0.01
          result.push({ ...org, lat: coords[0] + jitter(), lng: coords[1] + jitter() })
        }
        setGeocoded(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  const cityRanking = (() => {
    const map: Record<string, number> = {}
    for (const o of geocoded) {
      if (o.billCity) map[o.billCity] = (map[o.billCity] || 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 40)
  })()

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - var(--header-height, 56px))' }}>
      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground z-10 bg-background">
            <Loader2 className="h-8 w-8 animate-spin" />
            {progress.total > 0 ? (
              <p className="text-sm">Geocodifica {progress.done}/{progress.total} città...</p>
            ) : (
              <p className="text-sm">Caricamento organizzazioni...</p>
            )}
          </div>
        )}
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Sidebar */}
      <div className="w-72 border-l bg-background flex flex-col shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Organizzazioni per città
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {geocoded.length} geolocalizzate su {orgs.length} totali
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {cityRanking.map(([city, count], i) => (
              <div
                key={city}
                className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-5 shrink-0 text-right">{i + 1}.</span>
                  <span className="text-sm truncate">{city}</span>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0 ml-2">{count}</Badge>
              </div>
            ))}
            {cityRanking.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-8">Nessuna organizzazione geolocalizzata</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
