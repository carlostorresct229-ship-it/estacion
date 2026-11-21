import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  ClipboardList,
  UtensilsCrossed,
  Plus,
  Edit3,
  ArrowUpDown,
  RefreshCw,
  Search,
  X,
  Save,
} from 'lucide-react';
import {
  AuthUser,
  Insumo,
  KardexItem,
  Producto,
  RecetaItem,
} from '../types/pos';
import { api, formatCOP } from '../services/api';

interface InventarioMenuViewProps {
  currentUser: AuthUser;
  onNotify: (type: 'ok' | 'err', msg: string) => void;
}

export const InventarioMenuView: React.FC<InventarioMenuViewProps> = ({
  currentUser,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'insumos' | 'kardex' | 'menu'>('insumos');
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [kardex, setKardex] = useState<KardexItem[]>([]);
  const [menu, setMenu] = useState<Producto[]>([]);
  const [recetas, setRecetas] = useState<RecetaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal: Crear / Editar Insumo
  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [insumoForm, setInsumoForm] = useState<{
    id_insumo?: string;
    nombre: string;
    categoria: string;
    unidad: string;
    stock_actual: number;
    stock_minimo: number;
    costo_unitario: number;
    proveedor: string;
  }>({
    nombre: '',
    categoria: 'Carnes',
    unidad: 'Und',
    stock_actual: 0,
    stock_minimo: 10,
    costo_unitario: 0,
    proveedor: '',
  });

  // Modal: Movimiento Rápido Inventario (Entrada Compra | Merma | Ajuste)
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movForm, setMovForm] = useState<{
    id_insumo: string;
    nombre_insumo: string;
    tipo: 'Entrada Compra' | 'Merma' | 'Ajuste';
    cantidad: number;
    referencia: string;
  }>({
    id_insumo: '',
    nombre_insumo: '',
    tipo: 'Entrada Compra',
    cantidad: 1,
    referencia: '',
  });

  // Modal: Crear / Editar Producto del Menú
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [prodForm, setProdForm] = useState<{
    id_producto?: string;
    nombre: string;
    categoria: string;
    precio_venta: number;
    costo_estimado: number;
    tipo_inventario: 'Receta' | 'Directo';
    id_insumo_directo: string;
    disponible: 'SI' | 'NO';
    descripcion: string;
  }>({
    nombre: '',
    categoria: 'Hamburguesas',
    precio_venta: 18000,
    costo_estimado: 7000,
    tipo_inventario: 'Receta',
    id_insumo_directo: '',
    disponible: 'SI',
    descripcion: '',
  });

  // Modal: Asignar Ingrediente de Receta
  const [recetaModalProduct, setRecetaModalProduct] = useState<Producto | null>(null);
  const [recetaInsumoId, setRecetaInsumoId] = useState<string>('');
  const [recetaCantidad, setRecetaCantidad] = useState<number>(1);
  const [saving, setSaving] = useState<boolean>(false);

  const loadAllInventoryData = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, karRes, menuRes, recRes] = await Promise.all([
        api.getInventario(),
        api.getKardex().catch(() => []),
        api.getMenu(),
        api.getRecetas().catch(() => []),
      ]);
      setInsumos(insRes);
      setKardex(karRes);
      setMenu(menuRes);
      setRecetas(recRes);
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al cargar datos de inventario y menú');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadAllInventoryData();
  }, [loadAllInventoryData]);

  // Handlers: Insumo
  const openNewInsumo = () => {
    setInsumoForm({
      id_insumo: undefined,
      nombre: '',
      categoria: 'Carnes',
      unidad: 'Und',
      stock_actual: 0,
      stock_minimo: 10,
      costo_unitario: 0,
      proveedor: '',
    });
    setInsumoModalOpen(true);
  };

  const openEditInsumo = (ins: Insumo) => {
    setInsumoForm({
      id_insumo: ins.id_insumo,
      nombre: ins.nombre,
      categoria: ins.categoria,
      unidad: ins.unidad,
      stock_actual: ins.stock_actual,
      stock_minimo: ins.stock_minimo,
      costo_unitario: ins.costo_unitario,
      proveedor: ins.proveedor,
    });
    setInsumoModalOpen(true);
  };

  const handleSaveInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.guardarInsumo(insumoForm);
      onNotify('ok', `Insumo "${insumoForm.nombre}" guardado en Google Sheets`);
      setInsumoModalOpen(false);
      await loadAllInventoryData();
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al guardar insumo');
    } finally {
      setSaving(false);
    }
  };

  // Handlers: Movimiento Kardex
  const openMovimientoModal = (
    ins: Insumo,
    tipoDefault: 'Entrada Compra' | 'Merma' | 'Ajuste' = 'Entrada Compra'
  ) => {
    setMovForm({
      id_insumo: ins.id_insumo,
      nombre_insumo: ins.nombre,
      tipo: tipoDefault,
      cantidad: 1,
      referencia: '',
    });
    setMovModalOpen(true);
  };

  const handleSaveMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.registrarMovimientoInventario({
        id_insumo: movForm.id_insumo,
        tipo: movForm.tipo,
        cantidad: Number(movForm.cantidad),
        referencia: movForm.referencia || movForm.tipo,
        responsable: currentUser.nombre,
      });
      onNotify(
        'ok',
        `Movimiento "${movForm.tipo}" registrado para ${movForm.nombre_insumo}`
      );
      setMovModalOpen(false);
      await loadAllInventoryData();
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al registrar movimiento de inventario');
    } finally {
      setSaving(false);
    }
  };

  // Handlers: Producto Menú
  const openNewProducto = () => {
    setProdForm({
      id_producto: undefined,
      nombre: '',
      categoria: 'Hamburguesas',
      precio_venta: 18000,
      costo_estimado: 7000,
      tipo_inventario: 'Receta',
      id_insumo_directo: '',
      disponible: 'SI',
      descripcion: '',
    });
    setProdModalOpen(true);
  };

  const openEditProducto = (p: Producto) => {
    setProdForm({
      id_producto: p.id_producto,
      nombre: p.nombre,
      categoria: p.categoria,
      precio_venta: p.precio_venta,
      costo_estimado: p.costo_estimado,
      tipo_inventario: p.tipo_inventario,
      id_insumo_directo: p.id_insumo_directo || '',
      disponible: p.disponible,
      descripcion: p.descripcion,
    });
    setProdModalOpen(true);
  };

  const handleSaveProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.guardarProducto(prodForm);
      onNotify('ok', `Producto "${prodForm.nombre}" guardado en el menú`);
      setProdModalOpen(false);
      await loadAllInventoryData();
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  // Handlers: Guardar Receta
  const handleAddRecetaIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recetaModalProduct || !recetaInsumoId) return;
    setSaving(true);
    try {
      await api.guardarReceta({
        id_producto: recetaModalProduct.id_producto,
        id_insumo: recetaInsumoId,
        cantidad_requerida: Number(recetaCantidad) || 1,
      });
      onNotify('ok', `Ingrediente asignado a la receta de ${recetaModalProduct.nombre}`);
      await loadAllInventoryData();
    } catch (err: any) {
      onNotify('err', err?.message || 'Error guardando receta');
    } finally {
      setSaving(false);
    }
  };

  const filteredInsumos = insumos.filter(
    (i) =>
      !search.trim() ||
      i.nombre.toLowerCase().includes(search.toLowerCase()) ||
      i.categoria.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Sub-Views Selector */}
      <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Inventario, Kardex, Menú y Recetas
          </h1>
          <p className="text-xs text-neutral-400">
            Control de insumos con semáforo de stock, movimientos y descuento automático por receta
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-[#0F1115] rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setSubTab('insumos')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                subTab === 'insumos'
                  ? 'bg-orange-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Insumos ({insumos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('kardex')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                subTab === 'kardex'
                  ? 'bg-orange-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Kardex ({kardex.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('menu')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                subTab === 'menu'
                  ? 'bg-orange-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Menú y Recetas ({menu.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadAllInventoryData}
            disabled={loading}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* SUB-VISTA 1: INSUMOS */}
      {subTab === 'insumos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar insumo o categoría..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#181B22] border border-neutral-800 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="button"
              onClick={openNewInsumo}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Insumo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredInsumos.map((ins) => {
              const isCritico = ins.estado_stock === 'CRITICO';
              return (
                <div
                  key={ins.id_insumo}
                  className={`rounded-2xl bg-[#181B22] border p-5 flex flex-col justify-between space-y-4 ${
                    isCritico ? 'border-red-600/70' : 'border-neutral-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono text-neutral-400">
                          {ins.id_insumo} · {ins.categoria}
                        </span>
                        <h3 className="text-base font-extrabold text-white">{ins.nombre}</h3>
                      </div>
                      <span
                        className={`text-xs font-extrabold uppercase ${
                          isCritico ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {isCritico ? 'STOCK CRÍTICO' : 'STOCK OK'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#0F1115] border border-neutral-800">
                        <span className="block text-[10px] text-neutral-400">Stock Actual</span>
                        <span
                          className={`text-base font-extrabold font-mono tabular-nums ${
                            isCritico ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          {ins.stock_actual} {ins.unidad}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0F1115] border border-neutral-800">
                        <span className="block text-[10px] text-neutral-400">Stock Mínimo</span>
                        <span className="text-base font-bold font-mono text-neutral-300 tabular-nums">
                          {ins.stock_minimo} {ins.unidad}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0F1115] border border-neutral-800">
                        <span className="block text-[10px] text-neutral-400">Costo Unit.</span>
                        <span className="text-sm font-bold font-mono text-orange-400 tabular-nums">
                          {formatCOP(ins.costo_unitario)}
                        </span>
                      </div>
                    </div>

                    {ins.proveedor && (
                      <p className="text-xs text-neutral-400 pt-1">
                        Proveedor: <strong className="text-neutral-200">{ins.proveedor}</strong>
                      </p>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => openMovimientoModal(ins, 'Entrada Compra')}
                      className="col-span-2 min-h-[42px] px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>+ Compra / Ajuste</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openMovimientoModal(ins, 'Merma')}
                      className="min-h-[42px] px-2 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      Merma
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditInsumo(ins)}
                      className="min-h-[42px] px-2 py-1.5 rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                      title="Editar Insumo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VISTA 2: KARDEX */}
      {subTab === 'kardex' && (
        <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
          <h2 className="text-base font-extrabold text-white">
            Historial de Movimientos de Inventario (Kardex)
          </h2>

          {kardex.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              Aún no hay movimientos registrados en el Kardex.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-[11px] text-neutral-400">
                    <th className="py-2.5 pr-3">Fecha / Hora</th>
                    <th className="py-2.5 px-3">Insumo</th>
                    <th className="py-2.5 px-3">Tipo Movimiento</th>
                    <th className="py-2.5 px-3 text-right">Cantidad</th>
                    <th className="py-2.5 px-3">Referencia</th>
                    <th className="py-2.5 pl-3">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs">
                  {kardex.map((k, idx) => (
                    <tr key={k.id_movimiento || idx} className="hover:bg-neutral-800/30">
                      <td className="py-3 pr-3 font-mono text-neutral-300">
                        {k.fecha} {k.hora ? `· ${k.hora}` : ''}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {k.nombre_insumo || k.id_insumo}
                      </td>
                      <td className="py-3 px-3 font-semibold text-orange-400">{k.tipo}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums">
                        {k.cantidad}
                      </td>
                      <td className="py-3 px-3 text-neutral-300">{k.referencia}</td>
                      <td className="py-3 pl-3 text-neutral-400">{k.responsable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VISTA 3: MENÚ Y RECETAS */}
      {subTab === 'menu' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openNewProducto}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Producto del Menú</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {menu.map((prod) => {
              const prodRecetas = recetas.filter((r) => r.id_producto === prod.id_producto);
              return (
                <div
                  key={prod.id_producto}
                  className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono text-neutral-400">
                        {prod.id_producto} · {prod.categoria} · {prod.tipo_inventario}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          prod.disponible === 'SI' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {prod.disponible === 'SI' ? 'DISPONIBLE' : 'OCULTO'}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white">{prod.nombre}</h3>
                    <p className="text-xs text-neutral-400">{prod.descripcion}</p>

                    <div className="flex items-center justify-between pt-2 text-xs">
                      <div>
                        <span className="text-neutral-400">Precio Venta: </span>
                        <strong className="font-mono text-sm text-orange-400 tabular-nums">
                          {formatCOP(prod.precio_venta)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-neutral-400">Costo Est.: </span>
                        <strong className="font-mono text-neutral-200 tabular-nums">
                          {formatCOP(prod.costo_estimado)}
                        </strong>
                      </div>
                    </div>

                    {/* Recipe Ingredients List */}
                    {prod.tipo_inventario === 'Receta' && (
                      <div className="pt-2">
                        <div className="text-[11px] font-bold text-neutral-300 mb-1.5">
                          Ingredientes de Receta ({prodRecetas.length}):
                        </div>
                        {prodRecetas.length === 0 ? (
                          <p className="text-[11px] text-neutral-500 italic">
                            Sin ingredientes asignados aún
                          </p>
                        ) : (
                          <ul className="space-y-1 text-xs text-neutral-300 bg-[#0F1115] p-2.5 rounded-xl border border-neutral-800">
                            {prodRecetas.map((r, i) => {
                              const insObj = insumos.find((ins) => ins.id_insumo === r.id_insumo);
                              return (
                                <li key={i} className="flex justify-between">
                                  <span>{insObj ? insObj.nombre : r.id_insumo}</span>
                                  <span className="font-mono text-orange-400">
                                    {r.cantidad_requerida} {insObj?.unidad || 'Und'}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => openEditProducto(prod)}
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Producto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRecetaModalProduct(prod);
                        setRecetaInsumoId(insumos[0]?.id_insumo || '');
                        setRecetaCantidad(1);
                      }}
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-xs font-bold text-orange-400 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Ingrediente</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: CREAR / EDITAR INSUMO */}
      {insumoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#181B22] border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#0F1115] border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                {insumoForm.id_insumo ? `Editar Insumo ${insumoForm.id_insumo}` : 'Crear Nuevo Insumo'}
              </h3>
              <button
                onClick={() => setInsumoModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveInsumo} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-400 mb-1">Nombre del Insumo</label>
                  <input
                    type="text"
                    required
                    value={insumoForm.nombre}
                    onChange={(e) => setInsumoForm({ ...insumoForm, nombre: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    value={insumoForm.categoria}
                    onChange={(e) => setInsumoForm({ ...insumoForm, categoria: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Unidad (Und, Kg, Gr, Lt)
                  </label>
                  <input
                    type="text"
                    required
                    value={insumoForm.unidad}
                    onChange={(e) => setInsumoForm({ ...insumoForm, unidad: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={insumoForm.stock_actual}
                    onChange={(e) =>
                      setInsumoForm({ ...insumoForm, stock_actual: Number(e.target.value) })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Stock Mínimo Alerta</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={insumoForm.stock_minimo}
                    onChange={(e) =>
                      setInsumoForm({ ...insumoForm, stock_minimo: Number(e.target.value) })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Costo Unitario (COP)</label>
                  <input
                    type="number"
                    required
                    value={insumoForm.costo_unitario}
                    onChange={(e) =>
                      setInsumoForm({ ...insumoForm, costo_unitario: Number(e.target.value) })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Proveedor</label>
                  <input
                    type="text"
                    value={insumoForm.proveedor}
                    onChange={(e) => setInsumoForm({ ...insumoForm, proveedor: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInsumoModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Guardando...' : 'Guardar Insumo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR MOVIMIENTO DE INVENTARIO */}
      {movModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#181B22] border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#0F1115] border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                Movimiento Kardex · {movForm.nombre_insumo}
              </h3>
              <button
                onClick={() => setMovModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMovimiento} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Tipo de Movimiento</label>
                <select
                  value={movForm.tipo}
                  onChange={(e) =>
                    setMovForm({
                      ...movForm,
                      tipo: e.target.value as 'Entrada Compra' | 'Merma' | 'Ajuste',
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                >
                  <option value="Entrada Compra">Entrada Compra (Suma al stock)</option>
                  <option value="Merma">Merma (Descuenta del stock)</option>
                  <option value="Ajuste">Ajuste de Inventario</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Cantidad</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={movForm.cantidad}
                  onChange={(e) => setMovForm({ ...movForm, cantidad: Number(e.target.value) })}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Referencia / Factura Proveedor / Motivo
                </label>
                <input
                  type="text"
                  required
                  value={movForm.referencia}
                  onChange={(e) => setMovForm({ ...movForm, referencia: e.target.value })}
                  placeholder="Ej: Factura Panadería #204"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white cursor-pointer"
                >
                  {saving ? 'Registrando...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR / EDITAR PRODUCTO DEL MENÚ */}
      {prodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#181B22] border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#0F1115] border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                {prodForm.id_producto
                  ? `Editar Producto ${prodForm.id_producto}`
                  : 'Nuevo Producto del Menú'}
              </h3>
              <button
                onClick={() => setProdModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProducto} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-400 mb-1">Nombre del Producto</label>
                  <input
                    type="text"
                    required
                    value={prodForm.nombre}
                    onChange={(e) => setProdForm({ ...prodForm, nombre: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Categoría</label>
                  <input
                    type="text"
                    required
                    value={prodForm.categoria}
                    onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value })}
                    placeholder="Hamburguesas, Combos, Bebidas..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Disponible en POS</label>
                  <select
                    value={prodForm.disponible}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, disponible: e.target.value as 'SI' | 'NO' })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  >
                    <option value="SI">SI (Visible en POS)</option>
                    <option value="NO">NO (Agotado / Oculto)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Precio Venta (COP)</label>
                  <input
                    type="number"
                    required
                    value={prodForm.precio_venta}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, precio_venta: Number(e.target.value) })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Costo Estimado (COP)
                  </label>
                  <input
                    type="number"
                    required
                    value={prodForm.costo_estimado}
                    onChange={(e) =>
                      setProdForm({ ...prodForm, costo_estimado: Number(e.target.value) })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Tipo de Inventario</label>
                  <select
                    value={prodForm.tipo_inventario}
                    onChange={(e) =>
                      setProdForm({
                        ...prodForm,
                        tipo_inventario: e.target.value as 'Receta' | 'Directo',
                      })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  >
                    <option value="Receta">Receta (Compuesto por varios insumos)</option>
                    <option value="Directo">Directo (Bebida o unidad individual)</option>
                  </select>
                </div>
                {prodForm.tipo_inventario === 'Directo' && (
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Insumo Directo</label>
                    <select
                      value={prodForm.id_insumo_directo}
                      onChange={(e) =>
                        setProdForm({ ...prodForm, id_insumo_directo: e.target.value })
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                    >
                      <option value="">-- Seleccionar Insumo --</option>
                      {insumos.map((ins) => (
                        <option key={ins.id_insumo} value={ins.id_insumo}>
                          {ins.nombre} ({ins.id_insumo})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-400 mb-1">Descripción</label>
                  <textarea
                    rows={2}
                    value={prodForm.descripcion}
                    onChange={(e) => setProdForm({ ...prodForm, descripcion: e.target.value })}
                    className="w-full p-3 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProdModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ASIGNAR INGREDIENTE A RECETA */}
      {recetaModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#181B22] border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#0F1115] border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                Receta · {recetaModalProduct.nombre}
              </h3>
              <button
                onClick={() => setRecetaModalProduct(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRecetaIngredient} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Insumo a descontar por cada venta
                </label>
                <select
                  required
                  value={recetaInsumoId}
                  onChange={(e) => setRecetaInsumoId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                >
                  <option value="">-- Seleccionar Insumo --</option>
                  {insumos.map((ins) => (
                    <option key={ins.id_insumo} value={ins.id_insumo}>
                      {ins.nombre} ({ins.unidad}) - Stock: {ins.stock_actual}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Cantidad Requerida por Unidad
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={recetaCantidad}
                  onChange={(e) => setRecetaCantidad(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecetaModalProduct(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar Ingrediente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
