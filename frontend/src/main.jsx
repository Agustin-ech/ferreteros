import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { iniciarSincronizacion } from './offline/colaVentas'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Envía las ventas hechas sin internet cuando vuelve la conexión.
iniciarSincronizacion()

// El service worker guarda la aplicación para que abra sin internet. Solo en
// producción: en desarrollo interferiría con la recarga en caliente de Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
