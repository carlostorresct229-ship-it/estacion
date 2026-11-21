import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Utensils,
  ShoppingBag,
  Bike,
  Phone,
  User,
  MapPin,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  X,
} from 'lucide-react';
import {
  AuthUser,
  BusinessConfig,
  Cliente,
  EstadoPago,
  Factura,
  MetodoPago,
  Producto,
  TipoPedido,
  Trabajador,
} from '../types/pos';
import { api, formatCOP } from '../services/api';

interface PosViewProps {
  currentUser: AuthUser;
  config: BusinessConfig;
  onOrderCreated: (factura: Factura) => void;
  onNotify: (type: 'ok' | 'err', msg: string) => void;
}

interface CartItem {
  producto: Producto;
  cantidad: number;
  notas: string;
}

const QUICK_NOTES = ['Sin cebolla', 'Sin salsas', 'Término medio', 'Bien asada', 'Extra salsa'];
const METODOS_PAGO: MetodoPago[] = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta'];

export const PosView: React.FC<PosViewProps> = ({
  currentUser,
  config,
  onOrderCreated,
  onNotify,
}) => {
  const [menu, setMenu] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [domiciliarios, setDomiciliarios] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart & Order Form
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [tipoPedido, setTipoPedido] = useState<TipoPedido>('Mesa');
  const [mesaODireccion, setMesaODireccion] = useState<string>('Mesa 1');
  const [barrio, setBarrio] = useState<string>('');
  const [clienteTelefono, setClienteTelefono] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState<string>('Cliente Mostrador');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const [costoDomicilio, setCostoDomicilio] = useState<number>(config.COSTO_DOMICILIO_BASE || 4000);
  const [descuento, setDescuento] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo');
  const [estadoPago, setEstadoPago] = useState<EstadoPago>('Pagado');
  const [selectedDomiciliarioId, setSelectedDomiciliarioId] = useState<string>('');
  const [notasPedido, setNotasPedido] = useState<string>('');

  const loadPosData = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, clientesRes, trabRes] = await Promise.all([
        api.getMenu(),
        api.getClientes().catch(() => []),
        api.getTrabajadores().catch(() => ({ total_activos: 0, por_rol: {}, data: [] })),
      ]);
      setMenu(menuRes);
      setClientes(clientesRes);
      setDomiciliarios(
        trabRes.data.filter((t) => t.rol === 'Domiciliario' && t.estado === 'Activo')
      );
    } catch (err: any) {
      onNotify('err', err?.message || 'Error cargando menú del POS');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadPosData();
  }, [loadPosData]);

  useEffect(() => {
    if (tipoPedido === 'Domicilio') {
      setCostoDomicilio(config.COSTO_DOMICILIO_BASE || 4000);
      if (mesaODireccion.startsWith('Mesa') || mesaODireccion === 'Para Llevar') {
        setMesaODireccion('');
      }
    } else if (tipoPedido === 'Mesa') {
      setCostoDomicilio(0);
      if (!mesaODireccion) setMesaODireccion('Mesa 1');
    } else {
      setCostoDomicilio(0);
      setMesaODireccion('Mostrador Para Llevar');
    }
  }, [tipoPedido, config.COSTO_DOMICILIO_BASE]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menu.map((p) => p.categoria).filter(Boolean)));
    return ['Todos', ...cats];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    return menu.filter((p) => {
      if (p.disponible === 'NO') return false;
      const matchesCat = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menu, selectedCategory, searchQuery]);

  // Customer autocomplete by phone or name
  const matchingClients = useMemo(() => {
    const q = clienteTelefono.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return clientes
      .filter(
        (c) =>
          c.telefono.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [clientes, clienteTelefono]);

  const handleSelectCliente = (c: Cliente) => {
    setClienteTelefono(c.telefono);
    setClienteNombre(c.nombre);
    if (tipoPedido === 'Domicilio' && c.direccion) {
      setMesaODireccion(c.direccion);
    }
    if (c.barrio) {
      setBarrio(c.barrio);
    }
    setShowClientSuggestions(false);
  };

  const addToCart = (producto: Producto) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.producto.id_producto === producto.id_producto);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          cantidad: updated[existingIndex].cantidad + 1,
        };
        return updated;
      }
      return [...prev, { producto, cantidad: 1, notas: '' }];
    });
  };

  const updateQuantity = (id_producto: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.producto.id_producto === id_producto
            ? { ...item, cantidad: item.cantidad + delta }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  const updateItemNote = (id_producto: string, notas: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.producto.id_producto === id_producto ? { ...item, notas } : item
      )
    );
  };

  const appendQuickNote = (id_producto: string, chip: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.producto.id_producto !== id_producto) return item;
        const current = item.notas ? item.notas.split(',').map((s) => s.trim()) : [];
        if (current.includes(chip)) return item;
        return { ...item, notas: [...current, chip].filter(Boolean).join(', ') };
      })
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.producto.precio_venta * item.cantidad, 0),
    [cart]
  );

  const impuesto = useMemo(() => {
    const pct = Number(config.PORCENTAJE_IMPUESTO) || 0;
    return Math.round((subtotal * pct) / 100);
  }, [subtotal, config.PORCENTAJE_IMPUESTO]);

  const effectiveDomicilio = tipoPedido === 'Domicilio' ? Number(costoDomicilio) || 0 : 0;
  const total = Math.max(0, subtotal + impuesto + effectiveDomicilio - (Number(descuento) || 0));
  const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      onNotify('err', 'Agrega al menos un producto al pedido');
      return;
    }
    if (tipoPedido === 'Domicilio' && !mesaODireccion.trim()) {
      onNotify('err', 'Ingresa la dirección de entrega para el domicilio');
      return;
    }

    setSubmitting(true);
    try {
      const domObj = domiciliarios.find((d) => d.id_trabajador === selectedDomiciliarioId);
      const res = await api.crearPedido({
        tipo_pedido: tipoPedido,
        mesa_o_direccion:
          mesaODireccion.trim() || (tipoPedido === 'Mesa' ? 'Mesa 1' : 'Para Llevar'),
        barrio: barrio.trim() || undefined,
        cliente_nombre: clienteNombre.trim() || 'Cliente Mostrador',
        cliente_telefono: clienteTelefono.trim(),
        costo_domicilio: effectiveDomicilio,
        descuento: Number(descuento) || 0,
        metodo_pago: metodoPago,
        estado_pago: estadoPago,
        responsable: currentUser.nombre,
        id_domiciliario: domObj?.id_trabajador,
        nombre_domiciliario: domObj?.nombre,
        notas: notasPedido.trim(),
        items: cart.map((item) => ({
          id_producto: item.producto.id_producto,
          cantidad: item.cantidad,
          notas: item.notas.trim(),
        })),
      });

      // Ensure ticket has full item names & prices
      const enrichedFactura: Factura = {
        ...res.factura,
        items:
          res.factura.items && res.factura.items.length > 0
            ? res.factura.items.map((fi, idx) => ({
                ...fi,
                nombre: fi.nombre || cart[idx]?.producto.nombre || 'Producto',
                precio_unitario: fi.precio_unitario || cart[idx]?.producto.precio_venta || 0,
                subtotal:
                  fi.subtotal ||
                  (fi.precio_unitario || cart[idx]?.producto.precio_venta || 0) * fi.cantidad,
              }))
            : cart.map((c) => ({
                id_producto: c.producto.id_producto,
                nombre: c.producto.nombre,
                cantidad: c.cantidad,
                precio_unitario: c.producto.precio_venta,
                subtotal: c.producto.precio_venta * c.cantidad,
                notas: c.notas,
              })),
        subtotal: res.factura.subtotal || subtotal,
        impuesto: res.factura.impuesto || impuesto,
        costo_domicilio: res.factura.costo_domicilio ?? effectiveDomicilio,
        descuento: res.factura.descuento ?? (Number(descuento) || 0),
        total: res.factura.total || total,
      };

      onNotify('ok', `Pedido ${enrichedFactura.numero_factura} registrado exitosamente`);
      setCart([]);
      setNotasPedido('');
      setDescuento(0);
      setMobileCartOpen(false);
      onOrderCreated(enrichedFactura);
    } catch (err: any) {
      onNotify('err', err?.message || 'No se pudo crear el pedido en Google Apps Script');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCartContent = () => (
    <form onSubmit={handleConfirmOrder} className="flex flex-col h-full">
      {/* Order Type Selector (Mesa | Para Llevar | Domicilio) */}
      <div className="p-4 border-b border-neutral-800 space-y-3">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0F1115] rounded-xl border border-neutral-800">
          {(
            [
              { type: 'Mesa', icon: Utensils },
              { type: 'Para Llevar', icon: ShoppingBag },
              { type: 'Domicilio', icon: Bike },
            ] as const
          ).map(({ type, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => setTipoPedido(type)}
              className={`min-h-[44px] px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                tipoPedido === type
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{type}</span>
            </button>
          ))}
        </div>

        {/* Customer Phone Autocomplete & Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="relative">
            <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3.5 pointer-events-none" />
            <input
              type="tel"
              value={clienteTelefono}
              onFocus={() => setShowClientSuggestions(true)}
              onBlur={() => setTimeout(() => setShowClientSuggestions(false), 180)}
              onChange={(e) => {
                setClienteTelefono(e.target.value);
                setShowClientSuggestions(true);
              }}
              placeholder="Teléfono cliente..."
              className="w-full min-h-[42px] pl-8 pr-3 py-1.5 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
            />
            {showClientSuggestions && matchingClients.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl bg-[#181B22] border border-orange-500/50 shadow-xl overflow-hidden">
                {matchingClients.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => handleSelectCliente(c)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-neutral-800 border-b border-neutral-800 last:border-0 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">{c.nombre}</div>
                      <div className="text-[10px] text-neutral-400">{c.direccion}</div>
                    </div>
                    <span className="font-mono text-orange-400">{c.telefono}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              placeholder="Nombre del cliente"
              className="w-full min-h-[42px] pl-8 pr-3 py-1.5 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Location / Mesa / Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className={tipoPedido === 'Domicilio' ? '' : 'sm:col-span-2'}>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-orange-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="text"
                required
                value={mesaODireccion}
                onChange={(e) => setMesaODireccion(e.target.value)}
                placeholder={
                  tipoPedido === 'Mesa'
                    ? 'Ej: Mesa 1, Barra 2...'
                    : tipoPedido === 'Domicilio'
                    ? 'Dirección exacta de entrega...'
                    : 'Para Llevar / Mostrador'
                }
                className="w-full min-h-[42px] pl-8 pr-3 py-1.5 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {tipoPedido === 'Domicilio' && (
            <div>
              <input
                type="text"
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                placeholder="Barrio / Sector"
                className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          )}
        </div>

        {tipoPedido === 'Domicilio' && domiciliarios.length > 0 && (
          <div>
            <select
              value={selectedDomiciliarioId}
              onChange={(e) => setSelectedDomiciliarioId(e.target.value)}
              className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs text-white focus:outline-none focus:border-orange-500"
            >
              <option value="">Repartidor: Asignar luego</option>
              {domiciliarios.map((d) => (
                <option key={d.id_trabajador} value={d.id_trabajador}>
                  Repartidor: {d.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[180px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-8 text-neutral-500">
            <ShoppingCart className="w-10 h-10 mb-2 stroke-1" />
            <p className="text-sm font-semibold text-neutral-400">Carrito vacío</p>
            <p className="text-xs">Toca cualquier producto para agregarlo al pedido</p>
          </div>
        ) : (
          cart.map(({ producto, cantidad, notas }) => {
            const isEditingNote = editingNoteId === producto.id_producto;
            return (
              <div
                key={producto.id_producto}
                className="rounded-xl bg-[#0F1115] border border-neutral-800 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white leading-snug truncate">
                      {producto.nombre}
                    </div>
                    <div className="text-xs font-mono text-orange-400 tabular-nums">
                      {formatCOP(producto.precio_venta)} c/u · Subtotal:{' '}
                      <strong>{formatCOP(producto.precio_venta * cantidad)}</strong>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(producto.id_producto, -1)}
                      className="min-h-[38px] min-w-[38px] rounded-lg bg-[#181B22] hover:bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-mono font-bold text-sm tabular-nums">
                      {cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(producto.id_producto, 1)}
                      className="min-h-[38px] min-w-[38px] rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 flex items-center justify-center text-orange-400 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Item Notes Toggle & Editor */}
                <div className="pt-1">
                  {!isEditingNote && !notas ? (
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(producto.id_producto)}
                      className="text-[11px] text-neutral-400 hover:text-orange-400 flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>+ Nota cocina (Sin cebolla, término...)</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={notas}
                        onChange={(e) => updateItemNote(producto.id_producto, e.target.value)}
                        placeholder="Ej: Sin cebolla, término medio..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181B22] border border-neutral-700 text-xs text-amber-300 focus:outline-none focus:border-orange-500"
                      />
                      <div className="flex flex-wrap gap-1">
                        {QUICK_NOTES.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => appendQuickNote(producto.id_producto, chip)}
                            className="px-2 py-0.5 rounded bg-[#181B22] hover:bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals, Payment & Submit Footer */}
      <div className="p-4 border-t border-neutral-800 bg-[#14171E] space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          {tipoPedido === 'Domicilio' && (
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">
                Costo Domicilio (COP)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={costoDomicilio}
                onChange={(e) => setCostoDomicilio(Number(e.target.value))}
                className="w-full min-h-[40px] px-3 py-1 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs font-mono text-white"
              />
            </div>
          )}
          <div className={tipoPedido === 'Domicilio' ? '' : 'col-span-2'}>
            <label className="block text-[11px] text-neutral-400 mb-1">Descuento (COP)</label>
            <input
              type="number"
              min="0"
              step="500"
              value={descuento}
              onChange={(e) => setDescuento(Number(e.target.value))}
              className="w-full min-h-[40px] px-3 py-1 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs font-mono text-white"
            />
          </div>
        </div>

        {/* Payment Method & Status */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Método de Pago</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
              className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs font-semibold text-white"
            >
              {METODOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Estado de Pago</label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#0F1115] rounded-xl border border-neutral-700 min-h-[42px]">
              {(['Pagado', 'Pendiente'] as const).map((est) => (
                <button
                  key={est}
                  type="button"
                  onClick={() => setEstadoPago(est)}
                  className={`rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    estadoPago === est
                      ? est === 'Pagado'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-black'
                      : 'text-neutral-400'
                  }`}
                >
                  {est}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Numbers */}
        <div className="space-y-1 pt-1 text-xs">
          <div className="flex justify-between text-neutral-400">
            <span>Subtotal ({totalItems} items)</span>
            <span className="font-mono tabular-nums">{formatCOP(subtotal)}</span>
          </div>
          {effectiveDomicilio > 0 && (
            <div className="flex justify-between text-neutral-400">
              <span>Domicilio</span>
              <span className="font-mono tabular-nums">{formatCOP(effectiveDomicilio)}</span>
            </div>
          )}
          {descuento > 0 && (
            <div className="flex justify-between text-amber-400">
              <span>Descuento</span>
              <span className="font-mono tabular-nums">- {formatCOP(descuento)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline text-base font-extrabold text-white pt-1 border-t border-neutral-800">
            <span>TOTAL A COBRAR</span>
            <span className="text-xl font-mono text-orange-400 tabular-nums">
              {formatCOP(total)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || cart.length === 0}
          className="w-full min-h-[52px] rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>
            {submitting ? 'Procesando Pedido...' : `Confirmar Pedido · ${formatCOP(total)}`}
          </span>
        </button>
      </div>
    </form>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Products Grid */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Search & Category Bar */}
        <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar hamburguesa, combo, bebida..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              onClick={loadPosData}
              disabled={loading}
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer"
              title="Recargar menú"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white shadow'
                    : 'bg-[#0F1115] text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Touch Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-40 rounded-2xl bg-[#181B22] border border-neutral-800 animate-pulse p-5"
              />
            ))}
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-10 text-center space-y-2">
            <p className="text-base font-bold text-white">No se encontraron productos</p>
            <p className="text-xs text-neutral-400">
              Prueba con otra categoría o crea productos en el módulo de Menú y Recetas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMenu.map((prod) => {
              const inCart = cart.find((c) => c.producto.id_producto === prod.id_producto);
              return (
                <button
                  key={prod.id_producto}
                  type="button"
                  onClick={() => addToCart(prod)}
                  className={`group text-left rounded-2xl bg-[#181B22] hover:bg-[#1E222B] active:scale-[0.98] border p-4 flex flex-col justify-between min-h-[152px] transition-all cursor-pointer ${
                    inCart ? 'border-orange-500 ring-1 ring-orange-500/40' : 'border-neutral-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-neutral-400">
                        {prod.categoria} · {prod.id_producto}
                      </span>
                      {inCart && (
                        <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white font-mono text-xs font-extrabold">
                          {inCart.cantidad}x
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-white group-hover:text-orange-400 transition-colors leading-snug">
                      {prod.nombre}
                    </h3>
                    {prod.descripcion && (
                      <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {prod.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-lg font-extrabold font-mono text-orange-400 tabular-nums">
                      {formatCOP(prod.precio_venta)}
                    </span>
                    <span className="min-h-[36px] px-3 py-1.5 rounded-xl bg-orange-500/15 group-hover:bg-orange-500 text-orange-400 group-hover:text-white text-xs font-bold flex items-center gap-1 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Desktop Cart Sidebar */}
      <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20 rounded-2xl bg-[#181B22] border border-neutral-800 overflow-hidden shadow-xl max-h-[calc(100vh-6rem)] flex flex-col">
        <div className="px-4 py-3.5 bg-[#0F1115] border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-extrabold text-white">Comanda Actual ({totalItems})</h2>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar</span>
            </button>
          )}
        </div>
        {renderCartContent()}
      </div>

      {/* Mobile Sticky Bottom Cart Trigger */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="w-full min-h-[54px] px-5 py-3 rounded-2xl bg-orange-500 text-white font-extrabold text-sm flex items-center justify-between shadow-2xl shadow-orange-500/40"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5" />
              <span>Ver Pedido ({totalItems} items)</span>
            </div>
            <span className="font-mono text-base tabular-nums">{formatCOP(total)}</span>
          </button>
        </div>
      )}

      {/* Mobile Full Drawer Cart */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="w-full max-h-[90vh] bg-[#181B22] rounded-t-3xl border-t border-neutral-700 flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-[#0F1115] border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-orange-400" />
                <h2 className="text-base font-extrabold text-white">
                  Confirmar Pedido ({totalItems})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderCartContent()}</div>
          </div>
        </div>
      )}
    </div>
  );
};
