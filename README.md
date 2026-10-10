# Ferreteros API

API REST para la gestión de una ferretería, construida con Flask, SQLAlchemy y PostgreSQL. Actualmente incluye autenticación JWT, usuarios, productos, inventario y ventas.

## Requisitos

- Python 3.10 o posterior.
- PostgreSQL.
- Una base de datos creada y accesible desde la máquina donde se ejecuta la API.

## Instalación

Desde la raíz del repositorio:

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

En Windows, activa el entorno con:

```powershell
venv\Scripts\Activate.ps1
```

El env por cuestiones de seguridad lo tiene el equipo de desarrollo

## Base De Datos

Con la base de datos creada y las variables de entorno configuradas, aplica las migraciones:

```bash
flask --app wsgi db upgrade
```

Las tablas de catálogo necesarias para operar deben tener datos activos. En particular, las ventas requieren registros en `TipoVenta` y `metodo_pago`; además, deben existir productos, sucursales y registros de inventario. La API no incluye actualmente endpoints para crear todos esos catálogos.

## Ejecutar

Con el entorno virtual activado:

```bash
flask --app wsgi run --debug
```

La API queda disponible por defecto en `http://127.0.0.1:5000`. Para iniciar mediante el archivo WSGI también está disponible:

```bash
python wsgi.py
```

## Pruebas

Ejecuta toda la suite desde la raíz:

```bash
pytest -q
```

Para probar únicamente ventas o inventario:

```bash
pytest tests/test_venta.py -q
pytest tests/test_inventario.py -q
```

## Autenticación

La mayoría de las rutas requieren un token JWT. Inicia sesión con un usuario existente:

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
	"primerNombre": "Ana",
	"password": "tu-contraseña"
}
```

La respuesta contiene `access_token`. En las solicitudes protegidas envíalo como:

```http
Authorization: Bearer <access_token>
```

El token incluye el rol y la sucursal asignada. Los administradores pueden operar sobre cualquier sucursal en ventas; los vendedores quedan limitados a la sucursal del token.

## Endpoints Activos

Los siguientes blueprints se registran al crear la aplicación: autenticación, usuarios, inventario, productos y ventas.

### Autenticación Y Usuarios

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Público | Iniciar sesión y obtener JWT |
| `GET` | `/api/auth/me` | JWT | Consultar el perfil del usuario autenticado |
| `POST` | `/usuarios` | Público actualmente | Crear un usuario |
| `GET` | `/usuarios` | Público actualmente | Listar usuarios |

Las rutas `/usuarios` no tienen protección de rol en el código actual. Resérvalas para desarrollo o protégelas antes de exponer la API públicamente.

### Productos

Prefijo: `/api/productos`. Las rutas usan JWT y roles según la operación.

| Método | Ruta | Roles | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/productos` | admin, bodega, vendedor | Listar y buscar productos; acepta `q`, `idTipoProducto` e `idUnidadMedida` |
| `GET` | `/api/productos/<id>` | admin, bodega, vendedor | Obtener un producto |
| `POST` | `/api/productos` | admin, bodega | Crear un producto |
| `PUT` | `/api/productos/<id>` | admin, bodega | Actualizar un producto |

### Inventario

Prefijo: `/api/inventario`.

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/inventario` | JWT | Consultar existencias; acepta `?sucursal=<id>` |
| `POST` | `/api/inventario/ajustar` | admin | Sumar o restar existencias |

Ejemplo de ajuste:

```json
{
	"idProducto": 1,
	"idSucursal": 1,
	"cantidad": 5.5,
	"operacion": "suma"
}
```

El GET incluye `nombreProducto`, `cantidadDisponible` y un `semaforo` calculado (`rojo`, `amarillo` o `verde`).

### Ventas

Prefijo: `/api/ventas`. Requiere JWT y rol `admin` o `vendedor`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/ventas` | Registrar venta, descontar inventario y generar factura |
| `GET` | `/api/ventas` | Listar ventas paginadas |
| `GET` | `/api/ventas/<id>` | Consultar venta y sus detalles |
| `GET` | `/api/ventas/<id>/factura` | Consultar factura |

Ejemplo de registro:

```json
{
	"idCliente": null,
	"idSucursal": 1,
	"idTipoVenta": 1,
	"metodoPago": "Efectivo",
	"descuento": 0,
	"detalles": [
		{
			"idProducto": 1,
			"cantidad": 2
		}
	]
}
```

`idTipoVenta` debe identificar un tipo de venta activo. `metodoPago` debe coincidir con el nombre de un método de pago activo. El producto y su inventario deben existir y tener stock suficiente. El cliente es opcional; si se envía un ID, debe ser de un cliente activo.

El listado acepta `pagina` y `por_pagina` (máximo 100), además de filtros `sucursal`, `cliente`, `desde` y `hasta`. Las fechas usan formato ISO 8601. Los vendedores solo ven ventas de su sucursal; los administradores pueden consultar todas o filtrar por sucursal.

## Códigos De Respuesta Habituales

- `200`: consulta completada.
- `201`: recurso creado, por ejemplo una venta.
- `400`: JSON inválido, validación fallida, referencias inválidas o stock insuficiente.
- `401`: token JWT ausente o inválido.
- `403`: rol insuficiente o vendedor intentando operar fuera de su sucursal.
- `404`: recurso no encontrado o no visible para el usuario.

## Estructura Principal

```text
app/
	models/      Modelos SQLAlchemy
	routes/      Blueprints y endpoints Flask
	schemas/     Validación y serialización Marshmallow
	services/    Lógica de negocio
	utils/       Autenticación, permisos y utilidades
migrations/    Migraciones Alembic/Flask-Migrate
tests/         Pruebas Pytest
wsgi.py        Punto de entrada de la aplicación
```

Otros módulos aparecen en el repositorio, pero sus blueprints no están registrados actualmente en `create_app`; sus rutas no estarán disponibles hasta que se incorporen allí.
