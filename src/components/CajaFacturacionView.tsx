import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  Receipt,
  Printer,
  MessageCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  AuthUser,
  CajaData,
  Factura,
  MetodoPago,
  Pedido,
} from '../types/pos';
import {
  api,
  formatCOP,
  getTodayDateString,
  normalizeFactura,
} from '../services/api';

interface CajaFacturacionViewProps {
  currentUser: AuthUser;
  onOpenTicket: (factura: Factura) => void;
  onNotify: (type: 'ok' | 'err', msg: string) => void;
}

type QuickCajaAction =
  | 'Apertura Caja'
  | 'Gasto Operativo'
  | 'Pago Nómina'
  | 'Compra Insumos'
  | 'Retiro';

const METODOS_PAGO: MetodoPago[] = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta'];

export const CajaFacturacionView: React.FC<CajaFacturacionViewProps> = ({
  currentUser,
  onOpenTicket,
  onNotify,
}) => {
  const [fecha, setFecha] = useState<string>(getTodayDateString());
  const [caja, setCaja] = useState<CajaData | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFacturaId, setLoadingFacturaId] = useState<string | null>(null);

  // Modal registrar movimiento de caja
  const [movModalOpen, setMovModalOpen] = useState<boolean>(false);
  const [savingMov, setSavingMov] = useState<boolean>(false);
  const [movForm, setMovForm] = useState<{
    tipo: QuickCajaAction;
    metodo_pago: MetodoPago;
    monto: number;
    descripcion: string;
  }>({
    tipo: 'Apertura Caja',
    metodo_pago: 'Efectivo',
    monto: 100000,
    descripcion: 'Base inicial de caja',
  });

  const loadCajaAndInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const [cajaRes, pedidosRes] = await Promise.all([
        api.getCaja(fecha),
        api.getPedidos({ fecha }),
      ]);
      setCaja(cajaRes);
      if (pedidosRes.length === 0) {
        const allPedidos = await api.getPedidos({});
        setPedidos(allPedidos);
      } else {
        setPedidos(pedidosRes);
      }
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al cargar caja y facturación');
    } finally {
      setLoading(false);
    }
  }, [fecha, onNotify]);

  useEffect(() => {
    loadCajaAndInvoices();
  }, [loadCajaAndInvoices]);

  const openQuickAction = (tipo: QuickCajaAction, defaultDesc: string, defaultMonto = 50000) => {
    setMovForm({
      tipo,
      metodo_pago: 'Efectivo',
      monto: defaultMonto,
      descripcion: defaultDesc,
    });
    setMovModalOpen(true);
  };

  const handleSaveMovimientoCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMov(true);
    try {
      await api.registrarMovimientoCaja({
        tipo: movForm.tipo,
        metodo_pago: movForm.metodo_pago,
        monto: Number(movForm.monto),
        descripcion: movForm.descripcion,
        responsable: currentUser.nombre,
      });
      onNotify('ok', `Movimiento "${movForm.tipo}" registrado en Caja`);
      setMovModalOpen(false);
      await loadCajaAndInvoices();
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al registrar movimiento de caja');
    } finally {
      setSavingMov(false);
    }
  };

  const handleOpenInvoiceTicket = async (pedido: Pedido) => {
    setLoadingFacturaId(pedido.id_pedido);
    try {
      const factura = await api.getFactura(pedido.id_pedido, pedido);
      onOpenTicket(factura);
    } catch {
      // Fallback local construction from pedido row if getFactura fails
      const fallback = normalizeFactura(pedido, pedido);
      onOpenTicket(fallback);
    } finally {
      setLoadingFacturaId(null);
    }
  };

  const handleMarkAsPaid = async (pedido: Pedido) => {
    setLoadingFacturaId(pedido.id_pedido);
    try {
      await api.actualizarPedido({
        id_pedido: pedido.id_pedido,
        estado_pago: 'Pagado',
        responsable: currentUser.nombre,
      });
      onNotify('ok', `Factura ${pedido.numero_factura} marcada como Pagada`);
      await loadCajaAndInvoices();
    } catch (err: any) {
      onNotify('err', err?.message || 'No se pudo actualizar el pago');
    } finally {
      setLoadingFacturaId(null);
    }
  };

  const resumen = caja?.resumen || {
    apertura: 0,
    ingresos: 0,
    egresos: 0,
    saldo_esperado: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Cash Buttons */}
      <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Arqueo de Caja Diario y Facturación POS
            </h1>
            <p className="text-xs text-neutral-400">
              Apertura + Ventas - Gastos = Saldo Esperado · Reimpresión de tickets 80mm y envío por
              WhatsApp
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-xs font-mono text-white"
            />
            <button
              type="button"
              onClick={loadCajaAndInvoices}
              disabled={loading}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* 4 Quick Cash Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <button
            type="button"
            onClick={() => openQuickAction('Apertura Caja', 'Base inicial de apertura de caja', 100000)}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowUpCircle className="w-4 h-4 shrink-0" />
            <span>Abrir Caja</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickAction('Gasto Operativo', 'Gasto operativo del turno', 25000)}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4 shrink-0" />
            <span>Registrar Gasto</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickAction('Pago Nómina', 'Pago de turno / nómina diaria', 55000)}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4 shrink-0" />
            <span>Pago Nómina</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickAction('Compra Insumos', 'Compra de insumos urgentes', 45000)}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4 shrink-0" />
            <span>Compra Insumos</span>
          </button>
        </div>
      </div>

      {/* Arqueo Formula Cards: Apertura + Ventas - Gastos = Saldo Esperado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5">
          <span className="text-xs text-neutral-400">1. Apertura de Caja</span>
          <div className="text-2xl font-extrabold font-mono text-white mt-2 tabular-nums">
            {formatCOP(resumen.apertura)}
          </div>
        </div>
        <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5">
          <span className="text-xs text-neutral-400">2. (+) Ventas e Ingresos</span>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2 tabular-nums">
            + {formatCOP(resumen.ingresos)}
          </div>
        </div>
        <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5">
          <span className="text-xs text-neutral-400">3. (-) Gastos y Egresos</span>
          <div className="text-2xl font-extrabold font-mono text-red-400 mt-2 tabular-nums">
            - {formatCOP(resumen.egresos)}
          </div>
        </div>
        <div className="rounded-2xl bg-[#181B22] border-2 border-orange-500/50 p-5">
          <span className="text-xs font-bold text-orange-400">4. (=) SALDO ESPERADO EN CAJA</span>
          <div className="text-2xl font-extrabold font-mono text-white mt-2 tabular-nums">
            {formatCOP(resumen.saldo_esperado)}
          </div>
        </div>
      </div>

      {/* Split Grid: Invoices of the Day + Cash Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Invoices List (Reprint & WhatsApp) */}
        <div className="lg:col-span-7 rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-extrabold text-white">
                Facturas y Pedidos Registrados ({pedidos.length})
              </h2>
            </div>
          </div>

          {pedidos.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              No hay facturas registradas en esta fecha.
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {pedidos.map((ped) => {
                const isBusy = loadingFacturaId === ped.id_pedido;
                const localFact = normalizeFactura(ped, ped);

                return (
                  <div
                    key={ped.id_pedido}
                    className="rounded-xl bg-[#0F1115] border border-neutral-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold font-mono text-white">
                          #{ped.numero_factura}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {ped.fecha} {ped.hora ? `· ${ped.hora}` : ''}
                        </span>
                        <span className="text-xs font-bold text-orange-400">
                          · {ped.tipo_pedido}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-300">
                        Cliente: <strong>{ped.cliente_nombre}</strong> · Pago:{' '}
                        <strong>{ped.metodo_pago}</strong> (
                        <span
                          className={
                            ped.estado_pago === 'Pagado'
                              ? 'text-emerald-400 font-bold'
                              : 'text-amber-400 font-bold'
                          }
                        >
                          {ped.estado_pago}
                        </span>
                        )
                      </div>
                      <div className="text-base font-extrabold font-mono text-white tabular-nums">
                        {formatCOP(ped.total)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ped.estado_pago === 'Pendiente' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleMarkAsPaid(ped)}
                          className="min-h-[42px] px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Marcar Pagado</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleOpenInvoiceTicket(ped)}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isBusy ? 'Abriendo...' : 'Ticket 80mm'}</span>
                      </button>

                      {localFact.whatsapp_url && (
                        <a
                          href={localFact.whatsapp_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cash Movements History */}
        <div className="lg:col-span-5 rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-extrabold text-white">
                Movimientos de Caja ({caja?.movimientos.length || 0})
              </h2>
            </div>
          </div>

          {!caja?.movimientos || caja.movimientos.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Sin movimientos manuales registrados hoy. Usa los botones superiores para abrir caja o
              registrar gastos.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {caja.movimientos.map((mov, idx) => {
                const isIngreso =
                  mov.tipo.includes('Apertura') || mov.tipo.includes('Ingreso');
                return (
                  <div
                    key={mov.id_movimiento || idx}
                    className="p-3.5 rounded-xl bg-[#0F1115] border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{mov.tipo}</div>
                      <div className="text-neutral-400">{mov.descripcion}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">
                        {mov.metodo_pago} · Resp: {mov.responsable}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-extrabold font-mono tabular-nums shrink-0 ${
                        isIngreso ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isIngreso ? '+' : '-'} {formatCOP(mov.monto)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Registrar Movimiento de Caja */}
      {movModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#181B22] border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#0F1115] border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                Registrar Movimiento · {movForm.tipo}
              </h3>
              <button
                onClick={() => setMovModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovimientoCaja} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Tipo de Movimiento</label>
                <select
                  value={movForm.tipo}
                  onChange={(e) =>
                    setMovForm({ ...movForm, tipo: e.target.value as QuickCajaAction })
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                >
                  <option value="Apertura Caja">Apertura Caja</option>
                  <option value="Gasto Operativo">Gasto Operativo</option>
                  <option value="Compra Insumos">Compra Insumos</option>
                  <option value="Pago Nómina">Pago Nómina</option>
                  <option value="Retiro">Retiro de Caja</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Método de Pago</label>
                <select
                  value={movForm.metodo_pago}
                  onChange={(e) =>
                    setMovForm({ ...movForm, metodo_pago: e.target.value as MetodoPago })
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                >
                  {METODOS_PAGO.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Monto (COP)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movForm.monto}
                  onChange={(e) => setMovForm({ ...movForm, monto: Number(e.target.value) })}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Descripción / Concepto</label>
                <input
                  type="text"
                  required
                  value={movForm.descripcion}
                  onChange={(e) => setMovForm({ ...movForm, descripcion: e.target.value })}
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
                  disabled={savingMov}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white cursor-pointer"
                >
                  {savingMov ? 'Guardando...' : 'Confirmar en Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
