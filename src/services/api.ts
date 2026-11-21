import {
  AuthUser,
  BusinessConfig,
  CajaData,
  CajaMovimiento,
  Cliente,
  CrearPedidoPayload,
  DashboardData,
  Domicilio,
  EstadoCocina,
  EstadoEntrega,
  EstadoPago,
  Factura,
  Insumo,
  KardexItem,
  MetodoPago,
  Pedido,
  Producto,
  RecetaItem,
  ResumenDomiciliario,
  TipoPedido,
  Trabajador,
  Turno,
  UserRole,
} from '../types/pos';

// Constantes obligatorias de conexión al Backend en Google Apps Script
export const PLACEHOLDER_API_URL = 'PEGA_AQUI_TU_URL_EXEC';
export const DEFAULT_API_URL =
  'https://script.google.com/macros/s/AKfycby24ptoxbgnGAa9Ggj6oZfpzcY-s1P4n9Icd8jOvGsoi3kf76EUX3Yg9UdGizO_uesU/exec';
export const API_KEY = 'ESTACION_BURGUER_2026_KEY';

const STORAGE_API_URL_KEY = 'estacion_burguer_api_url';

export function getStoredApiUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_API_URL;
  const saved = localStorage.getItem(STORAGE_API_URL_KEY);
  if (!saved || saved.trim() === '' || saved.trim() === PLACEHOLDER_API_URL) {
    return DEFAULT_API_URL;
  }
  return saved.trim();
}

export function setStoredApiUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = url.trim();
  localStorage.setItem(STORAGE_API_URL_KEY, clean || DEFAULT_API_URL);
}

export function isApiUrlConfigured(): boolean {
  const url = getStoredApiUrl();
  return Boolean(url && url !== PLACEHOLDER_API_URL && url.startsWith('https://script.google.com/'));
}

export function formatCOP(value: number | string | undefined | null): string {
  const num = Number(value) || 0;
  return '$ ' + Math.round(num).toLocaleString('es-CO');
}

export function getTodayDateString(): string {
  // Usar zona horaria de Colombia (America/Bogota) o fecha local en formato YYYY-MM-DD
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return parts;
  } catch {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

export function formatTimeDisplay(raw: string | undefined): string {
  if (!raw) return '';
  if (raw.includes('T')) {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
  }
  return String(raw).slice(0, 8);
}

export function formatDateDisplay(raw: string | undefined): string {
  if (!raw) return '';
  if (raw.includes('T')) {
    return raw.slice(0, 10);
  }
  return String(raw);
}

export function buildWhatsAppLink(phone: string | number | undefined, message: string): string {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const fullPhone =
    cleanPhone.length === 10 && cleanPhone.startsWith('3') ? `57${cleanPhone}` : cleanPhone;
  const encoded = encodeURIComponent(message);
  return fullPhone
    ? `https://wa.me/${fullPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

/**
 * REGLA OBLIGATORIA ANTI-CORS PARA GOOGLE APPS SCRIPT:
 * method: "POST"
 * headers: { "Content-Type": "text/plain;charset=utf-8" }
 * body: JSON.stringify({ key: API_KEY, action, payload })
 */
export async function callAppsScript<T = any>(
  action: string,
  payload: Record<string, any> = {}
): Promise<T> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error(
      'Sin conexión a internet. Verifica tu red antes de guardar cambios para no desincronizar el inventario.'
    );
  }

  const apiUrl = getStoredApiUrl();
  if (!apiUrl || apiUrl === PLACEHOLDER_API_URL) {
    throw new Error('La URL de Google Apps Script no está configurada. Ábrela en Ajustes.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      key: API_KEY,
      action,
      payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al conectar con Google Apps Script`);
  }

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      'Respuesta inválida del servidor Apps Script. Verifica que el despliegue sea Web App con acceso "Cualquier persona".'
    );
  }

  if (data && data.ok === false) {
    throw new Error(data.error || data.message || `Error en la acción ${action}`);
  }

  return data as T;
}

// ============================================================================
// Normalizadores para compatibilidad total con encabezados de Google Sheets
// ============================================================================

