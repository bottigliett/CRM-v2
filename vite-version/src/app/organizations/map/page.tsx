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
import { ScrollArea } from '@/components/ui/scroll-area'
import { MapPin, Loader2, Building2 } from 'lucide-react'

interface GeocodedOrg extends Organization {
  lat: number
  lng: number
  displayCity: string
}

// ── Geocode cache ──────────────────────────────────────────────
const CACHE_KEY = 'crm_geocode_v4'
function loadCache(): Record<string, [number, number] | null> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}
function saveCache(c: Record<string, [number, number] | null>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch {}
}

let lastGeoReq = 0
async function nominatim(params: string): Promise<[number, number] | null> {
  const key = params
  const cache = loadCache()
  if (key in cache) return cache[key]

  const now = Date.now()
  const wait = Math.max(0, 1100 - (now - lastGeoReq))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastGeoReq = Date.now()

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}&format=json&limit=1&countrycodes=it`,
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
  } catch { return null }
}

// ── Address extraction ─────────────────────────────────────────
function getOrgGeoKey(org: Organization): { key: string; displayCity: string; searchFn: () => Promise<[number,number]|null> } | null {
  // Use ship* fields (indirizzo punto vendita) for geocoding
  const cap = org.shipCode?.trim().match(/^\d{5}$/)
    ? org.shipCode.trim()
    : org.shipState?.trim().match(/^\d{5}$/)
    ? org.shipState.trim()
    : null

  const city = org.shipCity?.trim() || null

  if (cap) {
    return {
      key: `cap:${cap}`,
      displayCity: city || cap,
      searchFn: () => nominatim(`postalcode=${encodeURIComponent(cap)}&country=it`),
    }
  }
  if (city) {
    return {
      key: `city:${city.toLowerCase()}`,
      displayCity: city,
      searchFn: () => nominatim(`q=${encodeURIComponent(city + ', Italia')}`),
    }
  }
  // Last resort: use full street if it contains comma-separated data
  if (org.shipStreet?.includes(',')) {
    const parts = org.shipStreet.split(',').map(p => p.trim()).filter(Boolean)
    const streetCity = parts[1] ?? null
    const streetCap = parts[2]?.match(/^\d{5}$/) ? parts[2] : null
    if (streetCap) {
      return {
        key: `cap:${streetCap}`,
        displayCity: streetCity || streetCap,
        searchFn: () => nominatim(`postalcode=${encodeURIComponent(streetCap)}&country=it`),
      }
    }
    if (streetCity) {
      return {
        key: `city:${streetCity.toLowerCase()}`,
        displayCity: streetCity,
        searchFn: () => nominatim(`q=${encodeURIComponent(streetCity + ', Italia')}`),
      }
    }
  }
  return null
}

// ── Marker CSS animation (injected once) ──────────────────────
const MARKER_CSS = `
@keyframes crmPing { 75%,100%{transform:scale(2.8);opacity:0} }
.crm-marker-ring{position:absolute;inset:0;border-radius:50%;background:#3b82f6;animation:crmPing 2s cubic-bezier(0,0,.2,1) infinite;opacity:.6}
.crm-marker-dot{position:absolute;inset:2px;border-radius:50%;background:#93c5fd}
`

export default function OrganizationsMapPage() {
  const navigate = useNavigate()
  const { config } = useSidebarConfig()
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const cityCoords = useRef<Record<string, [number, number]>>({})

  const [orgs, setOrgs] = useState<Organization[]>([])
  const [geocoded, setGeocoded] = useState<GeocodedOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  // Inject marker CSS once
  useEffect(() => {
    const id = 'crm-map-styles'
    if (!document.getElementById(id)) {
      const s = document.createElement('style')
      s.id = id
      s.textContent = MARKER_CSS
      document.head.appendChild(s)
    }
    return () => document.getElementById(id)?.remove()
  }, [])

  // Build Leaflet map after geocoding finishes
  useEffect(() => {
    if (loading || !mapRef.current || geocoded.length === 0 || leafletMap.current) return

    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current || leafletMap.current) return

      const map = L.map(mapRef.current, { zoomControl: false }).setView([42.5, 12.5], 6)
      leafletMap.current = map

      // Dark CartoDB tiles — free, no API key
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      // Custom zoom control bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      const dotIcon = L.divIcon({
        className: '',
        html: '<div style="position:relative;width:12px;height:12px"><div class="crm-marker-ring"></div><div class="crm-marker-dot"></div></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        popupAnchor: [0, -10],
      })

      for (const org of geocoded) {
        const name = org.denomination || org.name
        const popup = L.popup({ className: 'crm-popup', minWidth: 200 }).setContent(`
          <div style="font-family:system-ui,sans-serif;padding:2px 0">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px;color:#f1f5f9">${name}</p>
            ${org.displayCity ? `<p style="color:#94a3b8;font-size:12px;margin:0 0 3px">📍 ${org.displayCity}</p>` : ''}
            ${org.phone ? `<p style="color:#94a3b8;font-size:12px;margin:0 0 8px">📞 ${org.phone}</p>` : ''}
            <a id="ol-${org.id}" href="#" style="display:inline-block;background:#3b82f6;color:white;font-size:11px;font-weight:600;padding:4px 10px;border-radius:4px;text-decoration:none">
              Scheda completa →
            </a>
          </div>
        `)

        L.marker([org.lat, org.lng], { icon: dotIcon })
          .bindTooltip(name, { direction: 'top', offset: [0, -10], className: 'crm-tooltip' })
          .bindPopup(popup)
          .on('popupopen', () => {
            document.getElementById(`ol-${org.id}`)?.addEventListener('click', e => {
              e.preventDefault()
              navigate(`/organizations/${org.id}`)
            })
          })
          .addTo(map)
      }

      // Custom popup/tooltip styles
      const ps = document.createElement('style')
      ps.textContent = `
        .crm-popup .leaflet-popup-content-wrapper{background:#1e293b;border:1px solid #334155;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.5);color:#f1f5f9}
        .crm-popup .leaflet-popup-tip{background:#1e293b}
        .crm-popup .leaflet-popup-close-button{color:#94a3b8!important}
        .crm-popup .leaflet-popup-content{margin:14px 16px}
        .crm-tooltip{background:#1e293b;color:#f1f5f9;border:1px solid #334155;border-radius:6px;font-size:12px;padding:4px 8px;box-shadow:0 2px 8px rgba(0,0,0,.4)}
        .crm-tooltip::before{border-top-color:#334155!important}
        .leaflet-control-zoom a{background:#1e293b!important;color:#94a3b8!important;border-color:#334155!important}
        .leaflet-control-zoom a:hover{background:#334155!important;color:#f1f5f9!important}
        .leaflet-control-attribution{background:rgba(15,23,42,.7)!important;color:#475569!important}
        .leaflet-control-attribution a{color:#3b82f6!important}
      `
      document.head.appendChild(ps)
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

        // Deduplicate geo keys
        const orgKeys = all.map(o => ({ org: o, gk: getOrgGeoKey(o) }))
        const uniqueMap = new Map<string, typeof orgKeys[0]['gk']>()
        for (const { gk } of orgKeys) {
          if (gk && !uniqueMap.has(gk.key)) uniqueMap.set(gk.key, gk)
        }

        const entries = [...uniqueMap.entries()]
        setProgress({ done: 0, total: entries.length })

        const coords: Record<string, [number, number] | null> = {}
        for (let i = 0; i < entries.length; i++) {
          if (cancelled) return
          const [key, gk] = entries[i]
          const r = await gk!.searchFn()
          coords[key] = r
          if (r) cityCoords.current[key] = r
          setProgress({ done: i + 1, total: entries.length })
        }

        if (cancelled) return

        const result: GeocodedOrg[] = []
        for (const { org, gk } of orgKeys) {
          if (!gk) continue
          const c = coords[gk.key]
          if (!c) continue
          const j = () => (Math.random() - 0.5) * 0.012
          result.push({ ...org, lat: c[0] + j(), lng: c[1] + j(), displayCity: gk.displayCity })
        }
        setGeocoded(result)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [])

  // City ranking for sidebar
  const cityRanking = (() => {
    const m: Record<string, { count: number; key: string }> = {}
    for (const o of geocoded) {
      const gk = getOrgGeoKey(o)
      if (!gk) continue
      if (!m[o.displayCity]) m[o.displayCity] = { count: 0, key: gk.key }
      m[o.displayCity].count++
    }
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count).slice(0, 50)
  })()

  const flyTo = (key: string) => {
    const c = cityCoords.current[key]
    if (c && leafletMap.current) leafletMap.current.flyTo(c, 13, { duration: 1.2 })
  }

  const mapContent = (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Map */}
      <div className="flex-1 relative bg-slate-950">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-[1000] bg-slate-950">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-blue-400" />
              </div>
              <div className="absolute inset-0 rounded-full border border-blue-500/10 animate-ping" />
            </div>
            {progress.total > 0 ? (
              <div className="text-center">
                <p className="text-sm text-slate-300">Geocodifica in corso...</p>
                <p className="text-xs text-slate-500 mt-1">{progress.done} / {progress.total} località</p>
                <div className="mt-3 w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Caricamento organizzazioni...</p>
            )}
          </div>
        )}
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Sidebar */}
      <div className="w-60 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-slate-200">Distribuzione</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 bg-slate-800 rounded-md px-2.5 py-1.5 flex-1">
              <Building2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="text-xs text-slate-300">
                <span className="font-semibold text-white">{geocoded.length}</span>
                <span className="text-slate-500"> / {orgs.length}</span>
              </span>
            </div>
            <div className="bg-slate-800 rounded-md px-2.5 py-1.5">
              <span className="text-xs text-slate-400">{cityRanking.length} città</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-1.5">
            {cityRanking.map(([city, { count, key }], i) => (
              <button
                key={city}
                onClick={() => flyTo(key)}
                className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-800 transition-colors text-left group"
              >
                <span className="text-xs text-slate-600 w-4 shrink-0 font-mono">{i + 1}</span>
                <span className="text-xs text-slate-300 truncate flex-1 group-hover:text-white transition-colors">{city}</span>
                <span className="text-xs font-semibold text-blue-400 shrink-0">{count}</span>
              </button>
            ))}
            {cityRanking.length === 0 && !loading && (
              <p className="text-xs text-slate-600 text-center py-10">
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
            {mapContent}
          </SidebarInset>
        </>
      ) : (
        <>
          <SidebarInset className="flex flex-col overflow-hidden">
            <SiteHeader />
            <AnnouncementBanner />
            {mapContent}
          </SidebarInset>
          <AppSidebar variant={config.variant} collapsible={config.collapsible} side={config.side} />
        </>
      )}
    </SidebarProvider>
  )
}
