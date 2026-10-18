export default function ApiState({
  loading = false,
  error = '',
  empty = false,
  onRetry,
  loadingMessage = 'Cargando...',
  emptyMessage = 'No hay datos para mostrar.',
  children,
}) {
  if (loading) {
    return <p role="status" className="py-4 text-sm text-gray-400">{loadingMessage}</p>
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        <p>{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-red-400/40 px-3 py-1.5 font-medium hover:bg-red-500/10">
            Reintentar
          </button>
        )}
      </div>
    )
  }

  if (empty) {
    return <p role="status" className="py-4 text-center text-sm text-gray-400">{emptyMessage}</p>
  }

  return children ?? null
}
