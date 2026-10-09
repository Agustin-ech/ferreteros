// Convierte "15/09/2026" -> Date, para poder comparar u ordenar fechas
// guardadas como texto en los datos de ejemplo.
export function parseFecha(str) {
  const [d, m, y] = str.split('/').map(Number)
  return new Date(y, m - 1, d)
}