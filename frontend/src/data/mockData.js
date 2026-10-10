// Datos de ejemplo para mientras el equipo de backend entrega la API real.
// Cuando esté lista, reemplaza estas constantes por llamadas fetch/axios
// y mantén la misma forma de los datos para no tener que tocar los componentes.

export const resumenGeneral = {
  productosTotales: 1280,
  stockBajo: 18,
  ingresosDelDia: 4500000,
  egresosDelDia: 1800000,
  sucursales: 2,
  variacionIngresos: '+5%',
}

export const sucursales = [
  { nombre: 'La Chinita', productos: 620, porcentaje: 100 },
  { nombre: 'Buenavista', productos: 620, porcentaje: 100 },
]

export const alertasStock = [
  { producto: 'cemento gris', sucursal: 'La Chinita', existencia: 3 },
  { producto: 'alambre#8', sucursal: 'Buenavista', existencia: 5 },
  { producto: 'manguera', sucursal: 'La Chinita', existencia: 4 },
  { producto: 'brocha#4', sucursal: 'Buenavista', existencia: 6 },
]

export const resumenEmpleados = {
  total: 12,
  vendedores: 7,
  bodega: 5,
}

// Datos de ejemplo para el módulo de Empleados (lista, nómina, asistencia)
// y para Reportes > Empleados. Las ventas y facturas de cada quien son
// ilustrativas (no están amarradas 1 a 1 a `facturasCompletas`).
export const empleados = [
  { id: '001', nombre: 'Carlos Pérez', cedula: '1002345678', cargo: 'Vendedor', sucursal: 'La Chinita', telefono: '300 123 4567', correo: 'carlos.perez@ferreteros.com', fechaIngreso: '10/01/2024', rolSistema: 'Vendedor', estado: 'Activo', salarioBase: 1600000, ventas: 18, facturas: 32 },
  { id: '002', nombre: 'María López', cedula: '1002345679', cargo: 'Bodega', sucursal: 'Buenavista', telefono: '301 234 5678', correo: 'maria.lopez@ferreteros.com', fechaIngreso: '15/03/2024', rolSistema: 'Bodeguero', estado: 'Activo', salarioBase: 1450000, ventas: 15, facturas: 28 },
  { id: '003', nombre: 'Juan Torres', cedula: '1002345680', cargo: 'Vendedor', sucursal: 'La Chinita', telefono: '313 456 7890', correo: 'juan.torres@ferreteros.com', fechaIngreso: '02/06/2023', rolSistema: 'Vendedor', estado: 'Activo', salarioBase: 1600000, ventas: 12, facturas: 20 },
  { id: '004', nombre: 'Ana García', cedula: '1002345681', cargo: 'Cajera', sucursal: 'Buenavista', telefono: '310 987 6543', correo: 'ana.garcia@ferreteros.com', fechaIngreso: '20/08/2024', rolSistema: 'Vendedor', estado: 'Activo', salarioBase: 1500000, ventas: 10, facturas: 16 },
  { id: '005', nombre: 'Luis Ramírez', cedula: '1002345682', cargo: 'Administrador', sucursal: 'La Chinita', telefono: '320 111 2233', correo: 'luis.ramirez@ferreteros.com', fechaIngreso: '05/11/2022', rolSistema: 'Administrador', estado: 'Activo', salarioBase: 2600000, ventas: 8, facturas: 16 },
  { id: '006', nombre: 'Sofía Martínez', cedula: '1002345683', cargo: 'Vendedor', sucursal: 'Buenavista', telefono: '315 222 3344', correo: 'sofia.martinez@ferreteros.com', fechaIngreso: '12/02/2025', rolSistema: 'Vendedor', estado: 'Activo', salarioBase: 1600000, ventas: 6, facturas: 11 },
  { id: '007', nombre: 'Andrés Castillo', cedula: '1002345684', cargo: 'Bodega', sucursal: 'La Chinita', telefono: '317 555 6677', correo: 'andres.castillo@ferreteros.com', fechaIngreso: '30/04/2023', rolSistema: 'Bodeguero', estado: 'Inactivo', salarioBase: 1450000, ventas: 0, facturas: 0 },
]

export const modulosSistema = ['Inventario', 'Facturas', 'Finanzas', 'Reportes', 'Empleados', 'Configuración']

