# Ferretería Ferreteros S.A. — Frontend

Panel construido con React, Vite y Tailwind CSS. El inicio de sesión ya usa el endpoint JWT del backend. La mayoría de las demás pantallas todavía muestran datos de ejemplo; consulta [`TODO_INTEGRACION.md`](../TODO_INTEGRACION.md) para el estado y el trabajo pendiente.

## Ejecutar en desarrollo

Instala las dependencias una vez:

```bash
npm install
```

Inicia Flask desde la raíz del repositorio:

```bash
source venv/bin/activate
flask --app wsgi run --debug
```

En otra terminal, inicia Vite desde `frontend/`:

```bash
npm run dev
```

Abre `http://localhost:5173`. Vite reenvía las rutas `/api` a Flask en `http://127.0.0.1:5000`. Flask debe tener su `.env` y una base de datos con usuarios activos configurados. Ingresa el `primerNombre` y la contraseña de un usuario existente; el rol se obtiene de la respuesta del backend, no se selecciona en el formulario.

Para apuntar el frontend a otro origen de API, copia `.env.example` a `.env` y asigna `VITE_API_URL` al origen (sin añadir `/api` al final). No subas `.env` al repositorio.

## Sesión

El frontend conserva el JWT en `sessionStorage`, lo envía como `Authorization: Bearer ...` y valida la sesión con `/api/auth/me` al recargar. Cerrar sesión elimina el token. Las autorizaciones reales deben seguir verificándose en Flask; ocultar una pantalla no es un control de acceso.

## Build

```bash
npm run build
```
