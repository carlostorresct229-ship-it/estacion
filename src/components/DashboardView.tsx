import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  TrendingUp,
  Wallet,
  ShoppingBag,
  Bike,
  Users,
  AlertTriangle,
  Calendar,
  RefreshCw,
  ArrowRight,
  CreditCard,
  Clock,
} from 'lucide-react';
import { DashboardData } from '../types/pos';
import { api, formatCOP, getTodayDateString } from '../services/api';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
  onNotify: (type: 'ok' | 'err', msg: string) => void;
}

const PAYMENT_METHODS = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta'];

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onNotify }) => {
  const [fecha, setFecha] = useState<string>(getTodayDateString());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPulse = useCallback(() => {
    setIsPulsing(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setIsPulsing(false);
    }, 900);
  }, []);

  const loadDashboard = useCallback(
    async (targetDate: string, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await api.getDashboard(targetDate);
        setData(res);
        setLastUpdated(
          new Date().toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        triggerPulse();
      } catch (err: any) {
        if (!silent) {
          onNotify('err', err?.message || 'Error al cargar el Dashboard ejecutivo');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [onNotify, triggerPulse]
  );

  useEffect(() => {
    loadDashboard(fecha);
  }, [fecha, loadDashboard]);

  // Actualización automática cada 60 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    const intervalId = setInterval(() => {
      loadDashboard(fecha, true);
    }, 60000);
    return () => clearInterval(intervalId);
  }, [autoRefresh, fecha, loadDashboard]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const kpis = data?.kpis || {
    ventas_totales: 0,
    ventas_pagadas: 0,
    gastos_hoy: 0,
    flujo_neto_caja: 0,
    total_pedidos: 0,
    pedidos_pendientes_cocina: 0,
    total_domicilios: 0,
    domicilios_entregados: 0,
    domicilios_en_camino: 0,
    total_trabajadores_activos: 0,
    trabajadores_en_turno: 0,
    alertas_stock_bajo: 0,
  };

  const desglose = data?.desglose_pagos || {};
  const totalPagos = Object.values(desglose).reduce((acc, v) => acc + (Number(v) || 0), 0);

  const kpiPulseClasses = isPulsing
    ? 'ring-1 ring-orange-500/45 bg-[#1E232D] scale-[1.008]'
    : 'bg-[#181B22] scale-100';

  const valuePulseClasses = isPulsing ? 'opacity-80 scale-[1.02]' : 'opacity-100 scale-100';

  return (
    <div className="space-y-6">
      {/* Header & Date Picker */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#181B22] border border-neutral-800 rounded-2xl p-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Dashboard Ejecutivo · Estación Burguer
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400">
            Métricas financieras, operativas y alertas de inventario en tiempo real
            {lastUpdated && (
              <span className="ml-2 font-mono text-xs text-neutral-500">
                · Última sinc: {lastUpdated}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              autoRefresh
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                : 'bg-[#0F1115] border-neutral-700 text-neutral-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Auto 60s: {autoRefresh ? 'ACTIVO' : 'PAUSADO'}</span>
          </button>

          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-orange-400 absolute left-3.5 pointer-events-none" />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            onClick={() => loadDashboard(fecha)}
            disabled={loading}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Ventas del día */}
        <div
          className={`rounded-2xl border border-neutral-800 p-5 flex flex-col justify-between transition-all duration-500 ease-out ${kpiPulseClasses}`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Ventas del Día ({fecha})</span>
            <TrendingUp className="w-4 h-4 text-orange-400" />
          </div>
          <div className="my-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white transition-all duration-500 origin-left ${valuePulseClasses}`}
            >
              {formatCOP(kpis.ventas_totales)}
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Pagadas:{' '}
              <span className="text-emerald-400 font-mono font-semibold">
                {formatCOP(kpis.ventas_pagadas)}
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('pos')}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 self-start cursor-pointer"
          >
            <span>Ir a Toma de Pedidos POS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI 2: Flujo Neto en Caja */}
        <div
          className={`rounded-2xl border border-neutral-800 p-5 flex flex-col justify-between transition-all duration-500 ease-out ${kpiPulseClasses}`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Flujo Neto en Caja</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-400 transition-all duration-500 origin-left ${valuePulseClasses}`}
            >
              {formatCOP(kpis.flujo_neto_caja)}
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Gastos registrados hoy:{' '}
              <span className="text-red-400 font-mono font-semibold">
                {formatCOP(kpis.gastos_hoy)}
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('caja')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start cursor-pointer"
          >
            <span>Abrir Arqueo de Caja</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI 3: Total Pedidos & Cocina */}
        <div
          className={`rounded-2xl border border-neutral-800 p-5 flex flex-col justify-between transition-all duration-500 ease-out ${kpiPulseClasses}`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Pedidos & Cocina (KDS)</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white transition-all duration-500 origin-left ${valuePulseClasses}`}
            >
              {kpis.total_pedidos} pedidos
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              En cocina pendientes:{' '}
              <span className="text-amber-400 font-mono font-semibold">
                {kpis.pedidos_pendientes_cocina}
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('kds')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 self-start cursor-pointer"
          >
            <span>Ver Pantalla de Cocina KDS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI 4: Domicilios */}
        <div
          className={`rounded-2xl border border-neutral-800 p-5 flex flex-col justify-between transition-all duration-500 ease-out ${kpiPulseClasses}`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Domicilios del Día</span>
            <Bike className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white transition-all duration-500 origin-left ${valuePulseClasses}`}
            >
              {kpis.total_domicilios} envíos
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Entregados:{' '}
              <span className="text-emerald-400 font-mono font-semibold">
                {kpis.domicilios_entregados}
              </span>{' '}
              · En camino:{' '}
              <span className="text-amber-400 font-mono font-semibold">
                {kpis.domicilios_en_camino}
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('domicilios')}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 self-start cursor-pointer"
          >
            <span>Gestionar Domicilios y Cuadre</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI 5: Trabajadores Activos y en Turno */}
        <div
          className={`rounded-2xl border border-neutral-800 p-5 flex flex-col justify-between transition-all duration-500 ease-out ${kpiPulseClasses}`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Personal & Turnos</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white transition-all duration-500 origin-left ${valuePulseClasses}`}
            >
              {kpis.trabajadores_en_turno} en turno
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              De{' '}
              <span className="text-white font-mono font-semibold">
                {kpis.total_trabajadores_activos}
              </span>{' '}
              trabajadores activos
            </div>
          </div>
          <button
            onClick={() => onNavigate('personal')}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 self-start cursor-pointer"
          >
            <span>Controlar Entrada / Salida</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI 6: Alertas de Stock Crítico */}
        <div
          className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-500 ease-out ${
            kpis.alertas_stock_bajo > 0
              ? isPulsing
                ? 'bg-red-950/40 border-red-500 ring-1 ring-red-500/40 scale-[1.008]'
                : 'bg-red-950/25 border-red-700/60 scale-100'
              : `border-neutral-800 ${kpiPulseClasses}`
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs font-medium">
            <span>Alertas de Stock Crítico</span>
            <AlertTriangle
              className={`w-4 h-4 ${
                kpis.alertas_stock_bajo > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            />
          </div>
          <div className="my-3">
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums transition-all duration-500 origin-left ${valuePulseClasses} ${
                kpis.alertas_stock_bajo > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {kpis.alertas_stock_bajo} insumos
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              {kpis.alertas_stock_bajo > 0
                ? 'Requieren reposición inmediata'
                : 'Todo el inventario sobre el stock mínimo'}
            </div>
          </div>
          <button
            onClick={() => onNavigate('inventario')}
            className="text-xs font-semibold text-orange-400 hover:text-orange-300 flex items-center gap-1 self-start cursor-pointer"
          >
            <span>Ver Inventario y Kardex</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Split: Desglose de Pagos + Insumos Críticos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Method Breakdown */}
        <div className="lg:col-span-5 rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-bold text-white">Desglose por Método de Pago</h2>
            </div>
            <span className="text-xs font-mono text-neutral-400">
              Total: {formatCOP(totalPagos)}
            </span>
          </div>

          <div className="space-y-3.5">
            {PAYMENT_METHODS.map((metodo) => {
              const valor = Number(desglose[metodo] ?? 0);
              const pct = totalPagos > 0 ? Math.round((valor / totalPagos) * 100) : 0;
              return (
                <div key={metodo} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-200">{metodo}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="text-neutral-400">{pct}%</span>
                      <span className="text-white font-bold">{formatCOP(valor)}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0F1115] overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical Stock List */}
        <div className="lg:col-span-7 rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">
                Insumos en Stock Crítico ({data?.insumos_criticos.length || 0})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('inventario')}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300 cursor-pointer"
            >
              Registrar Entrada →
            </button>
          </div>

          {!data?.insumos_criticos || data.insumos_criticos.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-sm font-semibold text-emerald-400">
                Sin alertas de stock crítico en este momento
              </p>
              <p className="text-xs text-neutral-400">
                Todos los insumos de cocina y bebidas superan el nivel mínimo configurado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 text-[11px] text-neutral-400">
                    <th className="py-2.5 pr-3 font-semibold">Insumo</th>
                    <th className="py-2.5 px-3 font-semibold">Categoría</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Stock Actual</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Mínimo</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-xs">
                  {data.insumos_criticos.map((ins) => (
                    <tr key={ins.id_insumo} className="hover:bg-red-950/20">
                      <td className="py-3 pr-3 font-semibold text-white">
                        {ins.nombre}
                        <span className="block text-[10px] font-mono text-neutral-400">
                          {ins.id_insumo}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-neutral-300">{ins.categoria}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-red-400 tabular-nums">
                        {ins.stock_actual} {ins.unidad}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-neutral-400 tabular-nums">
                        {ins.stock_minimo} {ins.unidad}
                      </td>
                      <td className="py-3 pl-3 text-right font-bold text-amber-400">
                        CRÍTICO
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