export const roles = [
  { rol: 'Administrador', descripcion: 'Acceso total al sistema.', permisos: ['Inventario', 'Facturas', 'Finanzas', 'Reportes', 'Empleados', 'Configuración'], usuarios: 1 },
  { rol: 'Cajero', descripcion: 'Manejo de facturas y ventas.', permisos: ['Facturas', 'Reportes'], usuarios: 2 },
  { rol: 'Vendedor', descripcion: 'Gestión de ventas e inventario.', permisos: ['Inventario', 'Facturas', 'Reportes'], usuarios: 5 },
  { rol: 'Bodeguero', descripcion: 'Control de inventario.', permisos: ['Inventario', 'Reportes'], usuarios: 3 },
]

// Registros de asistencia de ejemplo (varios días, para poder filtrar).
export const asistencia = [
  { fecha: '15/09/2026', empleado: 'Carlos Pérez', cargo: 'Vendedor', sucursal: 'La Chinita', horaEntrada: '07:02 a.m.', horaSalida: '04:58 p.m.', estado: 'Presente' },
  { fecha: '15/09/2026', empleado: 'María López', cargo: 'Bodega', sucursal: 'Buenavista', horaEntrada: '07:15 a.m.', horaSalida: '05:03 p.m.', estado: 'Presente' },
  { fecha: '15/09/2026', empleado: 'Juan Torres', cargo: 'Vendedor', sucursal: 'La Chinita', horaEntrada: '07:10 a.m.', horaSalida: '04:50 p.m.', estado: 'Presente' },
  { fecha: '15/09/2026', empleado: 'Ana García', cargo: 'Cajera', sucursal: 'Buenavista', horaEntrada: '08:05 a.m.', horaSalida: '-', estado: 'Ausente' },
  { fecha: '15/09/2026', empleado: 'Luis Ramírez', cargo: 'Administrador', sucursal: 'La Chinita', horaEntrada: '07:00 a.m.', horaSalida: '05:00 p.m.', estado: 'Presente' },
  { fecha: '15/09/2026', empleado: 'Sofía Martínez', cargo: 'Vendedor', sucursal: 'Buenavista', horaEntrada: '07:08 a.m.', horaSalida: '04:55 p.m.', estado: 'Presente' },
  { fecha: '14/09/2026', empleado: 'Carlos Pérez', cargo: 'Vendedor', sucursal: 'La Chinita', horaEntrada: '07:05 a.m.', horaSalida: '05:01 p.m.', estado: 'Presente' },
  { fecha: '14/09/2026', empleado: 'María López', cargo: 'Bodega', sucursal: 'Buenavista', horaEntrada: '-', horaSalida: '-', estado: 'Ausente' },
  { fecha: '14/09/2026', empleado: 'Juan Torres', cargo: 'Vendedor', sucursal: 'La Chinita', horaEntrada: '07:12 a.m.', horaSalida: '04:48 p.m.', estado: 'Presente' },
  { fecha: '14/09/2026', empleado: 'Ana García', cargo: 'Cajera', sucursal: 'Buenavista', horaEntrada: '08:00 a.m.', horaSalida: '05:00 p.m.', estado: 'Presente' },
  { fecha: '13/09/2026', empleado: 'Luis Ramírez', cargo: 'Administrador', sucursal: 'La Chinita', horaEntrada: '07:00 a.m.', horaSalida: '05:00 p.m.', estado: 'Presente' },
  { fecha: '13/09/2026', empleado: 'Sofía Martínez', cargo: 'Vendedor', sucursal: 'Buenavista', horaEntrada: '07:20 a.m.', horaSalida: '04:52 p.m.', estado: 'Presente' },
]

// Conceptos que arman la nómina (los % de deducción son los legales
// estándar en Colombia: salud y pensión 4% cada uno a cargo del empleado).
export const conceptosNomina = [
  { concepto: 'Salario base', tipo: 'Devengo', valor: 'Según cargo' },
  { concepto: 'Bonificación por ventas', tipo: 'Devengo', valor: '$10.000 por venta' },
  { concepto: 'Auxilio de transporte', tipo: 'Devengo', valor: '$140.000 fijo' },
  { concepto: 'Salud (empleado)', tipo: 'Deducción', valor: '4% del devengado' },
  { concepto: 'Pensión (empleado)', tipo: 'Deducción', valor: '4% del devengado' },
]