export function normalizeInsumo(raw: any): Insumo {
  const stockActual = Number(raw.stock_actual ?? raw.Stock_Actual ?? 0);
  const stockMinimo = Number(raw.stock_minimo ?? raw.Stock_Minimo ?? 0);
  const estadoRaw = String(raw.estado_stock ?? raw.Estado_Stock ?? '').toUpperCase();
  const estado_stock: 'CRITICO' | 'OK' =
    estadoRaw === 'CRITICO' || stockActual <= stockMinimo ? 'CRITICO' : 'OK';

  return {
    id_insumo: String(raw.id_insumo ?? raw.ID_Insumo ?? ''),
    nombre: String(raw.nombre ?? raw.Nombre ?? ''),
    categoria: String(raw.categoria ?? raw.Categoria ?? 'General'),
    unidad: String(raw.unidad ?? raw.Unidad ?? 'Und'),
    stock_actual: stockActual,
    stock_minimo: stockMinimo,
    costo_unitario: Number(raw.costo_unitario ?? raw.Costo_Unitario ?? 0),
    proveedor: String(raw.proveedor ?? raw.Proveedor ?? ''),
    ultima_actualizacion: String(raw.ultima_actualizacion ?? raw.Ultima_Actualizacion ?? ''),
    estado_stock,
  };
}

export function normalizeProducto(raw: any): Producto {
  const disp = String(raw.disponible ?? raw.Disponible ?? 'SI').toUpperCase();
  const tipoInv = String(raw.tipo_inventario ?? raw.Tipo_Inventario ?? 'Receta');
  return {
    id_producto: String(raw.id_producto ?? raw.ID_Producto ?? ''),
    nombre: String(raw.nombre ?? raw.Nombre ?? ''),
    categoria: String(raw.categoria ?? raw.Categoria ?? 'General'),
    precio_venta: Number(raw.precio_venta ?? raw.Precio_Venta ?? 0),
    costo_estimado: Number(raw.costo_estimado ?? raw.Costo_Estimado ?? 0),
    tipo_inventario: tipoInv === 'Directo' ? 'Directo' : 'Receta',
    id_insumo_directo: String(raw.id_insumo_directo ?? raw.ID_Insumo_Directo ?? ''),
    disponible: disp === 'NO' ? 'NO' : 'SI',
    descripcion: String(raw.descripcion ?? raw.Descripcion ?? ''),
  };
}

export function normalizeReceta(raw: any): RecetaItem {
  return {
    id_receta: String(raw.id_receta ?? raw.ID_Receta ?? ''),
    id_producto: String(raw.id_producto ?? raw.ID_Producto ?? ''),
    id_insumo: String(raw.id_insumo ?? raw.ID_Insumo ?? ''),
    cantidad_requerida: Number(raw.cantidad_requerida ?? raw.Cantidad_Requerida ?? 1),
  };
}

