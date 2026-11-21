import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Clock,
  UserPlus,
  Edit3,
  LogIn,
  RefreshCw,
  Phone,
  X,
  Save,
} from 'lucide-react';
import { Trabajador, Turno, UserRole } from '../types/pos';
import { api, formatCOP } from '../services/api';

interface PersonalTurnosViewProps {
  onNotify: (type: 'ok' | 'err', msg: string) => void;
}

const ROLES: UserRole[] = ['Admin', 'Cajero', 'Cocinero', 'Mesero', 'Domiciliario'];

export const PersonalTurnosView: React.FC<PersonalTurnosViewProps> = ({ onNotify }) => {
  const [totalActivos, setTotalActivos] = useState<number>(0);
  const [porRol, setPorRol] = useState<Record<string, number>>({});
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [clockingId, setClockingId] = useState<string | null>(null);

  // Worker Form Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<{
    id_trabajador?: string;
    nombre: string;
    documento: string;
    rol: UserRole;
    pin: string;
    telefono: string;
    salario_dia: number;
    estado: 'Activo' | 'Inactivo';
  }>({
    nombre: '',
    documento: '',
    rol: 'Cajero',
    pin: '',
    telefono: '',
    salario_dia: 55000,
    estado: 'Activo',
  });

  const loadPersonalData = useCallback(async () => {
    setLoading(true);
    try {
      const [trabRes, turnosRes] = await Promise.all([
        api.getTrabajadores(),
        api.getTurnos().catch(() => []),
      ]);
      setTotalActivos(trabRes.total_activos);
      setPorRol(trabRes.por_rol);
      setTrabajadores(trabRes.data);
      setTurnos(turnosRes);
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al cargar trabajadores y turnos');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadPersonalData();
  }, [loadPersonalData]);

  const handleClockShift = async (trab: Trabajador) => {
    setClockingId(trab.id_trabajador);
    try {
      const res: any = await api.registrarTurno(trab.id_trabajador);
      onNotify(
        'ok',
        res?.mensaje ||
          res?.message ||
          `Entrada / Salida registrada para ${trab.nombre}`
      );
      await loadPersonalData();
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al registrar turno');
    } finally {
      setClockingId(null);
    }
  };

  const openNewWorker = () => {
    setForm({
      id_trabajador: undefined,
      nombre: '',
      documento: '',
      rol: 'Cajero',
      pin: '',
      telefono: '',
      salario_dia: 55000,
      estado: 'Activo',
    });
    setModalOpen(true);
  };

  const openEditWorker = (t: Trabajador) => {
    setForm({
      id_trabajador: t.id_trabajador,
      nombre: t.nombre,
      documento: t.documento,
      rol: t.rol,
      pin: t.pin,
      telefono: t.telefono,
      salario_dia: t.salario_dia,
      estado: t.estado,
    });
    setModalOpen(true);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.pin.length < 4) {
      onNotify('err', 'El PIN debe tener 4 dígitos');
      return;
    }
    setSaving(true);
    try {
      await api.guardarTrabajador(form);
      onNotify('ok', `Trabajador "${form.nombre}" guardado correctamente`);
      setModalOpen(false);
      await loadPersonalData();
    } catch (err: any) {
      onNotify('err', err?.message || 'Error al guardar trabajador');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Role Summary */}
      <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Personal, Nómina Diaria y Control de Turnos
            </h1>
            <p className="text-xs text-neutral-400">
              Marcación automática de Entrada / Salida y gestión de operadores por PIN
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openNewWorker}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Trabajador</span>
            </button>
            <button
              type="button"
              onClick={loadPersonalData}
              disabled={loading}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Role Breakdown Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#0F1115] border border-orange-500/40">
            <span className="block text-[11px] text-neutral-400">Total Activos</span>
            <span className="text-2xl font-extrabold font-mono text-orange-400 tabular-nums">
              {totalActivos}
            </span>
          </div>
          {ROLES.map((rol) => (
            <div key={rol} className="p-3.5 rounded-xl bg-[#0F1115] border border-neutral-800">
              <span className="block text-[11px] text-neutral-400">{rol}s</span>
              <span className="text-xl font-bold font-mono text-white tabular-nums">
                {porRol[rol] ?? trabajadores.filter((t) => t.rol === rol && t.estado === 'Activo').length}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Cards with Big Clock-In/Out Button */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {trabajadores.map((trab) => {
          const isClocking = clockingId === trab.id_trabajador;
          const activeTurno = turnos.find(
            (tu) => tu.id_trabajador === trab.id_trabajador && !tu.hora_salida
          );

          return (
            <div
              key={trab.id_trabajador}
              className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono text-neutral-400">
                      {trab.id_trabajador} · Doc: {trab.documento}
                    </span>
                    <h3 className="text-base font-extrabold text-white">{trab.nombre}</h3>
                  </div>
                  <span
                    className={`text-xs font-extrabold uppercase ${
                      trab.estado === 'Activo' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {trab.rol} · {trab.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#0F1115] border border-neutral-800">
                    <span className="block text-[10px] text-neutral-400">Salario Día</span>
                    <span className="text-sm font-bold font-mono text-orange-400 tabular-nums">
                      {formatCOP(trab.salario_dia)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0F1115] border border-neutral-800">
                    <span className="block text-[10px] text-neutral-400">PIN Acceso</span>
                    <span className="text-sm font-bold font-mono text-white">
                      {trab.pin || '••••'}
                    </span>
                  </div>
                </div>

                {trab.telefono && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="font-mono">{trab.telefono}</span>
                  </div>
                )}

                {activeTurno && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-xs text-emerald-300 font-semibold">
                    En turno activo desde las {activeTurno.hora_entrada}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  disabled={isClocking}
                  onClick={() => handleClockShift(trab)}
                  className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    activeTurno
                      ? 'bg-amber-500 hover:bg-amber-600 text-black'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  } disabled:opacity-50`}
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {isClocking
                      ? 'Registrando...'
                      : activeTurno
                      ? 'Marcar Salida de Turno'
                      : 'Marcar Entrada / Salida'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditWorker(trab)}
                  className="min-h-[48px] min-w-[48px] rounded-xl bg-[#0F1115] hover:bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 cursor-pointer"
                  title="Editar Trabajador"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shift History Table */}
      <div className="rounded-2xl bg-[#181B22] border border-neutral-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-400" />
          <h2 className="text-base font-extrabold text-white">
            Historial de Turnos y Horas Trabajadas ({turnos.length})
          </h2>
        </div>

        {turnos.length === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-400">
            No hay turnos registrados todavía. Usa el botón "Marcar Entrada / Salida" en cada
            empleado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-[11px] text-neutral-400">
                  <th className="py-2.5 pr-3">ID Turno</th>
                  <th className="py-2.5 px-3">Trabajador</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Hora Entrada</th>
                  <th className="py-2.5 px-3">Hora Salida</th>
                  <th className="py-2.5 px-3 text-right">Horas Trabajadas</th>
                  <th className="py-2.5 pl-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-xs">
                {turnos.map((tu, idx) => (
                  <tr key={tu.id_turno || idx} className="hover:bg-neutral-800/30">
                    <td className="py-3 pr-3 font-mono text-neutral-400">{tu.id_turno}</td>
                    <td className="py-3 px-3 font-bold text-white">
                      {tu.nombre_trabajador || tu.id_trabajador}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-300">{tu.fecha}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">{tu.hora_entrada}</td>
                    <td className="py-3 px-3 font-mono text-amber-400">
                      {tu.hora_salida || '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white tabular-nums">
                      {tu.horas_trabajadas || 'En curso'}
                    </td>
                    <td className="py-3 pl-3 text-right font-bold text-neutral-200">
                      {tu.estado}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Worker Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#181B22] border border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-[#0F1115] border-b border-neutral-800">
              <h3 className="text-base font-bold text-white">
                {form.id_trabajador
                  ? `Editar Trabajador ${form.id_trabajador}`
                  : 'Registrar Nuevo Trabajador'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-400 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Cédula / Documento</label>
                  <input
                    type="text"
                    required
                    value={form.documento}
                    onChange={(e) => setForm({ ...form, documento: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Rol en el Sistema</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value as UserRole })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    PIN de Acceso (4 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={form.pin}
                    onChange={(e) =>
                      setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Teléfono / Celular</label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Salario Día (COP)</label>
                  <input
                    type="number"
                    required
                    value={form.salario_dia}
                    onChange={(e) => setForm({ ...form, salario_dia: Number(e.target.value) })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Estado</label>
                  <select
                    value={form.estado}
                    onChange={(e) =>
                      setForm({ ...form, estado: e.target.value as 'Activo' | 'Inactivo' })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                  <span>{saving ? 'Guardando...' : 'Guardar Trabajador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