export const historialNomina = [
  { periodo: '01/08/2026 - 15/08/2026', totalPagado: 18100000, estado: 'Pagada' },
  { periodo: '16/08/2026 - 31/08/2026', totalPagado: 18450000, estado: 'Pagada' },
  { periodo: '01/09/2026 - 15/09/2026', totalPagado: 18450000, estado: 'Pendiente' },
]

export const movimientosPersonal = [
  { fecha: '15/09/2026', empleado: 'María López', accion: 'Entrada' },
  { fecha: '14/09/2026', empleado: 'Juan Torres', accion: 'Salida' },
  { fecha: '12/09/2026', empleado: 'Ana García', accion: 'Entrada' },
  { fecha: '10/09/2026', empleado: 'Carlos Pérez', accion: 'Entrada' },
  { fecha: '08/09/2026', empleado: 'Luis Ramírez', accion: 'Salida' },
]

export const desempenoPorSucursal = [
  { sucursal: 'La Chinita', porcentaje: 58, etiqueta: 'Excelente' },
  { sucursal: 'Buenavista', porcentaje: 42, etiqueta: '' },
]

export const ingresosEgresos = [
  { dia: 'Lun', ingresos: 2.1, egresos: 1.2 },
  { dia: 'Mar', ingresos: 3.4, egresos: 1.5 },
  { dia: 'Mié', ingresos: 2.8, egresos: 1.1 },
  { dia: 'Jue', ingresos: 4.5, egresos: 1.8 },
  { dia: 'Vie', ingresos: 3.9, egresos: 1.6 },
  { dia: 'Sáb', ingresos: 3.0, egresos: 1.3 },
  { dia: 'Dom', ingresos: 1.8, egresos: 0.9 },
]

// Datos de la empresa, usados en el encabezado de la factura impresa.
export const empresa = {
  nombre: 'Ferretería Ferreteros S.A.',
  eslogan: 'El aliado de construcción',
  nit: 'NIT 900.123.456-7',
  direccion: 'Cra. 45 #10-23, Barranquilla, Colombia',
  telefono: 'Tel: (605) 555-0123',
}

// --- Módulo de Facturas -----------------------------------------------
// Porcentaje de IVA usado para calcular el total de cada factura.
export const IVA_PORCENTAJE = 0.19

