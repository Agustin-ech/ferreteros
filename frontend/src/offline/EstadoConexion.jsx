import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Trash2, X } from 'lucide-react'
import { descartar, ESTADO, listarCola, reintentar, sincronizar } from './colaVentas'

const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

// Estado de la conexión y de las ventas hechas sin internet. Va en el encabezado.
export default function EstadoConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  const [items, setItems] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [aviso, setAviso] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  const refrescar = useCallback(() => { listarCola().then(setItems).catch(() => {}) }, [])

  useEffect(() => {
    refrescar()
    const alConectar = () => setEnLinea(true)
    const alDesconectar = () => setEnLinea(false)
    // Una consulta respondida con datos guardados indica que el servidor no responde.
    const sinRespuesta = () => setEnLinea(false)
    const sincronizadas = (e) => {
      setEnLinea(true)
      setAviso(`${e.detail.enviadas} venta${e.detail.enviadas === 1 ? '' : 's'} sincronizada${e.detail.enviadas === 1 ? '' : 's'}`)
      setTimeout(() => setAviso(''), 5000)
    }
    window.addEventListener('online', alConectar)
    window.addEventListener('offline:con-conexion', alConectar)
    window.addEventListener('offline', alDesconectar)
    window.addEventListener('offline:sin-conexion', sinRespuesta)
    window.addEventListener('offline:cola', refrescar)
    window.addEventListener('offline:sincronizadas', sincronizadas)
    return () => {
      window.removeEventListener('online', alConectar)
      window.removeEventListener('offline:con-conexion', alConectar)
      window.removeEventListener('offline', alDesconectar)
      window.removeEventListener('offline:sin-conexion', sinRespuesta)
      window.removeEventListener('offline:cola', refrescar)
      window.removeEventListener('offline:sincronizadas', sincronizadas)
    }
  }, [refrescar])

  const pendientes = items.filter((i) => i.estado === ESTADO.pendiente)
  const enRevision = items.filter((i) => i.estado === ESTADO.revision)

  async function accion(fn) {
    setTrabajando(true)
    try { await fn() } finally { setTrabajando(false); refrescar() }
  }

  if (enLinea && !items.length && !aviso) return null

  const base = 'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap'
  return (
    <>
      <div className="flex items-center gap-2">
        {!enLinea && (
          <span className={`${base} border-red-500/40 bg-red-500/10 text-red-300`} title="Las ventas se guardan en este dispositivo y se envían al volver la conexión">
            <CloudOff size={14} /> <span className="hidden sm:inline">Sin conexión</span>
          </span>
        )}
        {aviso && (
          <span className={`${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-300`}>
            <CheckCircle2 size={14} /> <span className="hidden sm:inline">{aviso}</span>
          </span>
        )}
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className={`${base} ${enRevision.length ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}
          >
            {enRevision.length ? <AlertTriangle size={14} /> : <RefreshCw size={14} />}
            {pendientes.length > 0 && <span>{pendientes.length} por enviar</span>}
            {enRevision.length > 0 && <span>{enRevision.length} con problema</span>}
          </button>
        )}
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Ventas sin sincronizar">
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-panel-border bg-panel-card">
            <div className="flex items-center justify-between border-b border-panel-border p-4">
              <div>
                <p className="font-semibold text-white">Ventas guardadas en este dispositivo</p>
                <p className="text-xs text-gray-400">Se envían solas cuando hay conexión. Las que tienen problema necesitan revisión.</p>
              </div>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <ul className="flex-1 divide-y divide-panel-border overflow-y-auto">
              {items.map((item) => (
                <li key={item.idOperacion} className="p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{item.payload.comprobanteProvisional || 'Venta sin conexión'}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(item.creada).toLocaleString('es-CO')} · {item.resumen?.productos?.length || item.payload.detalles.length} producto(s) · {moneda.format(item.resumen?.total || 0)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.estado === ESTADO.revision ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>
                      {item.estado === ESTADO.revision ? 'Con problema' : 'Por enviar'}
                    </span>
                  </div>
                  {item.mensaje && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{item.mensaje}</p>}
                  {item.estado === ESTADO.revision && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" disabled={trabajando} onClick={() => accion(() => reintentar(item.idOperacion))} className="flex items-center gap-1.5 rounded-lg border border-panel-border px-3 py-1.5 text-xs text-gray-200 hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50">
                        <RefreshCw size={13} /> Reintentar
                      </button>
                      <button
                        type="button"
                        disabled={trabajando}
                        onClick={() => {
                          if (window.confirm('¿Descartar esta venta? No se registrará en el sistema. Si ya se cobró, registra el ajuste con el administrador.')) {
                            accion(() => descartar(item.idOperacion))
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-panel-border px-3 py-1.5 text-xs text-gray-300 hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 size={13} /> Descartar
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {!items.length && <li className="p-6 text-center text-sm text-gray-400">No hay ventas pendientes.</li>}
            </ul>
            {pendientes.length > 0 && (
              <div className="border-t border-panel-border p-4 text-right">
                <button type="button" disabled={trabajando} onClick={() => accion(sincronizar)} className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-panel-sidebar hover:brightness-95 disabled:opacity-50">
                  {trabajando ? 'Enviando...' : 'Enviar ahora'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
