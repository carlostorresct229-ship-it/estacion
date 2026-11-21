import React, { useState } from 'react';
import {
  Delete,
  LogIn,
  Settings,
  ShieldCheck,
  Utensils,
  Bike,
  CreditCard,
  AlertCircle,
  Download,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AuthUser } from '../types/pos';
import { api } from '../services/api';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PinLoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  onOpenSettings: () => void;
  isOnline: boolean;
  apiConnected: boolean | null;
  businessName: string;
}

const DEMO_ROLES = [
  { label: 'Admin', pin: '1234', icon: ShieldCheck, color: 'text-orange-400 border-orange-500/30' },
  { label: 'Cajero', pin: '2222', icon: CreditCard, color: 'text-amber-400 border-amber-500/30' },
  { label: 'Cocinero', pin: '3333', icon: Utensils, color: 'text-emerald-400 border-emerald-500/30' },
  { label: 'Domiciliario', pin: '4444', icon: Bike, color: 'text-sky-400 border-sky-500/30' },
];

export const PinLoginView: React.FC<PinLoginViewProps> = ({
  onLoginSuccess,
  onOpenSettings,
  isOnline,
  apiConnected,
  businessName,
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4 && !loading) {
      const next = pin + digit;
      setPin(next);
      setError(null);
      if (next.length === 4) {
        submitPin(next);
      }
    }
  };

  const handleBackspace = () => {
    if (!loading) {
      setPin((prev) => prev.slice(0, -1));
      setError(null);
    }
  };

  const handleClear = () => {
    if (!loading) {
      setPin('');
      setError(null);
    }
  };

  const submitPin = async (pinToSubmit: string) => {
    if (pinToSubmit.length !== 4) {
      setError('Ingresa un PIN de 4 dígitos');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(pinToSubmit);
      onLoginSuccess(res.usuario);
    } catch (err: any) {
      setError(err?.message || 'PIN incorrecto o error de conexión con Apps Script');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-white flex flex-col justify-between p-4 sm:p-6 pt-safe pb-safe">
      {/* Top Status & Settings Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Wifi className="w-4 h-4" />
              <span>Red Activa</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-red-400 font-medium">
              <WifiOff className="w-4 h-4" />
              <span>Sin Internet</span>
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span>
            Backend Apps Script:{' '}
            <strong
              className={
                apiConnected === true
                  ? 'text-emerald-400'
                  : apiConnected === false
                  ? 'text-red-400'
                  : 'text-amber-400'
              }
            >
              {apiConnected === true
                ? 'Conectado'
                : apiConnected === false
                ? 'Revisar URL'
                : 'Listo'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-orange-400 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Instalar App POS</span>
            </button>
          )}
          {!isInstalled && !isInstallable && isIOS && (
            <button
              onClick={() => setShowIOSHelp(!showIOSHelp)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-orange-400 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Instalar en iPhone/iPad</span>
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#181B22] hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-orange-400" />
            <span>URL Apps Script</span>
          </button>
        </div>
      </header>

      {showIOSHelp && (
        <div className="max-w-md mx-auto mt-2 p-3.5 rounded-xl bg-[#181B22] border border-orange-500/40 text-xs text-neutral-300">
          Para instalar en iPhone o iPad: toca el botón <strong>Compartir</strong> en Safari y
          selecciona <strong>Agregar a Inicio</strong>.
        </div>
      )}

      {/* Main Centered Login Card */}
      <main className="w-full max-w-4xl mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Brand Column */}
        <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left space-y-5">
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-white p-3 shadow-2xl border-2 border-orange-500/40 flex items-center justify-center overflow-hidden">
            <img
              src="/assets/aistudio/image_bfb0a3cc.png"
              alt="Logo Estación Burguer"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {businessName || 'Estación Burguer'}
            </h1>
            <p className="text-sm text-neutral-400 max-w-sm">
              Terminal POS, Pantalla de Cocina (KDS), Control de Domicilios, Inventario y Arqueo en
              tiempo real.
            </p>
          </div>

          {/* Quick Demo Role Buttons */}
          <div className="w-full pt-2">
            <p className="text-xs font-semibold text-neutral-400 mb-2.5">
              Acceso rápido por Rol (PINs configurados en Sheets):
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {DEMO_ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.pin}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setPin(role.pin);
                      submitPin(role.pin);
                    }}
                    className={`min-h-[48px] px-3 py-2.5 rounded-xl bg-[#181B22] hover:bg-neutral-800 border ${role.color} flex items-center justify-between text-left transition-colors cursor-pointer`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold text-white">{role.label}</span>
                    </div>
                    <span className="text-xs font-mono text-neutral-400">{role.pin}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Numeric Keypad Column */}
        <div className="lg:col-span-7">
          <div className="w-full max-w-md mx-auto rounded-3xl bg-[#181B22] border border-neutral-800 p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-white">Ingresa tu PIN de Operador</h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Código de 4 dígitos asignado a tu turno
              </p>
            </div>

            {/* 4-Digit PIN Display */}
            <div className="flex justify-center gap-4 mb-6">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-mono font-bold transition-all ${
                      filled
                        ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                        : 'border-neutral-700 bg-[#0F1115] text-neutral-600'
                    }`}
                  >
                    {filled ? '•' : ''}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Touch Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={loading}
                  onClick={() => handleDigit(digit)}
                  className="min-h-[60px] rounded-2xl bg-[#0F1115] hover:bg-neutral-800 active:scale-[0.97] border border-neutral-800 text-2xl font-mono font-bold text-white transition-all cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                disabled={loading}
                onClick={handleClear}
                className="min-h-[60px] rounded-2xl bg-[#0F1115] hover:bg-neutral-800 active:scale-[0.97] border border-neutral-800 text-xs font-bold text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                LIMPIAR
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDigit('0')}
                className="min-h-[60px] rounded-2xl bg-[#0F1115] hover:bg-neutral-800 active:scale-[0.97] border border-neutral-800 text-2xl font-mono font-bold text-white transition-all cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleBackspace}
                className="min-h-[60px] rounded-2xl bg-[#0F1115] hover:bg-neutral-800 active:scale-[0.97] border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer"
                aria-label="Borrar dígito"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            <button
              type="button"
              disabled={loading || pin.length !== 4}
              onClick={() => submitPin(pin)}
              className="mt-5 w-full min-h-[54px] rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>{loading ? 'Validando PIN en Apps Script...' : 'Entrar al Sistema POS'}</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-neutral-500">
        Estación Burguer · Sistema POS & KDS conectado en tiempo real a Google Sheets
      </footer>
    </div>
  );
};