// Catálogo completo de facturas de ejemplo (para las páginas "Facturas",
// "Todas las facturas" y las de cada sucursal). Cada factura solo guarda
// el nombre y la cantidad de cada producto; el precio se toma de
// `productosInventario` con calcularTotalesFactura(), para no repetir
// precios en dos lugares y que cuadren con el resto del inventario.
export const facturasCompletas = [
  {
    numero: '00125', fecha: '15/09/2026', hora: '10:24 a.m.', sucursal: 'La Chinita',
    vendedor: 'Carlos Pérez', cliente: 'Cliente general', metodoPago: 'Efectivo', estado: 'Pagada',
    productos: [
      { nombre: 'Cemento Argos 50kg', cantidad: 2 },
      { nombre: 'Pintura blanca', cantidad: 1 },
      { nombre: 'Tornillos 3"', cantidad: 5 },
      { nombre: 'Brocha 4"', cantidad: 2 },
      { nombre: 'Soldadura', cantidad: 1 },
    ],
    historialPagos: [{ fecha: '15/09/2026 - 10:24 a.m.', metodo: 'Efectivo' }],
    notas: 'Cliente compró para obra en el barrio Las Flores.',
  },
  {
    numero: '00124', fecha: '14/09/2026', hora: '3:10 p.m.', sucursal: 'Buenavista',
    vendedor: 'María López', cliente: 'Juan Torres', metodoPago: 'Tarjeta', estado: 'Pagada',
    productos: [
      { nombre: 'Amarre plástico', cantidad: 12 },
      { nombre: 'Extensión eléctrica 10m', cantidad: 1 },
    ],
    historialPagos: [{ fecha: '14/09/2026 - 3:10 p.m.', metodo: 'Tarjeta' }],
    notas: '',
  },
  {
    numero: '00123', fecha: '13/09/2026', hora: '9:02 a.m.', sucursal: 'La Chinita',
    vendedor: 'Juan Torres', cliente: 'Constructora del Caribe', metodoPago: 'Transferencia', estado: 'Pagada',
    productos: [
      { nombre: 'Cemento Argos 50kg', cantidad: 10 },
      { nombre: 'Tubo PVC 1/2"', cantidad: 6 },
    ],
    historialPagos: [{ fecha: '13/09/2026 - 9:02 a.m.', metodo: 'Transferencia' }],
    notas: 'Entrega programada para el 16/09.',
  },
  {
    numero: '00122', fecha: '11/09/2026', hora: '1:45 p.m.', sucursal: 'Buenavista',
    vendedor: 'Ana García', cliente: 'Cliente general', metodoPago: 'Efectivo', estado: 'Pagada',
    productos: [
      { nombre: 'Pintura blanca', cantidad: 3 },
      { nombre: 'Brocha 4"', cantidad: 3 },
    ],
    historialPagos: [{ fecha: '11/09/2026 - 1:45 p.m.', metodo: 'Efectivo' }],
    notas: '',
  },
  {
    numero: '00121', fecha: '10/09/2026', hora: '4:30 p.m.', sucursal: 'La Chinita',
    vendedor: 'Luis Ramírez', cliente: 'Ferretería López', metodoPago: 'Transferencia', estado: 'Pendiente',
    productos: [{ nombre: 'Taladro', cantidad: 1 }],
    historialPagos: [],
    notas: 'Cliente pagará contraentrega.',
  },
  {
    numero: '00120', fecha: '09/09/2026', hora: '11:15 a.m.', sucursal: 'Buenavista',
    vendedor: 'Carlos Pérez', cliente: 'Proyectos J.R.', metodoPago: 'Tarjeta', estado: 'Pagada',
    productos: [
      { nombre: 'Soldadura', cantidad: 8 },
      { nombre: 'Amarre plástico', cantidad: 20 },
    ],
    historialPagos: [{ fecha: '09/09/2026 - 11:15 a.m.', metodo: 'Tarjeta' }],
    notas: '',
  },
  {
    numero: '00119', fecha: '08/09/2026', hora: '2:50 p.m.', sucursal: 'La Chinita',
    vendedor: 'María López', cliente: 'Cliente general', metodoPago: 'Efectivo', estado: 'Pagada',
    productos: [{ nombre: 'Tornillos 3"', cantidad: 30 }],
    historialPagos: [{ fecha: '08/09/2026 - 2:50 p.m.', metodo: 'Efectivo' }],
    notas: '',
  },
  {
    numero: '00118', fecha: '07/09/2026', hora: '10:05 a.m.', sucursal: 'Buenavista',
    vendedor: 'Juan Torres', cliente: 'Construcciones Lara', metodoPago: 'Transferencia', estado: 'Anulada',
    productos: [{ nombre: 'Cemento Argos 50kg', cantidad: 4 }],
    historialPagos: [],
    notas: 'Factura anulada por error en la cantidad.',
  },
  {
    numero: '00117', fecha: '06/09/2026', hora: '5:20 p.m.', sucursal: 'La Chinita',
    vendedor: 'Ana García', cliente: 'Cliente general', metodoPago: 'Efectivo', estado: 'Pagada',
    productos: [
      { nombre: 'Pintura blanca', cantidad: 2 },
      { nombre: 'Tubo PVC 1/2"', cantidad: 3 },
    ],
    historialPagos: [{ fecha: '06/09/2026 - 5:20 p.m.', metodo: 'Efectivo' }],
    notas: '',
  },
  {
    numero: '00116', fecha: '05/09/2026', hora: '9:40 a.m.', sucursal: 'Buenavista',
    vendedor: 'Luis Ramírez', cliente: 'Ferretería López', metodoPago: 'Tarjeta', estado: 'Pagada',
    productos: [
      { nombre: 'Brocha 4"', cantidad: 5 },
      { nombre: 'Amarre plástico', cantidad: 6 },
    ],
    historialPagos: [{ fecha: '05/09/2026 - 9:40 a.m.', metodo: 'Tarjeta' }],
    notas: '',
  },
]

