import { useEffect, useState } from 'react'
import api from '../api/client'

// Ajusta estas rutas a las que definan tus compañeros de backend.
// Cada una debe devolver datos con la MISMA forma que tiene su
// equivalente en src/data/mockData.js, para que no haya que tocar
// los componentes.
const ENDPOINTS = {
  resumenGeneral: '/dashboard/resumen',
  sucursales: '/sucursales',
  alertasStock: '/inventario/alertas',
  resumenEmpleados: '/empleados/resumen',
  ingresosEgresos: '/finanzas/ingresos-egresos',
  facturasRecientes: '/facturas/recientes',
}

export default function useDashboardData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function cargarDatos() {
      try {
        setLoading(true)
        const entradas = Object.entries(ENDPOINTS)
        const respuestas = await Promise.all(
          entradas.map(([, ruta]) => api.get(ruta))
        )

        if (cancelado) return

        const resultado = {}
        entradas.forEach(([clave], i) => {
          resultado[clave] = respuestas[i].data
        })

        setData(resultado)
        setError(null)
      } catch (err) {
        if (!cancelado) setError(err)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    cargarDatos()
    return () => {
      cancelado = true
    }
  }, [])

  return { data, loading, error }
}
