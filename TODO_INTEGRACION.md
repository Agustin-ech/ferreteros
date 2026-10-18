# TODO de integración Backend + Frontend

Estado revisado el 2026-10-14. La autenticación, el inventario de administrador, las vistas de inicio/facturas/finanzas y la primera versión de Tesorería ya consultan o guardan datos del backend; otras áreas siguen pendientes.

## PARA SOLUCIONAR

Cosas que ya existen en uno o ambos lados, pero tienen nombres/contratos distintos, no están registradas o siguen implementadas como maqueta.

- [x] **Login y sesión JWT**: el formulario envía `primerNombre` y `password` a `/api/auth/login`, obtiene el rol del backend, conserva el token en `sessionStorage` y valida la sesión en `/api/auth/me`.
- [ ] **Contrato común de API**: documentar rutas, parámetros, cuerpos, respuestas y códigos de error para cada flujo; retirar URLs inventadas como `/dashboard/resumen` y usar rutas existentes.
- [x] **Administrador: inventario y productos**: mapear los campos de UI (`codigo`, `stock`, `venta`, `compra`) a `codigoSKU`, `cantidadDisponible`, `precio` y `costoUnitario`; utilizar IDs de sucursal, tipo y unidad del backend.
- [x] **Administrador: inicio, facturas y finanzas**: sustituir datos de `mockData.js` por `/api/ventas`, `/api/ventas/<id>/factura`, `/api/v1/reportes/ventas` y `/api/tesoreria/resumen`; mantener la organización de Inicio, tomar ingresos de ventas activas y mostrar solo egresos registrados en Tesorería.
- [x] **Administrador: reportes disponibles**: conectar ventas, facturación, devoluciones, ventas por producto, existencias, consolidado de sucursales y compras a proveedores al catálogo y contrato `{ kpis, secciones, periodo, alcance }` de `/api/v1/reportes`; las filas se asocian por posición con las columnas declaradas. Ingresos/egresos, estado de resultados y el reporte de empleados continúan pendientes por falta de datos/API completa.
- [x] **Kardex de mercancía**: registrar automáticamente ventas, devoluciones aptas y ajustes; consultar movimientos paginados por sucursal, producto, tipo y período. Disponible para administración y bodega, con bodega restringida a su sucursal.
- [x] **Administrador: empleados**: conectar listado, catálogos, creación con contraseña temporal, edición y activación/desactivación a la API; restringir las rutas a administradores y mantener las contraseñas fuera de las respuestas.
- [ ] **Vendedor: registrar venta**: enviar el contrato requerido por `/api/ventas` (`idSucursal`, `idTipoVenta`, `metodoPago`, `detalles` con `idProducto` y `cantidad`). Reemplazar el producto y total estáticos; mostrar la factura que devuelve el servidor.
- [ ] **Vendedor: búsquedas e historial**: conectar el listado paginado `/api/ventas`, el detalle y la factura, respetando los filtros y nombres de parámetros admitidos.
- [ ] **Vendedor: devoluciones y domicilios**: adaptar formularios a los IDs y detalles que requieren `/api/devoluciones` y `/api/domicilios`; reemplazar búsqueda de texto estática por consulta real.
- [ ] **Bodega: productos e inventario**: dejar de guardar saldos y productos en `localStorage`; persistir productos con `/api/productos`, consultar existencias con `/api/inventario` y traducir ajustes de stock a la operación `suma` o `resta` de `/api/inventario/ajustar`.
- [ ] **Bodega: mercancía dañada**: antes de conectarla, completar las funciones que faltan en `inventario_service` (las rutas importan `existencias`, `ajustar_inventario`, `costo_de` y `dec`), proteger sus endpoints con JWT/roles y registrar el blueprint solo cuando pase sus pruebas.
- [ ] **Rutas ya escritas pero no activas**: registrar y probar los blueprints de clientes y sucursales si esos flujos se van a usar; actualmente están implementados en archivos de rutas, pero no se registran en `create_app`.
- [ ] **Roles y alcance por sucursal**: normalizar `admin`, `vendedor` y `bodega` entre la tabla de roles y los paneles; validar en API que usuarios no administradores solo consulten/editen su sucursal.
- [ ] **Estados de interfaz**: agregar estados de carga, vacío, error de validación, expiración de sesión y reintento en las vistas conectadas.

## PARA AÑADIR

Capacidades que no están implementadas como API funcional en este proyecto y que el diseño del frontend presenta.

- [ ] **Permisos por función**: completar una interfaz y API para administrar permisos granulares. La gestión básica de empleados y asignación de roles del sistema ya está integrada; asistencia y nómina continúan pendientes por falta de modelos y persistencia.
- [ ] **Asistencia**: modelos, persistencia y endpoints para registrar entradas/salidas y consultar asistencia.
- [ ] **Nómina**: reglas, modelos, endpoints y pruebas; no calcular ni presentar nóminas de ejemplo como información real.
- [x] **Tesorería (primera versión)**: ventas activas como ingresos automáticos; registro y consulta de egresos manuales con usuario, fecha, sucursal y método de pago. Los pagos de pedidos a proveedores, recaudos distintos de ventas, edición/anulación y conciliación bancaria todavía no están integrados.
- [ ] **Recepción y compras a proveedores**: el administrador ya puede registrar órdenes y actualizar su estado mediante la API; falta completar la recepción física, actualizar existencias e integrar el historial de compras.
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