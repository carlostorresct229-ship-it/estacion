export type UserRole = 'Admin' | 'Cajero' | 'Mesero' | 'Cocinero' | 'Domiciliario';

export interface AuthUser {
  id: string;
  nombre: string;
  rol: UserRole;
  documento?: string;
  telefono?: string;
}

export interface BusinessConfig {
  NOMBRE_NEGOCIO: string;
  NIT: string;
  DIRECCION: string;
  WHATSAPP: string;
  PREFIJO_FACTURA: string;
  CONSECUTIVO_ACTUAL?: number;
  PORCENTAJE_IMPUESTO: number;
  COSTO_DOMICILIO_BASE: number;
}

export interface DashboardKPIs {
  ventas_totales: number;
  ventas_pagadas: number;
  gastos_hoy: number;
  flujo_neto_caja: number;
  total_pedidos: number;
  pedidos_pendientes_cocina: number;
  total_domicilios: number;
  domicilios_entregados: number;
  domicilios_en_camino: number;
  total_trabajadores_activos: number;
  trabajadores_en_turno: number;
  alertas_stock_bajo: number;
}

export interface Insumo {
  id_insumo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  costo_unitario: number;
  proveedor: string;
  ultima_actualizacion?: string;
  estado_stock: 'CRITICO' | 'OK';
}

export interface DashboardData {
  fecha: string;
  kpis: DashboardKPIs;
  desglose_pagos: Record<string, number>;
  insumos_criticos: Insumo[];
}

export interface Producto {
  id_producto: string;
  nombre: string;
  categoria: string;
  precio_venta: number;
  costo_estimado: number;
  tipo_inventario: 'Receta' | 'Directo';
  id_insumo_directo?: string;
  disponible: 'SI' | 'NO';
  descripcion: string;
}

export interface RecetaItem {
  id_receta?: string;
  id_producto: string;
  id_insumo: string;
  cantidad_requerida: number;
}

export type TipoPedido = 'Mesa' | 'Para Llevar' | 'Domicilio';
export type MetodoPago = 'Efectivo' | 'Nequi' | 'Daviplata' | 'Transferencia' | 'Tarjeta';
export type EstadoPago = 'Pagado' | 'Pendiente';
export type EstadoCocina = 'Pendiente' | 'En Preparación' | 'Listo' | 'Entregado' | 'Cancelado';
export type EstadoEntrega = 'Pendiente' | 'En Camino' | 'Entregado' | 'Cancelado';

export interface PedidoItemInput {
  id_producto: string;
  nombre?: string;
  precio_unitario?: number;
  cantidad: number;
  notas: string;
}

export interface CrearPedidoPayload {
  tipo_pedido: TipoPedido;
  mesa_o_direccion: string;
  barrio?: string;
  cliente_nombre: string;
  cliente_telefono: string;
  costo_domicilio?: number;
  descuento?: number;
  metodo_pago: MetodoPago;
  estado_pago: EstadoPago;
  responsable: string;
  id_domiciliario?: string;
  nombre_domiciliario?: string;
  notas: string;
  items: { id_producto: string; cantidad: number; notas: string }[];
}

export interface Factura {
  numero_factura: string;
  id_pedido: string;
  fecha: string;
  hora?: string;
  negocio?: Partial<BusinessConfig>;
  cliente_nombre: string;
  cliente_telefono: string;
  tipo_pedido: TipoPedido;
  mesa_o_direccion: string;
  barrio?: string;
  items: {
    id_producto?: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    notas?: string;
  }[];
  subtotal: number;
  impuesto: number;
  costo_domicilio: number;
  descuento: number;
  total: number;
  metodo_pago: MetodoPago;
  estado_pago: EstadoPago;
  responsable?: string;
  nombre_domiciliario?: string;
  notas?: string;
  whatsapp_url?: string;
}

export interface Pedido {
  id_pedido: string;
  numero_factura: string;
  fecha: string;
  hora: string;
  tipo_pedido: TipoPedido;
  mesa_o_direccion: string;
  barrio?: string;
  cliente_nombre: string;
  cliente_telefono: string;
  subtotal: number;
  impuesto: number;
  costo_domicilio: number;
  descuento: number;
  total: number;
  metodo_pago: MetodoPago;
  estado_pago: EstadoPago;
  estado_cocina: EstadoCocina;
  responsable: string;
  notas: string;
  items: {
    id_producto?: string;
    nombre: string;
    cantidad: number;
    precio_unitario?: number;
    subtotal?: number;
    notas?: string;
  }[];
  whatsapp_url?: string;
}

export interface Domicilio {
  id_domicilio: string;
  id_pedido: string;
  numero_factura?: string;
  fecha: string;
  hora?: string;
  cliente_nombre: string;
  cliente_telefono: string;
  direccion: string;
  barrio: string;
  id_domiciliario: string;
  nombre_domiciliario: string;
  costo_domicilio: number;
  total_pedido: number;
  total_a_cobrar: number;
  metodo_pago: MetodoPago;
  estado_pago: EstadoPago;
  estado_entrega: EstadoEntrega;
  notas?: string;
}

export interface ResumenDomiciliario {
  id_domiciliario: string;
  nombre_domiciliario: string;
  total_domicilios: number;
  entregados: number;
  en_camino?: number;
  total_fletes: number;
  efectivo_a_entregar: number;
}

export interface KardexItem {
  id_movimiento: string;
  fecha: string;
  hora?: string;
  id_insumo: string;
  nombre_insumo: string;
  tipo: 'Entrada Compra' | 'Merma' | 'Ajuste' | 'Consumo Venta' | string;
  cantidad: number;
  stock_anterior?: number;
  stock_nuevo?: number;
  referencia: string;
  responsable: string;
}

export interface Trabajador {
  id_trabajador: string;
  nombre: string;
  documento: string;
  rol: UserRole;
  pin: string;
  telefono: string;
  salario_dia: number;
  estado: 'Activo' | 'Inactivo';
  fecha_ingreso?: string;
}

export interface Turno {
  id_turno: string;
  id_trabajador: string;
  nombre_trabajador: string;
  rol?: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  horas_trabajadas: number | string;
  estado: 'En Turno' | 'Finalizado' | string;
}

export type TipoMovimientoCaja =
  | 'Apertura Caja'
  | 'Gasto Operativo'
  | 'Compra Insumos'
  | 'Pago Nómina'
  | 'Retiro'
  | 'Ingreso Venta';

export interface CajaMovimiento {
  id_movimiento: string;
  fecha: string;
  hora?: string;
  tipo: TipoMovimientoCaja | string;
  metodo_pago: MetodoPago | string;
  monto: number;
  descripcion: string;
  responsable: string;
}

export interface CajaData {
  fecha: string;
  resumen: {
    apertura: number;
    ingresos: number;
    egresos: number;
    saldo_esperado: number;
  };
  movimientos: CajaMovimiento[];
}

export interface Cliente {
  id_cliente?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  barrio: string;
  total_pedidos?: number;
  ultima_compra?: string;
}
