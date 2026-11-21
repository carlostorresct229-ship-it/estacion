import React, { useEffect, useState, useCallback } from 'react';
import {
  Bike,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  Navigation,
  RefreshCw,
  Calculator,
  UserCheck,
  Wallet,
} from 'lucide-react';
import {
  AuthUser,
  Domicilio,
  EstadoEntrega,
  ResumenDomiciliario,
  Trabajador,
} from '../types/pos';
import {
  api,
  buildWhatsAppLink,
  formatCOP,
  getTodayDateString,
} from '../services/api';

interface DomiciliosViewProps {
  currentUser: AuthUser;
  onNotify: (type: 'ok' | 'err', msg: string) => void;
}

export const DomiciliosView: React.FC<DomiciliosViewProps> = ({
  currentUser,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'lista' | 'cuadre'>('lista');
  const [fecha, setFecha] = useState<string>(getTodayDateString());
  const [estadoFiltro, setEstadoFiltro] = useState<string>('Todos');

  const [domicilios, setDomicilios] = useState<Domicilio[]>([]);
  const [repartidores, setRepartidores] = useState<Trabajador[]>([]);
  const [resumen, setResumen] = useState<ResumenDomiciliario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clockingShift, setClockingShift] = useState<boolean>(false);

  const loadDomiciliosData = useCallback(async () => {
    setLoading(true);
    try {
      const [domsRes, trabsRes, resumenRes] = await Promise.all([
        api.getDomicilios({ fecha }),
        api.getTrabajadores().catch(() => ({ total_activos: 0, por_rol: {}, data: [] })),
        api.resumenDomiciliarios(fecha).catch(() => []),
      ]);

      // Fallback if timezone date differs
      if (domsRes.length === 0) {
        const allDoms = await api.getDomicilios({});
        setDomicilios(allDoms);
      } else {
        setDomicilios(domsRes);
      }

      setRepartidores(
        trabsRes.data.filter((t) => t.rol === 'Domiciliario' && t.estado === 'Activo')
      );
      setResumen(resumenRes);
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al cargar domicilios');
    } finally {
      setLoading(false);
    }
  }, [fecha, onNotify]);

  useEffect(() => {
    loadDomiciliosData();
  }, [loadDomiciliosData]);

  const handleAssignDriver = async (dom: Domicilio, id_domiciliario: string) => {
    setUpdatingId(dom.id_domicilio);
    try {
      const driver = repartidores.find((r) => r.id_trabajador === id_domiciliario);
      await api.actualizarDomicilio({
        id_domicilio: dom.id_domicilio,
        id_domiciliario,
        nombre_domiciliario: driver?.nombre,
        estado_entrega: dom.estado_entrega,
      });
      onNotify('ok', `Repartidor asignado al domicilio ${dom.id_domicilio}`);
      await loadDomiciliosData();
    } catch (err: any) {
      onNotify('err', err?.message || 'No se pudo asignar el domiciliario');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateEstado = async (dom: Domicilio, nuevoEstado: EstadoEntrega) => {
    setUpdatingId(dom.id_domicilio);
    try {
      await api.actualizarDomicilio({
        id_domicilio: dom.id_domicilio,
        id_domiciliario: dom.id_domiciliario || currentUser.id,
        estado_entrega: nuevoEstado,
      });
      onNotify(
        'ok',
        `Domicilio ${dom.id_domicilio} marcado como "${nuevoEstado}"`
      );
      await loadDomiciliosData();
    } catch (err: any) {
      onNotify('err', err?.message || 'Error actualizando estado del domicilio');
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
        res?.mensaje || res?.message || `Turno registrado para ${currentUser.nombre}`
      );
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al registrar turno');
    } finally {
      setClockingShift(false);
    }
  };

  const filteredDomicilios = domicilios.filter((d) => {
    if (estadoFiltro !== 'Todos' && d.estado_entrega !== estadoFiltro) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Domicilios y Cuadre de Repartidores
            </h1>
            <p className="text-xs text-neutral-400">
              Despacho en ruta, contacto WhatsApp con cliente y liquidación de fletes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sub-navigation tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#0F1115] rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('lista')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'lista'
                  ? 'bg-orange-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Entregas del Día ({domicilios.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cuadre')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'cuadre'
                  ? 'bg-orange-500 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Cuadre de Domiciliarios</span>
            </button>
          </div>

          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs font-mono text-white"
          />

          <button
            type="button"
            onClick={handleClockMyShift}
            disabled={clockingShift}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-amber-400 flex items-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>{clockingShift ? 'Registrando...' : 'Mi Turno'}</span>
          </button>

          <button
            type="button"
            onClick={loadDomiciliosData}
            disabled={loading}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LISTA DE DOMICILIOS */}
      {activeTab === 'lista' && (
        <div className="space-y-4">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['Todos', 'Pendiente', 'En Camino', 'Entregado', 'Cancelado'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setEstadoFiltro(st)}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  estadoFiltro === st
                    ? 'bg-orange-500 text-white'
                    : 'bg-[#181B22] text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {filteredDomicilios.length === 0 ? (
            <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-12 text-center space-y-2">
              <Bike className="w-10 h-10 text-neutral-600 mx-auto stroke-1" />
              <p className="text-base font-bold text-white">
                No hay domicilios registrados para este filtro
              </p>
              <p className="text-xs text-neutral-400">
                Los pedidos creados como "Domicilio" en el POS aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDomicilios.map((dom) => {
                const isUpdating = updatingId === dom.id_domicilio;
                const waUrl = buildWhatsAppLink(
                  dom.cliente_telefono,
                  `Hola ${dom.cliente_nombre}, tu pedido de *Estación Burguer* (${dom.id_pedido}) va en camino a *${dom.direccion}*. Total: ${formatCOP(
                    dom.total_a_cobrar
                  )}.`
                );

                return (
                  <div
                    key={dom.id_domicilio}
                    className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top ID & Status */}
                      <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-3">
                        <div>
                          <div className="text-base font-extrabold font-mono text-white">
                            {dom.id_domicilio} · Pedido {dom.id_pedido}
                          </div>
                          <div className="text-xs text-neutral-400">
                            {dom.fecha} {dom.hora ? `· ${dom.hora}` : ''}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-extrabold uppercase ${
                            dom.estado_entrega === 'Entregado'
                              ? 'text-emerald-400'
                              : dom.estado_entrega === 'En Camino'
                              ? 'text-amber-400'
                              : dom.estado_entrega === 'Cancelado'
                              ? 'text-red-400'
                              : 'text-orange-400'
                          }`}
                        >
                          {dom.estado_entrega}
                        </span>
                      </div>

                      {/* Customer & Address */}
                      <div className="space-y-2 text-xs">
                        <div className="font-bold text-sm text-white">{dom.cliente_nombre}</div>
                        <div className="flex items-start gap-2 text-neutral-200 bg-[#0F1115] p-3 rounded-xl border border-neutral-800">
                          <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-white">{dom.direccion}</div>
                            {dom.barrio && (
                              <div className="text-neutral-400">Barrio: {dom.barrio}</div>
                            )}
                          </div>
                        </div>

                        {/* Quick Call & WhatsApp Buttons */}
                        {dom.cliente_telefono && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <a
                              href={`tel:${dom.cliente_telefono}`}
                              className="min-h-[42px] px-3 py-2 rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-white flex items-center justify-center gap-1.5"
                            >
                              <Phone className="w-3.5 h-3.5 text-sky-400" />
                              <span>Llamar</span>
                            </a>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[42px] px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Driver Selector */}
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">
                          Domiciliario Asignado
                        </label>
                        <select
                          disabled={isUpdating}
                          value={dom.id_domiciliario}
                          onChange={(e) => handleAssignDriver(dom, e.target.value)}
                          className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs font-semibold text-white"
                        >
                          <option value="">-- Seleccionar Repartidor --</option>
                          {repartidores.map((rep) => (
                            <option key={rep.id_trabajador} value={rep.id_trabajador}>
                              {rep.nombre} ({rep.id_trabajador})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Financial Summary */}
                      <div className="p-3 rounded-xl bg-[#0F1115] border border-neutral-800 space-y-1 text-xs">
                        <div className="flex justify-between text-neutral-400">
                          <span>Costo Flete Domicilio:</span>
                          <span className="font-mono text-white tabular-nums">
                            {formatCOP(dom.costo_domicilio)}
                          </span>
                        </div>
                        <div className="flex justify-between text-neutral-400">
                          <span>Método de Pago:</span>
                          <span className="font-bold text-white">
                            {dom.metodo_pago} ({dom.estado_pago})
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1 border-t border-neutral-800 text-sm font-extrabold">
                          <span className="text-neutral-200">VALOR A COBRAR:</span>
                          <span className="text-base font-mono text-orange-400 tabular-nums">
                            {formatCOP(dom.total_a_cobrar)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* One-Tap Delivery State Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-800">
                      <button
                        type="button"
                        disabled={isUpdating || dom.estado_entrega === 'En Camino'}
                        onClick={() => handleUpdateEstado(dom, 'En Camino')}
                        className="min-h-[46px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>En Camino</span>
                      </button>

                      <button
                        type="button"
                        disabled={isUpdating || dom.estado_entrega === 'Entregado'}
                        onClick={() => handleUpdateEstado(dom, 'Entregado')}
                        className="min-h-[46px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Entregado</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUADRE DE DOMICILIARIOS */}
      {activeTab === 'cuadre' && (
        <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Cuadre Diario de Repartidores ({fecha})
              </h2>
              <p className="text-xs text-neutral-400">
                Liquidación de entregas realizadas, fletes ganados y efectivo a entregar en caja
              </p>
            </div>
          </div>

          {resumen.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Wallet className="w-10 h-10 text-neutral-600 mx-auto stroke-1" />
              <p className="text-sm font-bold text-white">
                Sin movimientos de liquidación para la fecha seleccionada ({fecha})
              </p>
              <p className="text-xs text-neutral-400">
                A medida que los repartidores completen domicilios, aquí verás el flete y efectivo a
                entregar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumen.map((rep, idx) => (
                <div
                  key={rep.id_domiciliario || idx}
                  className="rounded-2xl bg-[#0F1115] border border-neutral-800 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <div>
                      <div className="text-base font-extrabold text-white">
                        {rep.nombre_domiciliario}
                      </div>
                      <div className="text-xs font-mono text-neutral-400">
                        {rep.id_domiciliario}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold font-mono text-orange-400 tabular-nums">
                        {rep.total_domicilios}
                      </span>
                      <span className="block text-[10px] text-neutral-400 uppercase">
                        Domicilios
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400">Total Fletes Ganados:</span>
                      <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
                        {formatCOP(rep.total_fletes)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                      <span className="font-bold text-neutral-200">
                        Efectivo a Entregar en Caja:
                      </span>
                      <span className="text-base font-mono font-extrabold text-amber-400 tabular-nums">
                        {formatCOP(rep.efectivo_a_entregar)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