// Calcula productos con precio, subtotal, IVA y total de una factura,
// tomando los precios desde `productosInventario` (fuente única de verdad).
export function calcularTotalesFactura(factura) {
  const productosConPrecio = factura.productos.map((item) => {
    const info = productosInventario.find((p) => p.nombre === item.nombre)
    const precioUnitario = info ? info.precio : 0
    return { ...item, precioUnitario, total: precioUnitario * item.cantidad }
  })
  const subtotal = productosConPrecio.reduce((acc, p) => acc + p.total, 0)
  const iva = Math.round(subtotal * IVA_PORCENTAJE)
  const total = subtotal + iva
  return { productosConPrecio, subtotal, iva, total }
}

export const facturasRecientes = [
  { numero: '00125', sucursal: 'La Chinita', vendedor: 'Carlos Pérez', total: 185000, fecha: '13/09/2026' },
  { numero: '00124', sucursal: 'Buenavista', vendedor: 'María López', total: 92000, fecha: '13/09/2026' },
  { numero: '00123', sucursal: 'La Chinita', vendedor: 'Juan Torres', total: 520100, fecha: '11/09/2026' },
  { numero: '00122', sucursal: 'Buenavista', vendedor: 'Ana García', total: 150000, fecha: '11/09/2026' },
  { numero: '00121', sucursal: 'La Chinita', vendedor: 'Luis Ramírez', total: 78900, fecha: '10/09/2026' },
]

export const menuItems = [
  { label: 'Inicio', icon: 'Home', page: 'inicio' },
  {
    label: 'Inventario',
    icon: 'Package',
    children: [
      { label: 'Inventario global', page: 'inventario-global' },
      {
        label: 'La Chinita',
        page: 'inventario-la-chinita',
        children: [
          { label: 'Ajustes de inventario', page: 'ajustes-inventario-la-chinita' },
          { label: 'Alerta de Stock', page: 'alerta-stock-la-chinita' },
        ],
      },
      {
        label: 'Buena Vista',
        page: 'inventario-buena-vista',
        children: [
          { label: 'Ajustes de inventario', page: 'ajustes-inventario-buena-vista' },
          { label: 'Alerta de Stock', page: 'alerta-stock-buena-vista' },
        ],
      },
    ],
  },
  {
    label: 'Facturas',
    icon: 'FileText',
    page: 'facturas',
    children: [
      { label: 'Todas las facturas', page: 'todas-las-facturas' },
      { label: 'La Chinita', page: 'facturas-la-chinita' },
      { label: 'Buenavista', page: 'facturas-buena-vista' },
    ],
  },
  {
    label: 'Finanzas',
    icon: 'DollarSign',
    page: 'finanzas',
    children: [
      { label: 'Todos los movimientos', page: 'finanzas' },
      { label: 'Ingresos', page: 'ingresos' },
      { label: 'Egresos', page: 'egresos' },
      { label: 'Resumen', page: 'resumen-financiero' },
    ],
  },
  {
    label: 'Reportes',
    icon: 'BarChart2',
    page: 'reportes',
    children: [
      { label: 'Ventas', page: 'reporte-ventas' },
      { label: 'Inventario', page: 'reporte-inventario' },
      { label: 'Financiero', page: 'reporte-financiero' },
      { label: 'Por sucursal', page: 'reporte-sucursal' },
      { label: 'Empleados', page: 'reporte-empleados' },
      { label: 'Consolidado', page: 'reporte-consolidado' },
    ],
  },
  {
    label: 'Empleados',
    icon: 'Users',
    page: 'empleados',
    children: [
      { label: 'Todos los empleados', page: 'empleados' },
      { label: 'Roles y permisos', page: 'roles-permisos' },
      { label: 'Control de asistencia', page: 'control-asistencia' },
      { label: 'Nómina y salarios', page: 'nomina-salarios' },
      { label: 'Configuración', page: 'configuracion-empleados' },
    ],
  },
]

// --- Datos para la página "Inventario global" ---

export const resumenInventarioGlobal = {
  productosTotales: 1280,
  stockBajo: 18,
  valorInventario: 42850000,
  sucursales: 2,
  variacionValor: '+8%',
}

