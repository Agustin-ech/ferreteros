// Menú lateral del panel de administración. Los submenús de Inventario y
// Facturas se completan en Sidebar.jsx con las sucursales del backend.
export const menuItems = [
  { label: 'Inicio', icon: 'Home', page: 'inicio' },
  {
    label: 'Inventario',
    icon: 'Package',
    children: [
      { label: 'Inventario global', page: 'inventario-global' },
      { label: 'Kardex de mercancía', page: 'kardex' },
    ],
  },
  {
    label: 'Facturas',
    icon: 'FileText',
    page: 'facturas',
    children: [
      { label: 'Todas las facturas', page: 'todas-las-facturas' },
    ],
  },
  { label: 'Órdenes a proveedores', icon: 'Truck', page: 'pedidos-proveedor' },
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
      { label: 'Facturas', page: 'reporte-facturas' },
      { label: 'Devoluciones', page: 'reporte-devoluciones' },
      { label: 'Ventas por producto', page: 'reporte-productos' },
      { label: 'Inventario', page: 'reporte-inventario' },
      { label: 'Mercancía dañada', page: 'reporte-mercancia-danada' },
      { label: 'Financiero', page: 'reporte-financiero' },
      { label: 'Compras a proveedores', page: 'reporte-compras' },
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
    ],
  },
]
