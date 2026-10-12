# Ferreteros

Sistema de gestión para ferretería con backend en Flask y frontend en React/Vite. El proyecto combina autenticación JWT, gestión de usuarios, productos, inventario, ventas, facturación, devoluciones, domicilios y reportes.

## Estado actual

Este repositorio ya incluye una base funcional de backend y una interfaz de frontend con paneles por rol. La autenticación está conectada y se valida con JWT; otras pantallas pueden seguir dependiendo de datos de ejemplo o contratos que aún están en integración.

La referencia de trabajo pendiente queda documentada en [TODO_INTEGRACION.md](TODO_INTEGRACION.md). La documentación de usuario y desarrollador del proyecto quedó separada en la carpeta [documentacion](documentacion).

---

## 1. Objetivo del sistema

El sistema está pensado para apoyar operaciones básicas de una ferretería, entre ellas:

- administración de usuarios y roles,
- gestión de productos y categorías,
- control de inventario por sucursal,
- ventas y facturación,
- devoluciones y entregas,
- alertas de stock,
- reportes operativos y financieros,
- navegación por rol según el tipo de usuario.

---

## 2. Arquitectura

### Backend
- Python 3.10+
- Flask
- Flask-SQLAlchemy
- Flask-JWT-Extended
- Marshmallow
- PostgreSQL
- Pytest

### Frontend
- React 18
- Vite
- Axios
- Tailwind CSS
- Recharts
- Lucide React

### Estructura principal

```text
ferreteros/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── extensions.py
│   ├── errors/
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── utils/
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── tests/
├── migrations/
├── documentacion/
├── requirements.txt
├── wsgi.py
├── README.md
├── TODO_INTEGRACION.md
└── ...
```

---

## 3. Configuración inicial

### 3.1 Crear entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3.2 Variables de entorno

El backend necesita una base de datos configurada y una clave JWT.

Ejemplo:

```env
SQLALCHEMY_DATABASE_URI=postgresql://usuario:password@localhost:5432/ferreteros
JWT_SECRET_KEY=clave-secreta
```

### 3.3 Base de datos

```bash
flask --app wsgi db upgrade
```

La app usa SQLAlchemy con migraciones. El sistema requiere que existan registros básicos de catálogo y sucursal para poder operar correctamente.

---

## 4. Ejecutar el proyecto

### Backend

```bash
flask --app wsgi run --debug
```

O también:

```bash
python wsgi.py
```

### Frontend

Desde la carpeta frontend:

```bash
npm install
npm run dev
```

El frontend utiliza Vite y se conecta al backend por `http://127.0.0.1:5000` o por la URL configurada según el entorno.

---

## 5. Autenticación y sesión

### Login

Ruta activa:

```http
POST /api/auth/login
```

Payload esperado:

```json
{
  "primerNombre": "Ana",
  "password": "contraseña"
}
```

Si es válido, el backend devuelve un JWT con el rol y la sucursal del usuario.

### Validación de sesión

La aplicación frontend guarda el token en `sessionStorage` y valida la sesión en:

```http
GET /api/auth/me
```

Los roles actuales del sistema se normalizan como:

- `admin`
- `vendedor`
- `bodega`

---

## 6. Funcionalidad disponible

### 6.1 Productos

Rutas principales:

- `GET /api/productos`
- `GET /api/productos/<id>`
- `POST /api/productos`
- `PUT /api/productos/<id>`

Permite listar, buscar, crear y actualizar productos.

### 6.2 Inventario

Rutas principales:

- `GET /api/inventario`
- `POST /api/inventario/ajustar`

Se consulta stock disponible por sucursal y se puede ajustar con operaciones de suma o resta.

### 6.3 Ventas

Rutas principales:

- `POST /api/ventas`
- `GET /api/ventas`
- `GET /api/ventas/<id>`
- `GET /api/ventas/<id>/factura`

La venta valida stock, sucursal, tipo de venta, método de pago y permisos. Genera factura y descuenta inventario.

### 6.4 Devoluciones y domicilios

Hay blueprints y rutas para estos módulos, pero su uso real depende de integración adicional y validaciones de negocio.

### 6.5 Reportes

El backend expone estructura de reportes y el frontend tiene pantallas para reportes, aunque aún debe alinearse con los contratos definitivos y datos reales.

---

## 7. Roles de usuario

### Administrador
- supervisión general,
- gestión de inventario y productos,
- ventas y facturas,
- reportes del negocio,
- revisión de sucursales, alertas y usuarios.

### Vendedor
- registro de ventas,
- consulta de ventas e historial,
- facturas y detalle,
- procesos de atención comercial,
- devoluciones y domicilios según el flujo que esté operativo.

### Bodega
- consulta de inventario,
- ajustes de stock,
- revisión de alertas,
- manejo de mercancía dañada.

---

## 8. Estado de integraciones

El proyecto ya está en una etapa donde:

- la autenticación está conectada,
- los paneles por rol ya existen,
- el backend central de productos, inventario y ventas está activo,
- algunos módulos visuales todavía usan datos de ejemplo o mocks.

El documento [TODO_INTEGRACION.md](TODO_INTEGRACION.md) detalla los pendientes reales de integración y la separación entre lo funcional y lo que aún es maqueta visual.

---

## 9. Pruebas

Ejecuta la suite desde la raíz:

```bash
pytest -q
```

También puede ejecutarse por módulo:

```bash
pytest tests/test_venta.py -q
pytest tests/test_inventario.py -q
```

---

## 10. Recomendaciones de uso y mantenimiento

- no exponer rutas internas sin protección,
- validar permisos por sucursal en cada operación sensible,
- mantener el contrato de la API documentado,
- revisar stock antes de registrar ventas,
- no confiar en mocks cuando ya existe la ruta real del backend,
- actualizar la documentación cada vez que se agreguen rutas nuevas o se modifiquen contratos.

---

## 11. Documentación adicional

- Manual de usuario: [documentacion/MANUAL_USUARIO.md](documentacion/MANUAL_USUARIO.md)
- Manual del desarrollador: [documentacion/MANUAL_DESARROLLADOR.md](documentacion/MANUAL_DESARROLLADOR.md)
- Estado de integración y pendientes: [TODO_INTEGRACION.md](TODO_INTEGRACION.md)

---

## 12. Conclusión

Ferreteros tiene una base funcional de gestión empresarial para ferretería, centrada en autenticación, inventario, ventas y reportes, con una interfaz por roles y un backend modular. El proyecto ya está avanzado, pero aún requiere cerrar la integración de varios módulos y endurecer permisos y contratos para que la operación sea 100% confiable en producción.