export const productosInventario = [
  { id: 1, codigo: '000123', nombre: 'Cemento Argos 50kg', categoria: 'Materiales de construcción', laChinita: 30, buenaVista: 24, precio: 28000 },
  { id: 2, codigo: '000124', nombre: 'Pintura blanca', categoria: 'Pinturas', laChinita: 8, buenaVista: 3, precio: 45000 },
  { id: 3, codigo: '000125', nombre: 'Tubo PVC 1/2"', categoria: 'Fontanería', laChinita: 2, buenaVista: 1, precio: 12500 },
  { id: 4, codigo: '000126', nombre: 'Tornillos 3"', categoria: 'Ferretería', laChinita: 50, buenaVista: 32, precio: 1200 },
  { id: 5, codigo: '000127', nombre: 'Brocha 4"', categoria: 'Pinturas', laChinita: 15, buenaVista: 10, precio: 8000 },
  { id: 6, codigo: '000128', nombre: 'Amarre plástico', categoria: 'Electricidad', laChinita: 5, buenaVista: 3, precio: 2000 },
  { id: 7, codigo: '000129', nombre: 'Soldadura', categoria: 'Metales', laChinita: 12, buenaVista: 6, precio: 18000 },
  { id: 8, codigo: '000130', nombre: 'Taladro', categoria: 'Herramientas', laChinita: 0, buenaVista: 0, precio: 320000 },
  { id: 9, codigo: '000131', nombre: 'Extensión eléctrica 10m', categoria: 'Electricidad', laChinita: 10, buenaVista: 8, precio: 25000 },
]

export const motivosAjuste = [
  'Corrección de stock',
  'Entrada de mercancía',
  'Salida de mercancía',
  'Producto dañado',
  'Devolución de cliente',
]

// Historial de ejemplo, mientras no exista el endpoint real por producto.
export const historialMovimientosEjemplo = [
  { fecha: '20/09/2026', tipo: 'Entrada', cantidad: 20, usuario: 'Carlos Pérez' },
  { fecha: '15/09/2026', tipo: 'Ajuste', cantidad: -4, usuario: 'Administrador' },
  { fecha: '05/09/2026', tipo: 'Salida', cantidad: -6, usuario: 'María López' },
]

// Historial de ajustes/movimientos de inventario por sucursal, para la
// página "Ajustes de inventario" de cada sucursal. Cuando exista el
// endpoint real, esto se reemplaza por la respuesta del backend con la
// misma forma (fecha, producto, sucursal, cantidad, motivo, usuario).
export const historialAjustesEjemplo = [
  { fecha: '15/09/2026', producto: 'Cemento Argos 50kg', sucursal: 'La Chinita', cantidad: 10, motivo: 'Compra de mercancía', usuario: 'admin' },
  { fecha: '14/09/2026', producto: 'Pintura blanca', sucursal: 'La Chinita', cantidad: -5, motivo: 'Venta', usuario: 'vendedor' },
  { fecha: '12/09/2026', producto: 'Tubo PVC 1/2"', sucursal: 'La Chinita', cantidad: 20, motivo: 'Compra de mercancía', usuario: 'admin' },
  { fecha: '10/09/2026', producto: 'Tornillos 3"', sucursal: 'La Chinita', cantidad: -8, motivo: 'Ajuste por daño', usuario: 'admin' },
  { fecha: '07/09/2026', producto: 'Brocha 4"', sucursal: 'La Chinita', cantidad: 15, motivo: 'Devolución de cliente', usuario: 'vendedor' },
  { fecha: '05/09/2026', producto: 'Amarre plástico', sucursal: 'La Chinita', cantidad: 4, motivo: 'Compra de mercancía', usuario: 'admin' },
  { fecha: '04/09/2026', producto: 'Soldadura', sucursal: 'La Chinita', cantidad: -2, motivo: 'Cambio por daño', usuario: 'bodega' },
  { fecha: '03/09/2026', producto: 'Taladro', sucursal: 'La Chinita', cantidad: -3, motivo: 'Venta', usuario: 'vendedor' },
  { fecha: '15/09/2026', producto: 'Cemento Argos 50kg', sucursal: 'Buena Vista', cantidad: 6, motivo: 'Compra de mercancía', usuario: 'admin' },
  { fecha: '13/09/2026', producto: 'Pintura blanca', sucursal: 'Buena Vista', cantidad: -2, motivo: 'Venta', usuario: 'vendedor' },
  { fecha: '11/09/2026', producto: 'Extensión eléctrica 10m', sucursal: 'Buena Vista', cantidad: 5, motivo: 'Compra de mercancía', usuario: 'admin' },
  { fecha: '09/09/2026', producto: 'Tornillos 3"', sucursal: 'Buena Vista', cantidad: -4, motivo: 'Ajuste por daño', usuario: 'admin' },
]

