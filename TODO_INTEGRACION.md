# TODO de integración Backend + Frontend

Estado revisado el 2026-10-15. Hay flujos de API conectados y probados; las pantallas restantes de maqueta no deben considerarse operativas con datos reales hasta completar las tareas siguientes.

## PARA SOLUCIONAR

Cosas que ya existen en uno o ambos lados, pero tienen nombres/contratos distintos, no están registradas o siguen implementadas como maqueta.

- [x] **Login y sesión JWT**: el formulario envía `primerNombre` y `password` a `/api/auth/login`, obtiene el rol del backend, conserva el token en `sessionStorage` y valida la sesión en `/api/auth/me`.
- [ ] **Contrato común de API**: documentar rutas, parámetros, cuerpos, respuestas y códigos de error para cada flujo; retirar URLs inventadas como `/dashboard/resumen` y usar rutas existentes.
- [ ] **Administrador: inventario y productos**: mapear los campos de UI (`codigo`, `stock`, `venta`, `compra`) a `codigoSKU`, `cantidadDisponible`, `precio` y `costoUnitario`; utilizar IDs de sucursal, tipo y unidad del backend.
- [ ] **Administrador: inicio, facturas y finanzas**: sustituir datos de `mockData.js` por `/api/ventas`, `/api/ventas/<id>/factura` y los reportes disponibles. No mostrar egresos como datos reales: hoy no hay módulo de tesorería que los respalde.
- [ ] **Administrador: reportes**: adaptar las vistas al contrato `{ kpis, secciones, periodo, alcance }` de `/api/v1/reportes`; las filas llegan como valores ordenados por las columnas declaradas.
- [ ] **Vendedor: registrar venta**: enviar el contrato requerido por `/api/ventas` (`idSucursal`, `idTipoVenta`, `metodoPago`, `detalles` con `idProducto` y `cantidad`). Reemplazar el producto y total estáticos; mostrar la factura que devuelve el servidor.
- [ ] **Vendedor: búsquedas e historial**: conectar el listado paginado `/api/ventas`, el detalle y la factura, respetando los filtros y nombres de parámetros admitidos.
- [ ] **Vendedor: devoluciones y domicilios**: adaptar formularios a los IDs y detalles que requieren `/api/devoluciones` y `/api/domicilios`; reemplazar búsqueda de texto estática por consulta real.
- [x] **Bodega: productos e inventario**: productos y saldos se cargan desde `/api/productos` y `/api/inventario`; los formularios usan los catálogos y los IDs del backend, y los ajustes registran motivo y traducen la diferencia a `suma` o `resta` en `/api/inventario/ajustar`.
- [x] **Bodega: mercancía dañada**: el servicio registra existencias y ajustes auditados; los endpoints `/api/v1/mercancia-danada` exigen JWT/roles y respetan la sucursal; formulario, consulta, transiciones y reporte usan la API en lugar de los datos ficticios.
- [x] **Rutas de clientes y sucursales**: ambos blueprints están registrados y protegidos por JWT/roles; las pruebas cubren búsqueda y creación de clientes, permisos por sucursal y el uso de sucursales activas en el mockup del administrador. El formulario de venta aún no registra ventas ni clientes nuevos.
- [x] **Roles y alcance por sucursal**: backend y paneles normalizan `administrador`/`admin` y `bodeguero`/`bodega`; inventario, ventas, domicilios, devoluciones, daños y reportes limitan a los no administradores a su sucursal efectiva. La administración de usuarios exige rol `admin` y el panel vendedor muestra su sucursal real.
- [x] **Estados de interfaz**: los flujos conectados muestran carga, vacío y errores accesibles; las vistas de inventario, historial, tipos y mercancía dañada permiten reintentar; errores de validación muestran los mensajes del API y una respuesta 401 finaliza la sesión e informa al usuario.

## PARA AÑADIR

Capacidades que no están implementadas como API funcional en este proyecto y que el diseño del frontend presenta.

- [x] **Personal y permisos**: el panel de empleados usa la API para listar, crear, editar y desactivar cuentas; las operaciones exigen JWT y rol admin, guardan contraseña hasheada, rol y sucursal, y no exponen el hash. Roles y funciones se consultan y persisten en `TipoUsuario`/`Funcion`; solo se pueden crear los roles compatibles `admin`, `vendedor` y `bodega`. Los permisos de módulo se administran por rol.
- [x] **Asistencia**: `POST /api/asistencia/entrada` y `/salida` registran el fichaje del usuario autenticado (una jornada por día); `GET /api/asistencia/mi-asistencia` consulta la jornada propia y `GET /api/asistencia` permite al administrador filtrar por fecha, sucursal y rol. Incluye modelo, migración y conexión de la maqueta existente.
- [ ] **Nómina**: reglas, modelos, endpoints y pruebas; no calcular ni presentar nóminas de ejemplo como información real.
- [ ] **Egresos y caja**: modelo de tesorería y endpoints para registrar gastos, compras, pagos y recaudos; conectar ingresos/egresos solo después de definir su contrato.
- [ ] **Recepción y compras a proveedores**: completar el ciclo de pedido/recepción y los endpoints de compra que alimentan existencias e historial.
- [ ] **Catálogos para formularios**: endpoints de lectura para tipo de venta, métodos de pago, tipo de producto, unidades, tipos de devolución y sucursales activas, o acordar cuáles ya se administran por otro mecanismo.
- [ ] **Inicialización de datos de desarrollo**: crear un mecanismo repetible y documentado para cargar catálogos y usuarios de prueba sin reutilizar contraseñas en el frontend.
- [ ] **Pruebas de integración frontend/API**: probar login válido e inválido, autorización JWT, roles, contratos de entrada/salida y los flujos críticos usando una base de pruebas.
- [ ] **Despliegue**: configurar HTTPS, origen CORS permitido, URL de API por entorno, gestión segura de secretos y pasos de migración/rollback.

## Orden de trabajo sugerido

1. Validar el login desde el navegador con un usuario real de la base de datos.
2. Conectar una ruta de lectura por rol: productos/inventario para bodega y listado de ventas para vendedor/admin.
3. Completar operaciones de escritura de venta y ajuste de inventario, con pruebas de extremo a extremo.
4. Conectar devoluciones, domicilios y reportes implementados.
5. Decidir qué pantallas sin backend se eliminan temporalmente y cuáles justifican construir nuevos módulos.
6. Reemplazar los mocks restantes, endurecer permisos y desplegar con HTTPS.