import React, { useEffect, useState, useCallback } from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Utensils,
  ShoppingBag,
  Bike,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { AuthUser, EstadoCocina, Pedido } from '../types/pos';
import { api, getTodayDateString } from '../services/api';

interface KdsViewProps {
  currentUser: AuthUser;
  onNotify: (type: 'ok' | 'err', msg: string) => void;
}

const COLUMNS: {
  state: EstadoCocina;
  title: string;
  accent: string;
  nextState: EstadoCocina;
  nextLabel: string;
  btnColor: string;
}[] = [
  {
    state: 'Pendiente',
    title: '1. Pendientes por Iniciar',
    accent: 'border-amber-500/40 text-amber-400',
    nextState: 'En Preparación',
    nextLabel: 'Pasar a Parrilla / Preparación',
    btnColor: 'bg-amber-500 hover:bg-amber-600 text-black',
  },
  {
    state: 'En Preparación',
    title: '2. En Parrilla / Preparación',
    accent: 'border-orange-500/40 text-orange-400',
    nextState: 'Listo',
    nextLabel: 'Marcar Pedido LISTO',
    btnColor: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  {
    state: 'Listo',
    title: '3. Listos para Entregar',
    accent: 'border-emerald-500/40 text-emerald-400',
    nextState: 'Entregado',
    nextLabel: 'Marcar Entregado / Despachado',
    btnColor: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
];

export const KdsView: React.FC<KdsViewProps> = ({ currentUser, onNotify }) => {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clockingShift, setClockingShift] = useState<boolean>(false);
  const [fechaFiltro, setFechaFiltro] = useState<string>(getTodayDateString());

  const loadKdsOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const all = await api.getPedidos({ fecha: fechaFiltro });
        // If today in Bogota vs UTC has orders without date filter, fallback if empty
        if (all.length === 0) {
          const fallbackAll = await api.getPedidos({});
          setPedidos(
            fallbackAll.filter(
              (p) =>
                p.estado_cocina === 'Pendiente' ||
                p.estado_cocina === 'En Preparación' ||
                p.estado_cocina === 'Listo'
            )
          );
        } else {
          setPedidos(
            all.filter(
              (p) =>
                p.estado_cocina === 'Pendiente' ||
                p.estado_cocina === 'En Preparación' ||
                p.estado_cocina === 'Listo'
            )
          );
        }
      } catch (err: any) {
        if (!silent) {
          onNotify('err', err?.message || 'Error al sincronizar comandas de cocina');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fechaFiltro, onNotify]
  );

  useEffect(() => {
    loadKdsOrders();
  }, [loadKdsOrders]);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadKdsOrders(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadKdsOrders]);

  const handleAdvanceState = async (pedido: Pedido, nuevoEstado: EstadoCocina) => {
    setUpdatingId(pedido.id_pedido);
    try {
      await api.actualizarPedido({
        id_pedido: pedido.id_pedido,
        estado_cocina: nuevoEstado,
        responsable: currentUser.nombre,
      });
      onNotify(
        'ok',
        `Pedido ${pedido.numero_factura} actualizado a "${nuevoEstado}"`
      );
      await loadKdsOrders(true);
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al actualizar estado de comanda');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleClockMyShift = async () => {
    setClockingShift(true);
    try {
      const res: any = await api.registrarTurno(currentUser.id);
      onNotify(
        'ok',
        res?.mensaje ||
          res?.message ||
          `Turno registrado para ${currentUser.nombre}`
      );
    } catch (err: any) {
      onNotify('err', err?.message || 'No se pudo registrar el turno');
    } finally {
      setClockingShift(false);
    }
  };

  const getOrderIcon = (tipo: Pedido['tipo_pedido']) => {
    if (tipo === 'Domicilio') return Bike;
    if (tipo === 'Para Llevar') return ShoppingBag;
    return Utensils;
  };

  return (
    <div className="space-y-5">
      {/* KDS Top Control Bar */}
      <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Pantalla de Cocina (KDS) · Parrilla en Vivo
            </h1>
            <p className="text-xs text-neutral-400">
              Toque rápido para avanzar estado · Operador: {currentUser.nombre} ({currentUser.rol})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs font-mono text-white"
          />

          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                : 'bg-[#0F1115] border-neutral-700 text-neutral-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Auto-Refresco 20s: {autoRefresh ? 'ACTIVO' : 'PAUSADO'}</span>
          </button>

          <button
            type="button"
            onClick={handleClockMyShift}
            disabled={clockingShift}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>{clockingShift ? 'Registrando...' : 'Marcar Mi Turno (Entrada/Salida)'}</span>
          </button>

          <button
            type="button"
            onClick={() => loadKdsOrders()}
            disabled={loading}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar Ahora</span>
          </button>
        </div>
      </div>

      {/* 3-Column KDS Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {COLUMNS.map((col) => {
          const colOrders = pedidos.filter((p) => p.estado_cocina === col.state);
          return (
            <div
              key={col.state}
              className="rounded-2xl bg-[#181B22] border border-neutral-800 overflow-hidden flex flex-col"
            >
              {/* Column Header */}
              <div className="px-5 py-4 bg-[#12141A] border-b border-neutral-800 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-white">{col.title}</h2>
                <span className="px-2.5 py-1 rounded-lg bg-[#0F1115] border border-neutral-700 font-mono text-sm font-bold text-white">
                  {colOrders.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="p-4 space-y-4 min-h-[340px]">
                {colOrders.length === 0 ? (
                  <div className="py-14 text-center text-neutral-500 space-y-1">
                    <CheckCircle2 className="w-8 h-8 mx-auto stroke-1 text-neutral-600" />
                    <p className="text-sm font-semibold">Sin comandas en "{col.state}"</p>
                  </div>
                ) : (
                  colOrders.map((pedido) => {
                    const ServiceIcon = getOrderIcon(pedido.tipo_pedido);
                    const isUpdating = updatingId === pedido.id_pedido;

                    return (
                      <div
                        key={pedido.id_pedido}
                        className={`rounded-2xl bg-[#0F1115] border-2 ${col.accent} p-4 space-y-3.5 shadow-lg`}
                      >
                        {/* Ticket Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-extrabold font-mono text-white">
                                #{pedido.numero_factura}
                              </span>
                              <span className="text-xs font-mono text-neutral-400">
                                {pedido.hora}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-300 font-medium mt-0.5">
                              {pedido.cliente_nombre}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181B22] border border-neutral-700 text-xs font-bold text-white">
                            <ServiceIcon className="w-3.5 h-3.5 text-orange-400" />
                            <span>{pedido.tipo_pedido}</span>
                          </div>
                        </div>

                        {pedido.mesa_o_direccion && (
                          <div className="text-xs text-neutral-300 bg-[#181B22] px-3 py-1.5 rounded-lg">
                            <strong className="text-neutral-400">Destino:</strong>{' '}
                            {pedido.mesa_o_direccion}
                          </div>
                        )}

                        {/* Large Text Product Items & Notes */}
                        <div className="space-y-2.5">
                          {pedido.items && pedido.items.length > 0 ? (
                            pedido.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-[#181B22] border border-neutral-800"
                              >
                                <div className="flex items-baseline gap-2.5">
                                  <span className="text-lg font-extrabold font-mono text-orange-400 shrink-0">
                                    {item.cantidad}x
                                  </span>
                                  <span className="text-base font-extrabold text-white leading-snug">
                                    {item.nombre}
                                  </span>
                                </div>
                                {item.notas && (
                                  <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-bold flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>NOTA: {item.notas}</span>
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-2.5 rounded-xl bg-[#181B22] text-sm font-bold text-neutral-300">
                              {pedido.notas || 'Comanda general sin desglose'}
                            </div>
                          )}
                        </div>

                        {pedido.notas && pedido.items && pedido.items.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200 font-semibold">
                            <strong>Observación Pedido:</strong> {pedido.notas}
                          </div>
                        )}

                        {/* One-Tap Action Button */}
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleAdvanceState(pedido, col.nextState)}
                          className={`w-full min-h-[50px] rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${col.btnColor} disabled:opacity-50`}
                        >
                          <span>{isUpdating ? 'Actualizando...' : col.nextLabel}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
