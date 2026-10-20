// Códigos de Funcion.modulo; deben coincidir con app/utils/permisos.py.
export const MODULOS = {
  ventas: 'VENTAS',
  domicilios: 'DOMICILIOS',
  productos: 'PRODUCTOS',
  mermas: 'MERMAS',
  ajustes: 'AJUSTES',
  devoluciones: 'DEVOLUC',
}

// Devuelve una función que dice si el usuario tiene un módulo. Un elemento
// sin `modulo` siempre se muestra. El backend es quien hace cumplir el
// permiso; aquí solo se ocultan las opciones que no se pueden usar.
export function crearVerificador(modulos = []) {
  const permitidos = new Set(modulos)
  return (modulo) => !modulo || permitidos.has(modulo)
}

export function filtrarNavegacion(navegacion, puede) {
  return navegacion
    .map((item) => (item.children ? { ...item, children: item.children.filter((hijo) => puede(hijo.modulo)) } : item))
    .filter((item) => (item.children ? item.children.length > 0 : puede(item.modulo)))
}

// Página -> módulo, a partir del menú, para bloquear también los accesos
// directos (por ejemplo los botones del inicio).
export function moduloDePagina(navegacion) {
  const mapa = {}
  for (const item of navegacion) {
    if (item.page) mapa[item.page] = item.modulo
    for (const hijo of item.children || []) mapa[hijo.page] = hijo.modulo
  }
  return mapa
}
