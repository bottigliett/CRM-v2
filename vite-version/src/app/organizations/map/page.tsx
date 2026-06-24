"use client"

import { useEffect, useRef, useState } from 'react'
import type L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useNavigate } from 'react-router-dom'
import { organizationsAPI } from '@/lib/organizations-api'
import type { Organization } from '@/lib/organizations-api'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { AnnouncementBanner } from '@/components/announcement-banner'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { useSidebarConfig } from '@/hooks/use-sidebar-config'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Loader2 } from 'lucide-react'

interface GeocodedOrg extends Organization {
  lat: number
  lng: number
  displayCity: string
}

const CACHE_KEY = 'crm_geocode_v2'

function loadCache(): Record<string, [number, number] | null> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}
function saveCache(c: Record<string, [number, number] | null>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch {}
}

let lastGeoReq = 0

async function nominatimSearch(query: string): Promise<[number, number] | null> {
  const key = query.toLowerCase().trim()
  const cache = loadCache()
  if (key in cache) return cache[key]

  const now = Date.now()
  const wait = Math.max(0, 1100 - (now - lastGeoReq))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastGeoReq = Date.now()

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=it`,
      { headers: { 'User-Agent': 'CRM-Consultecno/1.0 (mismostudiodesign@gmail.com)' } }
    )
    if (!res.ok) return null
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

// Extracts city and postal code from org fields.
// Falls back to parsing billStreet like "STRADA, CITTA, CAP, COUNTRY"
function extractAddress(org: Organization): { city: string | null; postal: string | null } {
  if (org.billCity) {
    const postal = org.billCode || (org.billState?.match(/^\d{5}$/) ? org.billState : null)
    return { city: org.billCity, postal }
  }
  if (org.billStreet?.includes(',')) {
    const parts = org.billStreet.split(',').map(p => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const city = parts[1]
      const postal = parts[2]?.match(/^\d{5}$/) ? parts[2] : null
      return { city, postal }
    }
  }
  return { city: null, postal: null }
}

function getGeoKey(org: Organization): { key: string; query: string; displayCity: string } | null {
  const { city, postal } = extractAddress(org)
  if (city) {
    const c = city.trim()
    return { key: `city:${c.toLowerCase()}`, query: `${c}, Italia`, displayCity: c }
  }
  if (postal) {
    return { key: `cap:${postal}`, query: `${postal}, Italia`, displayCity: postal }
  }
  return null
}

export default function OrganizationsMapPage() {
  const navigate = useNavigate()
  const { config } = useSidebarConfig()
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const cityCoordMap = useRef<Record<string, [number, number]>>({})

  const [orgs, setOrgs] = useState<Organization[]>([])
  const [geocoded, setGeocoded] = useState<GeocodedOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  // Build Leaflet map once geocoded data is ready
  useEffect(() => {
    if (loading || !mapRef.current || geocoded.length === 0) return
    if (leafletMap.current) return

    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current).setView([42.5, 12.5], 6)
      leafletMap.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      const dotIcon = L.divIcon({
        className: '',
        html: '<div style="background:#3b82f6;width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [0, -8],
      })

      for (const org of geocoded) {
        const name = org.denomination || org.name
        const popup = L.popup({ minWidth: 180 }).setContent(`
          <div>
            <p style="font-weight:600;font-size:13px;margin:0 0 3px">${name}</p>
            ${org.displayCity ? `<p style="color:#666;font-size:12px;margin:0 0 3px">📍 ${org.displayCity}</p>` : ''}
            ${org.phone ? `<p style="font-size:12px;margin:0 0 6px">📞 ${org.phone}</p>` : ''}
            <a id="org-${org.id}" href="#" style="font-size:12px;color:#2563eb;text-decoration:underline">Scheda completa →</a>
          </div>
        `)

        L.marker([org.lat, org.lng], { icon: dotIcon })
          .bindTooltip(name, { direction: 'top', offset: [0, -8] })
          .bindPopup(popup)
          .on('popupopen', () => {
            document.getElementById(`org-${org.id}`)?.addEventListener('click', (e) => {
              e.preventDefault()
              navigate(`/organizations/${org.id}`)
            })
          })
          .addTo(map)
      }
    })

    return () => {
      leafletMap.current?.remove()
      leafletMap.current = null
    }
  }, [loading, geocoded, navigate])

  // Geocoding effect
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await organizationsAPI.getAll({ limit: 2000 })
        if (cancelled) return
        const all: Organization[] = res.data?.organizations || []
        setOrgs(all)

        // Build unique geo keys
        const orgGeoKeys = all.map(org => ({ org, geo: getGeoKey(org) }))
        const uniqueKeyMap = new Map<string, { query: string; displayCity: string }>()
        for (const { geo } of orgGeoKeys) {
          if (geo && !uniqueKeyMap.has(geo.key)) {
            uniqueKeyMap.set(geo.key, { query: geo.query, displayCity: geo.displayCity })
          }
        }

        const uniqueEntries = [...uniqueKeyMap.entries()]
        setProgress({ done: 0, total: uniqueEntries.length })

        const keyCoords: Record<string, [number, number] | null> = {}
        for (let i = 0; i < uniqueEntries.length; i++) {
          if (cancelled) return
          const [key, { query }] = uniqueEntries[i]
          keyCoords[key] = await nominatimSearch(query)
          setProgress({ done: i + 1, total: uniqueEntries.length })
        }

        if (cancelled) return

        // Build city → coords map for sidebar zoom
        for (const [key, coords] of Object.entries(keyCoords)) {
          if (coords) cityCoordMap.current[key] = coords
        }

        const result: GeocodedOrg[] = []
        for (const { org, geo } of orgGeoKeys) {
          if (!geo) continue
          const coords = keyCoords[geo.key]
          if (!coords) continue
          const j = () => (Math.random() - 0.5) * 0.012
          result.push({ ...org, lat: coords[0] + j(), lng: coords[1] + j(), displayCity: geo.displayCity })
        }
        setGeocoded(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  const cityRanking = (() => {
    const map: Record<string, { count: number; key: string }> = {}
    for (const o of geocoded) {
      const geo = getGeoKey(o)
      if (!geo) continue
      if (!map[o.displayCity]) map[o.displayCity] = { count: 0, key: geo.key }
      map[o.displayCity].count++
    }
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 40)
  })()

  const flyToCity = (key: string) => {
    const coords = cityCoordMap.current[key]
    if (coords && leafletMap.current) {
      leafletMap.current.flyTo(coords, 13, { duration: 1.2 })
    }
  }

  const content = (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground z-[1000] bg-background">
            <Loader2 className="h-8 w-8 animate-spin" />
            {progress.total > 0 ? (
              <p className="text-sm">Geocodifica {progress.done}/{progress.total} località...</p>
            ) : (
              <p className="text-sm">Caricamento organizzazioni...</p>
            )}
          </div>
        )}
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Ranking sidebar */}
      <div className="w-64 border-l bg-background flex flex-col shrink-0">
        <div className="p-3 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Città
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {geocoded.length}/{orgs.length} org. geolocalizzate
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-0.5">
            {cityRanking.map(([city, { count, key }], i) => (
              <button
                key={city}
                onClick={() => flyToCity(key)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-muted/60 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
                  <span className="text-sm truncate">{city}</span>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0 ml-1">{count}</Badge>
              </button>
            ))}
            {cityRanking.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nessuna organizzazione geolocalizzata
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
        "--sidebar-width-icon": "3rem",
        "--header-height": "calc(var(--spacing) * 14)",
      } as React.CSSProperties}
      className={config.collapsible === "none" ? "sidebar-none-mode" : ""}
    >
      {config.side === "left" ? (
        <>
          <AppSidebar variant={config.variant} collapsible={config.collapsible} side={config.side} />
          <SidebarInset className="flex flex-col overflow-hidden">
            <SiteHeader />
            <AnnouncementBanner />
            {content}
          </SidebarInset>
        </>
      ) : (
        <>
          <SidebarInset className="flex flex-col overflow-hidden">
            <SiteHeader />
            <AnnouncementBanner />
            {content}
          </SidebarInset>
          <AppSidebar variant={config.variant} collapsible={config.collapsible} side={config.side} />
        </>
      )}
    </SidebarProvider>
  )
}