function parsePedidoItems(rawItems: any): Pedido['items'] {
  if (!rawItems) return [];
  let parsed = rawItems;
  if (typeof rawItems === 'string') {
    try {
      parsed = JSON.parse(rawItems);
    } catch {
      // Si viene como texto plano "2x Burguer Clásica (Sin cebolla)"
      return rawItems
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => ({
          nombre: line,
          cantidad: 1,
        }));
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((it: any) => ({
    id_producto: String(it.id_producto ?? it.ID_Producto ?? ''),
    nombre: String(it.nombre ?? it.Nombre ?? it.producto ?? it.id_producto ?? 'Producto'),
    cantidad: Number(it.cantidad ?? it.Cantidad ?? 1),
    precio_unitario: Number(it.precio_unitario ?? it.Precio_Unitario ?? it.precio ?? 0),
    subtotal: Number(
      it.subtotal ??
        it.Subtotal ??
        Number(it.cantidad ?? 1) * Number(it.precio_unitario ?? it.precio ?? 0)
    ),
    notas: String(it.notas ?? it.Notas ?? ''),
  }));
}

export function normalizePedido(raw: any): Pedido {
  const items = parsePedidoItems(
    raw.items ?? raw.Items ?? raw.Detalle_Items ?? raw.detalle_items ?? raw.productos
  );
  const id_pedido = String(raw.id_pedido ?? raw.ID_Pedido ?? '');
  const numero_factura = String(
    raw.numero_factura ?? raw.Numero_Factura ?? raw.Factura ?? id_pedido
  );
  return {
    id_pedido,
    numero_factura,
    fecha: formatDateDisplay(raw.fecha ?? raw.Fecha ?? ''),
    hora: formatTimeDisplay(raw.hora ?? raw.Hora ?? raw.fecha ?? raw.Fecha ?? ''),
    tipo_pedido: (raw.tipo_pedido ?? raw.Tipo_Pedido ?? 'Mesa') as TipoPedido,
    mesa_o_direccion: String(
      raw.mesa_o_direccion ?? raw.Mesa_O_Direccion ?? raw.Mesa_Direccion ?? raw.direccion ?? ''
    ),
    barrio: String(raw.barrio ?? raw.Barrio ?? ''),
    cliente_nombre: String(raw.cliente_nombre ?? raw.Cliente_Nombre ?? 'Cliente Mostrador'),
    cliente_telefono: String(raw.cliente_telefono ?? raw.Cliente_Telefono ?? ''),
    subtotal: Number(raw.subtotal ?? raw.Subtotal ?? 0),
    impuesto: Number(raw.impuesto ?? raw.Impuesto ?? 0),
    costo_domicilio: Number(raw.costo_domicilio ?? raw.Costo_Domicilio ?? 0),
    descuento: Number(raw.descuento ?? raw.Descuento ?? 0),
    total: Number(raw.total ?? raw.Total ?? 0),
    metodo_pago: (raw.metodo_pago ?? raw.Metodo_Pago ?? 'Efectivo') as MetodoPago,
    estado_pago: (raw.estado_pago ?? raw.Estado_Pago ?? 'Pendiente') as EstadoPago,
    estado_cocina: (raw.estado_cocina ?? raw.Estado_Cocina ?? 'Pendiente') as EstadoCocina,
    responsable: String(raw.responsable ?? raw.Responsable ?? ''),
    notas: String(raw.notas ?? raw.Notas ?? ''),
    items,
    whatsapp_url: raw.whatsapp_url ?? raw.Whatsapp_Url,
  };
}

export function normalizeDomicilio(raw: any): Domicilio {
  const totalPedido = Number(raw.total_pedido ?? raw.Total_Pedido ?? raw.total ?? raw.Total ?? 0);
  const costoDom = Number(raw.costo_domicilio ?? raw.Costo_Domicilio ?? 0);
  const totalCobrar = Number(
    raw.total_a_cobrar ?? raw.Total_A_Cobrar ?? raw.valor_a_cobrar ?? (totalPedido || costoDom)
  );
  return {
    id_domicilio: String(raw.id_domicilio ?? raw.ID_Domicilio ?? ''),
    id_pedido: String(raw.id_pedido ?? raw.ID_Pedido ?? ''),
    numero_factura: String(
      raw.numero_factura ?? raw.Numero_Factura ?? raw.id_pedido ?? raw.ID_Pedido ?? ''
    ),
    fecha: formatDateDisplay(raw.fecha ?? raw.Fecha ?? ''),
    hora: formatTimeDisplay(raw.hora ?? raw.Hora ?? ''),
    cliente_nombre: String(raw.cliente_nombre ?? raw.Cliente_Nombre ?? 'Cliente Domicilio'),
    cliente_telefono: String(raw.cliente_telefono ?? raw.Cliente_Telefono ?? ''),
    direccion: String(
      raw.direccion ?? raw.Direccion ?? raw.mesa_o_direccion ?? raw.Mesa_O_Direccion ?? ''
    ),
    barrio: String(raw.barrio ?? raw.Barrio ?? ''),
    id_domiciliario: String(raw.id_domiciliario ?? raw.ID_Domiciliario ?? ''),
    nombre_domiciliario: String(
      raw.nombre_domiciliario ?? raw.Nombre_Domiciliario ?? 'Sin asignar'
    ),
    costo_domicilio: costoDom,
    total_pedido: totalPedido,
    total_a_cobrar: totalCobrar,
    metodo_pago: (raw.metodo_pago ?? raw.Metodo_Pago ?? 'Efectivo') as MetodoPago,
    estado_pago: (raw.estado_pago ?? raw.Estado_Pago ?? 'Pendiente') as EstadoPago,
    estado_entrega: (raw.estado_entrega ??
      raw.Estado_Entrega ??
      raw.estado ??
      raw.Estado ??
      'Pendiente') as EstadoEntrega,
    notas: String(raw.notas ?? raw.Notas ?? ''),
  };
}

export function normalizeTrabajador(raw: any): Trabajador {
  return {
    id_trabajador: String(raw.id_trabajador ?? raw.ID_Trabajador ?? ''),
    nombre: String(raw.nombre ?? raw.Nombre ?? ''),
    documento: String(raw.documento ?? raw.Documento ?? ''),
    rol: (raw.rol ?? raw.Rol ?? 'Cajero') as UserRole,
    pin: String(raw.pin ?? raw.PIN ?? ''),
    telefono: String(raw.telefono ?? raw.Telefono ?? ''),
    salario_dia: Number(raw.salario_dia ?? raw.Salario_Dia ?? 0),
    estado: String(raw.estado ?? raw.Estado ?? 'Activo') === 'Inactivo' ? 'Inactivo' : 'Activo',
    fecha_ingreso: formatDateDisplay(raw.fecha_ingreso ?? raw.Fecha_Ingreso ?? ''),
  };
}

export function normalizeTurno(raw: any): Turno {
  return {
    id_turno: String(raw.id_turno ?? raw.ID_Turno ?? ''),
    id_trabajador: String(raw.id_trabajador ?? raw.ID_Trabajador ?? ''),
    nombre_trabajador: String(
      raw.nombre_trabajador ?? raw.Nombre_Trabajador ?? raw.nombre ?? raw.Nombre ?? ''
    ),
    rol: String(raw.rol ?? raw.Rol ?? ''),
    fecha: formatDateDisplay(raw.fecha ?? raw.Fecha ?? ''),
    hora_entrada: formatTimeDisplay(raw.hora_entrada ?? raw.Hora_Entrada ?? ''),
    hora_salida: formatTimeDisplay(raw.hora_salida ?? raw.Hora_Salida ?? ''),
    horas_trabajadas: raw.horas_trabajadas ?? raw.Horas_Trabajadas ?? 0,
    estado: String(raw.estado ?? raw.Estado ?? (raw.hora_salida || raw.Hora_Salida ? 'Finalizado' : 'En Turno')),
  };
}

export function normalizeKardex(raw: any): KardexItem {
  return {
    id_movimiento: String(raw.id_movimiento ?? raw.ID_Movimiento ?? raw.id ?? ''),
    fecha: formatDateDisplay(raw.fecha ?? raw.Fecha ?? ''),
    hora: formatTimeDisplay(raw.hora ?? raw.Hora ?? raw.fecha ?? raw.Fecha ?? ''),
    id_insumo: String(raw.id_insumo ?? raw.ID_Insumo ?? ''),
    nombre_insumo: String(raw.nombre_insumo ?? raw.Nombre_Insumo ?? raw.insumo ?? ''),
    tipo: String(raw.tipo ?? raw.Tipo ?? raw.Tipo_Movimiento ?? ''),
    cantidad: Number(raw.cantidad ?? raw.Cantidad ?? 0),
    stock_anterior:
      raw.stock_anterior !== undefined || raw.Stock_Anterior !== undefined
        ? Number(raw.stock_anterior ?? raw.Stock_Anterior ?? 0)
        : undefined,
    stock_nuevo:
      raw.stock_nuevo !== undefined || raw.Stock_Nuevo !== undefined
        ? Number(raw.stock_nuevo ?? raw.Stock_Nuevo ?? 0)
        : undefined,
    referencia: String(raw.referencia ?? raw.Referencia ?? ''),
    responsable: String(raw.responsable ?? raw.Responsable ?? ''),
  };
}

export function normalizeCajaMovimiento(raw: any): CajaMovimiento {
  return {
    id_movimiento: String(raw.id_movimiento ?? raw.ID_Movimiento ?? ''),
    fecha: formatDateDisplay(raw.fecha ?? raw.Fecha ?? ''),
    hora: formatTimeDisplay(raw.hora ?? raw.Hora ?? raw.fecha ?? raw.Fecha ?? ''),
    tipo: String(raw.tipo ?? raw.Tipo ?? ''),
    metodo_pago: String(raw.metodo_pago ?? raw.Metodo_Pago ?? 'Efectivo'),
    monto: Number(raw.monto ?? raw.Monto ?? 0),
    descripcion: String(raw.descripcion ?? raw.Descripcion ?? ''),
    responsable: String(raw.responsable ?? raw.Responsable ?? ''),
  };
}

export function normalizeCliente(raw: any): Cliente {
  return {
    id_cliente: String(raw.id_cliente ?? raw.ID_Cliente ?? ''),
    nombre: String(raw.nombre ?? raw.Nombre ?? ''),
    telefono: String(raw.telefono ?? raw.Telefono ?? ''),
    direccion: String(raw.direccion ?? raw.Direccion ?? ''),
    barrio: String(raw.barrio ?? raw.Barrio ?? ''),
    total_pedidos: Number(raw.total_pedidos ?? raw.Total_Pedidos ?? 0),
    ultima_compra: formatDateDisplay(raw.ultima_compra ?? raw.Ultima_Compra ?? ''),
  };
}

export function normalizeFactura(raw: any, fallbackPedido?: Partial<Pedido>): Factura {
  const f = raw?.factura ?? raw?.data ?? raw ?? {};
  const items = parsePedidoItems(f.items ?? f.Items ?? fallbackPedido?.items ?? []);
  const subtotal = Number(
    f.subtotal ??
      f.Subtotal ??
      fallbackPedido?.subtotal ??
      items.reduce((acc, item) => acc + (item.subtotal || (item.precio_unitario || 0) * item.cantidad), 0)
  );
  const impuesto = Number(f.impuesto ?? f.Impuesto ?? fallbackPedido?.impuesto ?? 0);
  const costo_domicilio = Number(
    f.costo_domicilio ?? f.Costo_Domicilio ?? fallbackPedido?.costo_domicilio ?? 0
  );
  const descuento = Number(f.descuento ?? f.Descuento ?? fallbackPedido?.descuento ?? 0);
  const total = Number(
    f.total ??
      f.Total ??
      fallbackPedido?.total ??
      Math.max(0, subtotal + impuesto + costo_domicilio - descuento)
  );
  const id_pedido = String(f.id_pedido ?? f.ID_Pedido ?? fallbackPedido?.id_pedido ?? '');
  const numero_factura = String(
    f.numero_factura ?? f.Numero_Factura ?? fallbackPedido?.numero_factura ?? id_pedido
  );
  const cliente_nombre = String(
    f.cliente_nombre ?? f.Cliente_Nombre ?? fallbackPedido?.cliente_nombre ?? 'Cliente Mostrador'
  );
  const cliente_telefono = String(
    f.cliente_telefono ?? f.Cliente_Telefono ?? fallbackPedido?.cliente_telefono ?? ''
  );
  const tipo_pedido = (f.tipo_pedido ??
    f.Tipo_Pedido ??
    fallbackPedido?.tipo_pedido ??
    'Mesa') as TipoPedido;
  const mesa_o_direccion = String(
    f.mesa_o_direccion ?? f.Mesa_O_Direccion ?? fallbackPedido?.mesa_o_direccion ?? ''
  );
  const barrio = String(f.barrio ?? f.Barrio ?? fallbackPedido?.barrio ?? '');
  const metodo_pago = (f.metodo_pago ??
    f.Metodo_Pago ??
    fallbackPedido?.metodo_pago ??
    'Efectivo') as MetodoPago;
  const estado_pago = (f.estado_pago ??
    f.Estado_Pago ??
    fallbackPedido?.estado_pago ??
    'Pagado') as EstadoPago;

  const defaultWaText = [
    `*ESTACIÓN BURGUER*`,
    `Factura: *${numero_factura}*`,
    `Cliente: ${cliente_nombre}`,
    `Tipo: ${tipo_pedido} ${mesa_o_direccion ? `(${mesa_o_direccion})` : ''}`,
    `------------------------`,
    ...items.map(
      (i) =>
        `• ${i.cantidad}x ${i.nombre} ${i.subtotal ? formatCOP(i.subtotal) : ''}${
          i.notas ? ` _(${i.notas})_` : ''
        }`
    ),
    `------------------------`,
    costo_domicilio > 0 ? `Domicilio: ${formatCOP(costo_domicilio)}` : '',
    descuento > 0 ? `Descuento: -${formatCOP(descuento)}` : '',
    `*TOTAL: ${formatCOP(total)}*`,
    `Pago: ${metodo_pago} (${estado_pago})`,
    `¡Gracias por tu compra!`,
  ]
    .filter(Boolean)
    .join('\n');

  const whatsapp_url =
    f.whatsapp_url ||
    f.Whatsapp_Url ||
    fallbackPedido?.whatsapp_url ||
    buildWhatsAppLink(cliente_telefono, defaultWaText);

  return {
    numero_factura,
    id_pedido,
    fecha: formatDateDisplay(f.fecha ?? f.Fecha ?? fallbackPedido?.fecha ?? getTodayDateString()),
    hora: formatTimeDisplay(f.hora ?? f.Hora ?? fallbackPedido?.hora ?? new Date().toISOString()),
    negocio: f.negocio,
    cliente_nombre,
    cliente_telefono,
    tipo_pedido,
    mesa_o_direccion,
    barrio,
    items: items.map((it) => ({
      id_producto: it.id_producto,
      nombre: it.nombre,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario || 0,
      subtotal: it.subtotal || (it.precio_unitario || 0) * it.cantidad,
      notas: it.notas,
    })),
    subtotal,
    impuesto,
    costo_domicilio,
    descuento,
    total,
    metodo_pago,
    estado_pago,
    responsable: String(f.responsable ?? f.Responsable ?? fallbackPedido?.responsable ?? ''),
    nombre_domiciliario: String(f.nombre_domiciliario ?? f.Nombre_Domiciliario ?? ''),
    notas: String(f.notas ?? f.Notas ?? fallbackPedido?.notas ?? ''),
    whatsapp_url,
  };
}

// ============================================================================
// Servicios Exactos del Backend (Section 2 Specification)
// ============================================================================

export const api = {
  // 1. Autenticación y Configuración
  async login(pin: string): Promise<{ ok: boolean; usuario: AuthUser }> {
    const res = await callAppsScript('login', { pin });
    const u = res.usuario || res.data || {};
    return {
      ok: true,
      usuario: {
        id: String(u.id ?? u.ID_Trabajador ?? u.id_trabajador ?? 'TRAB-01'),
        nombre: String(u.nombre ?? u.Nombre ?? 'Usuario'),
        rol: (u.rol ?? u.Rol ?? 'Cajero') as UserRole,
      },
    };
  },

  async getConfig(): Promise<BusinessConfig> {
    const res = await callAppsScript('getConfig', {});
    const c = res.config || res.data || res || {};
    return {
      NOMBRE_NEGOCIO: String(c.NOMBRE_NEGOCIO ?? 'Estación Burguer'),
      NIT: String(c.NIT ?? '900.000.000-1'),
      DIRECCION: String(c.DIRECCION ?? 'Calle Principal #10-20'),
      WHATSAPP: String(c.WHATSAPP ?? '573000000000'),
      PREFIJO_FACTURA: String(c.PREFIJO_FACTURA ?? 'EB'),
      CONSECUTIVO_ACTUAL: Number(c.CONSECUTIVO_ACTUAL ?? 0),
      PORCENTAJE_IMPUESTO: Number(c.PORCENTAJE_IMPUESTO ?? 0),
      COSTO_DOMICILIO_BASE: Number(c.COSTO_DOMICILIO_BASE ?? 4000),
    };
  },

  async updateConfig(payload: Omit<BusinessConfig, 'CONSECUTIVO_ACTUAL'>) {
    return callAppsScript('updateConfig', payload);
  },

  // 2. Dashboard Ejecutivo
  async getDashboard(fecha: string): Promise<DashboardData> {
    const res = await callAppsScript('getDashboard', { fecha });
    const k = res.kpis || {};
    const criticos = Array.isArray(res.insumos_criticos)
      ? res.insumos_criticos.map(normalizeInsumo)
      : [];
    return {
      fecha: String(res.fecha ?? fecha),
      kpis: {
        ventas_totales: Number(k.ventas_totales ?? 0),
        ventas_pagadas: Number(k.ventas_pagadas ?? 0),
        gastos_hoy: Number(k.gastos_hoy ?? 0),
        flujo_neto_caja: Number(k.flujo_neto_caja ?? 0),
        total_pedidos: Number(k.total_pedidos ?? 0),
        pedidos_pendientes_cocina: Number(k.pedidos_pendientes_cocina ?? 0),
        total_domicilios: Number(k.total_domicilios ?? 0),
        domicilios_entregados: Number(k.domicilios_entregados ?? 0),
        domicilios_en_camino: Number(k.domicilios_en_camino ?? 0),
        total_trabajadores_activos: Number(k.total_trabajadores_activos ?? 0),
        trabajadores_en_turno: Number(k.trabajadores_en_turno ?? 0),
        alertas_stock_bajo: Number(k.alertas_stock_bajo ?? criticos.length),
      },
      desglose_pagos: res.desglose_pagos || {},
      insumos_criticos: criticos,
    };
  },

  // 3. Pedidos, POS y Cocina (KDS)
  async getMenu(): Promise<Producto[]> {
    const res = await callAppsScript('getMenu', {});
    const list = Array.isArray(res.data) ? res.data : Array.isArray(res.menu) ? res.menu : [];
    return list.map(normalizeProducto);
  },

  async guardarProducto(payload: {
    id_producto?: string;
    nombre: string;
    categoria: string;
    precio_venta: number;
    costo_estimado: number;
    tipo_inventario: 'Receta' | 'Directo';
    id_insumo_directo?: string;
    disponible: 'SI' | 'NO';
    descripcion: string;
  }) {
    return callAppsScript('guardarProducto', payload);
  },

  async getRecetas(): Promise<RecetaItem[]> {
    const res = await callAppsScript('getRecetas', {});
    const list = Array.isArray(res.data) ? res.data : Array.isArray(res.recetas) ? res.recetas : [];
    return list.map(normalizeReceta);
  },

  async guardarReceta(payload: {
    id_producto: string;
    id_insumo: string;
    cantidad_requerida: number;
  }) {
    return callAppsScript('guardarReceta', payload);
  },

  async crearPedido(payload: CrearPedidoPayload): Promise<{
    ok: boolean;
    id_pedido: string;
    id_domicilio?: string;
    factura: Factura;
  }> {
    const res = await callAppsScript('crearPedido', payload);
    const id_pedido = String(res.id_pedido ?? res.ID_Pedido ?? res.factura?.id_pedido ?? '');
    const factura = normalizeFactura(res.factura ?? res, {
      id_pedido,
      tipo_pedido: payload.tipo_pedido,
      mesa_o_direccion: payload.mesa_o_direccion,
      barrio: payload.barrio,
      cliente_nombre: payload.cliente_nombre,
      cliente_telefono: payload.cliente_telefono,
      costo_domicilio: payload.costo_domicilio || 0,
      descuento: payload.descuento || 0,
      metodo_pago: payload.metodo_pago,
      estado_pago: payload.estado_pago,
      responsable: payload.responsable,
      notas: payload.notas,
    });
    return {
      ok: true,
      id_pedido,
      id_domicilio: res.id_domicilio ? String(res.id_domicilio) : undefined,
      factura,
    };
  },

  async getPedidos(filters: { fecha?: string; estado_cocina?: string } = {}): Promise<Pedido[]> {
    const res = await callAppsScript('getPedidos', filters);
    const list = Array.isArray(res.data) ? res.data : Array.isArray(res.pedidos) ? res.pedidos : [];
    return list.map(normalizePedido);
  },

  async actualizarPedido(payload: {
    id_pedido: string;
    estado_cocina?: EstadoCocina;
    estado_pago?: EstadoPago;
    metodo_pago?: MetodoPago;
    responsable?: string;
  }) {
    return callAppsScript('actualizarPedido', payload);
  },

  async getFactura(id_pedido: string, fallbackPedido?: Partial<Pedido>): Promise<Factura> {
    const res = await callAppsScript('getFactura', { id_pedido });
    return normalizeFactura(res, fallbackPedido);
  },

  // 4. Domicilios
  async getDomicilios(filters: { fecha?: string; estado?: string } = {}): Promise<Domicilio[]> {
    const res = await callAppsScript('getDomicilios', filters);
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.domicilios)
      ? res.domicilios
      : [];
    return list.map(normalizeDomicilio);
  },

  async actualizarDomicilio(payload: {
    id_domicilio: string;
    id_domiciliario?: string;
    nombre_domiciliario?: string;
    estado_entrega?: EstadoEntrega;
    metodo_pago?: MetodoPago;
  }) {
    return callAppsScript('actualizarDomicilio', payload);
  },

  async resumenDomiciliarios(fecha: string): Promise<ResumenDomiciliario[]> {
    const res = await callAppsScript('resumenDomiciliarios', { fecha });
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.resumen)
      ? res.resumen
      : [];
    return list.map((r: any) => ({
      id_domiciliario: String(r.id_domiciliario ?? r.ID_Domiciliario ?? ''),
      nombre_domiciliario: String(
        r.nombre_domiciliario ?? r.Nombre_Domiciliario ?? r.nombre ?? 'Repartidor'
      ),
      total_domicilios: Number(
        r.total_domicilios ?? r.cantidad_domicilios ?? r.entregas ?? r.total_entregas ?? 0
      ),
      entregados: Number(r.entregados ?? r.total_domicilios ?? r.entregas ?? 0),
      en_camino: Number(r.en_camino ?? 0),
      total_fletes: Number(r.total_fletes ?? r.fletes ?? 0),
      efectivo_a_entregar: Number(
        r.efectivo_a_entregar ?? r.efectivo_caja ?? r.total_efectivo ?? 0
      ),
    }));
  },

  // 5. Inventario y Kardex
  async getInventario(): Promise<Insumo[]> {
    const res = await callAppsScript('getInventario', {});
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.inventario)
      ? res.inventario
      : [];
    return list.map(normalizeInsumo);
  },

  async guardarInsumo(payload: {
    id_insumo?: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stock_actual?: number;
    stock_minimo: number;
    costo_unitario: number;
    proveedor: string;
  }) {
    return callAppsScript('guardarInsumo', payload);
  },

  async registrarMovimientoInventario(payload: {
    id_insumo: string;
    tipo: 'Entrada Compra' | 'Merma' | 'Ajuste';
    cantidad: number;
    referencia: string;
    responsable: string;
  }) {
    return callAppsScript('registrarMovimientoInventario', payload);
  },

  async getKardex(): Promise<KardexItem[]> {
    const res = await callAppsScript('getKardex', {});
    const list = Array.isArray(res.data) ? res.data : Array.isArray(res.kardex) ? res.kardex : [];
    return list.map(normalizeKardex);
  },

  // 6. Trabajadores y Turnos
  async getTrabajadores(): Promise<{
    total_activos: number;
    por_rol: Record<string, number>;
    data: Trabajador[];
  }> {
    const res = await callAppsScript('getTrabajadores', {});
    const list = Array.isArray(res.data)
      ? res.data.map(normalizeTrabajador)
      : [];
    return {
      total_activos: Number(
        res.total_activos ?? list.filter((t: Trabajador) => t.estado === 'Activo').length
      ),
      por_rol: res.por_rol || {},
      data: list,
    };
  },

  async guardarTrabajador(payload: {
    id_trabajador?: string;
    nombre: string;
    documento: string;
    rol: UserRole;
    pin: string;
    telefono: string;
    salario_dia: number;
    estado: 'Activo' | 'Inactivo';
  }) {
    return callAppsScript('guardarTrabajador', payload);
  },

  async registrarTurno(id_trabajador: string) {
    return callAppsScript('registrarTurno', { id_trabajador });
  },

  async getTurnos(): Promise<Turno[]> {
    const res = await callAppsScript('getTurnos', {});
    const list = Array.isArray(res.data) ? res.data : Array.isArray(res.turnos) ? res.turnos : [];
    return list.map(normalizeTurno);
  },

  // 7. Caja, Facturación y Clientes
  async getCaja(fecha: string): Promise<CajaData> {
    const res = await callAppsScript('getCaja', { fecha });
    const r = res.resumen || {};
    const movs = Array.isArray(res.movimientos)
      ? res.movimientos.map(normalizeCajaMovimiento)
      : Array.isArray(res.data)
      ? res.data.map(normalizeCajaMovimiento)
      : [];
    return {
      fecha: String(res.fecha ?? fecha),
      resumen: {
        apertura: Number(r.apertura ?? 0),
        ingresos: Number(r.ingresos ?? 0),
        egresos: Number(r.egresos ?? 0),
        saldo_esperado: Number(r.saldo_esperado ?? 0),
      },
      movimientos: movs,
    };
  },

  async registrarMovimientoCaja(payload: {
    tipo: 'Apertura Caja' | 'Gasto Operativo' | 'Compra Insumos' | 'Pago Nómina' | 'Retiro';
    metodo_pago: string;
    monto: number;
    descripcion: string;
    responsable: string;
  }) {
    return callAppsScript('registrarMovimientoCaja', payload);
  },

  async getClientes(): Promise<Cliente[]> {
    const res = await callAppsScript('getClientes', {});
    const list = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.clientes)
      ? res.clientes
      : [];
    return list.map(normalizeCliente);
  },
};
