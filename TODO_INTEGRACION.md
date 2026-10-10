# TODO de integración Backend + Frontend

Estado revisado el 2026-10-09. El frontend compila, pero solo la autenticación está conectada; el resto de los paneles no debe considerarse operativo con datos reales hasta completar las tareas siguientes.

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
- [ ] **Bodega: productos e inventario**: dejar de guardar saldos y productos en `localStorage`; persistir productos con `/api/productos`, consultar existencias con `/api/inventario` y traducir ajustes de stock a la operación `suma` o `resta` de `/api/inventario/ajustar`.
- [ ] **Bodega: mercancía dañada**: antes de conectarla, completar las funciones que faltan en `inventario_service` (las rutas importan `existencias`, `ajustar_inventario`, `costo_de` y `dec`), proteger sus endpoints con JWT/roles y registrar el blueprint solo cuando pase sus pruebas.
- [ ] **Rutas ya escritas pero no activas**: registrar y probar los blueprints de clientes y sucursales si esos flujos se van a usar; actualmente están implementados en archivos de rutas, pero no se registran en `create_app`.
- [ ] **Roles y alcance por sucursal**: normalizar `admin`, `vendedor` y `bodega` entre la tabla de roles y los paneles; validar en API que usuarios no administradores solo consulten/editen su sucursal.
- [ ] **Estados de interfaz**: agregar estados de carga, vacío, error de validación, expiración de sesión y reintento en las vistas conectadas.

## PARA AÑADIR

Capacidades que no están implementadas como API funcional en este proyecto y que el diseño del frontend presenta.

- [ ] **Personal y permisos**: endpoints para crear/editar/desactivar empleados y asignar roles/funciones. El backend actual solo tiene alta y listado básico de usuarios; el alta no exige autorización.
- [ ] **Asistencia**: modelos, persistencia y endpoints para registrar entradas/salidas y consultar asistencia.
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