// --- Módulo de Finanzas -------------------------------------------------
// Los ingresos se derivan directamente de las facturas pagadas, para no
// duplicar la misma plata en dos lugares distintos del mock. Cuando exista
// el backend real, esto probablemente sea su propio endpoint.
// Función (no solo el array fijo) para poder recalcular los ingresos
// cuando la lista de facturas cambia en vivo (por ejemplo, al anular una
// factura desde Facturas o Ingresos). Las páginas que reciben `facturas`
// como prop desde App.jsx llaman esta función; las que no, usan el array
// `ingresosFinancieros` de abajo, calculado una sola vez al cargar.
export function calcularIngresosFinancieros(facturas) {
  return facturas
    .filter((f) => f.estado === 'Pagada')
    .map((f) => ({
      fecha: f.fecha,
      concepto: 'Venta',
      descripcion: `Factura #${f.numero}`,
      sucursal: f.sucursal,
      metodoPago: f.metodoPago,
      monto: calcularTotalesFactura(f).total,
      facturaNumero: f.numero,
    }))
}

export const ingresosFinancieros = calcularIngresosFinancieros(facturasCompletas)

// Egresos de ejemplo (no hay una factura de compra detrás de cada uno,
// así que estos sí van con su monto fijo).
export const egresosFinancieros = [
  { fecha: '15/09/2026', concepto: 'Compra de mercancía', descripcion: 'Cemento Argos', proveedor: 'Ferretería Rojas', sucursal: 'La Chinita', monto: 1200000 },
  { fecha: '14/09/2026', concepto: 'Servicios públicos', descripcion: 'Energía eléctrica', proveedor: 'Electricaribe', sucursal: 'Buenavista', monto: 450000 },
  { fecha: '13/09/2026', concepto: 'Arriendo', descripcion: 'Local Buenavista', proveedor: 'Inmobiliaria', sucursal: 'Buenavista', monto: 1800000 },
  { fecha: '12/09/2026', concepto: 'Mantenimiento', descripcion: 'Reparación de equipos', proveedor: 'Servitec', sucursal: 'La Chinita', monto: 320000 },
  { fecha: '11/09/2026', concepto: 'Servicios de internet', descripcion: 'Fibra óptica', proveedor: 'Claro', sucursal: 'La Chinita', monto: 120000 },
  { fecha: '10/09/2026', concepto: 'Papelería', descripcion: 'Insumos de oficina', proveedor: 'Papelería del Norte', sucursal: 'Buenavista', monto: 85000 },
  { fecha: '09/09/2026', concepto: 'Compra de mercancía', descripcion: 'Pintura y accesorios', proveedor: 'Distribuidora Andina', sucursal: 'Buenavista', monto: 980000 },
  { fecha: '08/09/2026', concepto: 'Nómina', descripcion: 'Pago quincenal', proveedor: 'Nómina interna', sucursal: 'La Chinita', monto: 3200000 },
  { fecha: '07/09/2026', concepto: 'Servicios públicos', descripcion: 'Agua y alcantarillado', proveedor: 'Triple A', sucursal: 'La Chinita', monto: 180000 },
  { fecha: '06/09/2026', concepto: 'Compra de mercancía', descripcion: 'Herramientas eléctricas', proveedor: 'Ferretería Rojas', sucursal: 'Buenavista', monto: 1500000 },
  { fecha: '05/09/2026', concepto: 'Transporte', descripcion: 'Flete de mercancía', proveedor: 'Transportes Caribe', sucursal: 'La Chinita', monto: 210000 },
  { fecha: '04/09/2026', concepto: 'Mantenimiento', descripcion: 'Aire acondicionado', proveedor: 'Servitec', sucursal: 'Buenavista', monto: 260000 },
]