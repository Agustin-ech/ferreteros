import { useCallback, useEffect, useRef, useState } from 'react'

// La app cambia de pantalla sin cambiar de URL, así que las flechas del
// navegador sacaban al usuario del programa. Este hook guarda cada cambio de
// pantalla en el historial (con #pagina en la URL), así "atrás" y "adelante"
// recorren las pantallas visitadas y recargar conserva la pantalla actual.
const paginaDeUrl = () => decodeURIComponent(window.location.hash.slice(1)) || null

export default function usePaginaHistorial(inicial = 'inicio') {
  const [pagina, setPagina] = useState(() => paginaDeUrl() || inicial)

  useEffect(() => {
    // La entrada actual del historial queda asociada a la pantalla inicial.
    window.history.replaceState({ ...window.history.state, pagina }, '', `#${encodeURIComponent(pagina)}`)
    const alNavegar = (evento) => setPagina(evento.state?.pagina || paginaDeUrl() || inicial)
    window.addEventListener('popstate', alNavegar)
    return () => window.removeEventListener('popstate', alNavegar)
    // Solo al montar el panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ref con la pantalla actual: el pushState no puede ir dentro de setPagina
  // porque React puede ejecutar esa función dos veces y duplicaría la entrada.
  const actual = useRef(pagina)
  actual.current = pagina

  const navegar = useCallback((nueva) => {
    if (nueva === actual.current) return
    actual.current = nueva
    window.history.pushState({ pagina: nueva }, '', `#${encodeURIComponent(nueva)}`)
    setPagina(nueva)
  }, [])

  return [pagina, navegar]
}

// Al cerrar sesión se quita la pantalla de la URL para que el próximo usuario
// (quizá de otro rol) empiece en su inicio.
export function limpiarPaginaDeUrl() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}
