import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Handle chunk loading errors (happens after new deployments)
// When a user has an old version cached and tries to load a new chunk that doesn't exist
window.addEventListener('error', (event) => {
  // Check if it's a chunk loading error
  if (
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Loading chunk') ||
    event.message?.includes('Loading CSS chunk')
  ) {
    // Prevent infinite reload loop - only reload once per session
    const reloadKey = 'chunk_error_reload'
    const lastReload = sessionStorage.getItem(reloadKey)
    const now = Date.now()

    // Only reload if we haven't reloaded in the last 10 seconds
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem(reloadKey, now.toString())
      window.location.reload()
    }
  }
})

// Also handle unhandled promise rejections (for dynamic imports)
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
    event.reason?.message?.includes('Loading chunk')
  ) {
    const reloadKey = 'chunk_error_reload'
    const lastReload = sessionStorage.getItem(reloadKey)
    const now = Date.now()

    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem(reloadKey, now.toString())
      window.location.reload()
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
