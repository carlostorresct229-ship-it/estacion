/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Flame,
  Bike,
  Package,
  Users,
  Wallet,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { AuthUser, BusinessConfig, Factura, UserRole } from './types/pos';
import { api } from './services/api';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePWAInstall } from './hooks/usePWAInstall';
import { PinLoginView } from './components/PinLoginView';
import { DashboardView } from './components/DashboardView';
import { PosView } from './components/PosView';
import { KdsView } from './components/KdsView';
import { DomiciliosView } from './components/DomiciliosView';
import { InventarioMenuView } from './components/InventarioMenuView';
import { PersonalTurnosView } from './components/PersonalTurnosView';
import { CajaFacturacionView } from './components/CajaFacturacionView';
import { SettingsModal } from './components/SettingsModal';
import { TicketModal } from './components/TicketModal';

interface NavModule {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}

const MODULES: NavModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Inicio',
    icon: LayoutDashboard,
    allowedRoles: ['Admin'],
  },
  {
    id: 'pos',
    label: 'POS Pedidos',
    shortLabel: 'POS',
    icon: ShoppingCart,
    allowedRoles: ['Admin', 'Cajero', 'Mesero'],
  },
  {
    id: 'kds',
    label: 'Cocina (KDS)',
    shortLabel: 'Cocina',
    icon: Flame,
    allowedRoles: ['Admin', 'Cajero', 'Mesero', 'Cocinero'],
  },
  {
    id: 'domicilios',
    label: 'Domicilios',
    shortLabel: 'Envíos',
    icon: Bike,
    allowedRoles: ['Admin', 'Cajero', 'Mesero', 'Domiciliario'],
  },
  {
    id: 'inventario',
    label: 'Inventario & Menú',
    shortLabel: 'Stock',
    icon: Package,
    allowedRoles: ['Admin'],
  },
  {
    id: 'personal',
    label: 'Personal & Turnos',
    shortLabel: 'Turnos',
    icon: Users,
    allowedRoles: ['Admin'],
  },
  {
    id: 'caja',
    label: 'Caja & Facturas',
    shortLabel: 'Caja',
    icon: Wallet,
    allowedRoles: ['Admin', 'Cajero', 'Mesero'],
  },
];

export default function App() {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('eb_pos_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [activeFactura, setActiveFactura] = useState<Factura | null>(null);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const [config, setConfig] = useState<BusinessConfig>({
    NOMBRE_NEGOCIO: 'Estación Burguer',
    NIT: '900.000.000-1',
    DIRECCION: 'Calle Principal #10-20',
    WHATSAPP: '573000000000',
    PREFIJO_FACTURA: 'EB',
    PORCENTAJE_IMPUESTO: 0,
    COSTO_DOMICILIO_BASE: 4000,
  });

  const notify = useCallback((type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Verify backend connection and load business config on mount
  useEffect(() => {
    let mounted = true;
    api
      .getConfig()
      .then((remoteCfg) => {
        if (!mounted) return;
        setConfig(remoteCfg);
        setApiConnected(true);
      })
      .catch(() => {
        if (!mounted) return;
        setApiConnected(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const allowedModules = useMemo(() => {
    if (!currentUser) return [];
    return MODULES.filter((m) => m.allowedRoles.includes(currentUser.rol));
  }, [currentUser]);

  // Ensure activeTab is permitted for currentUser's role
  useEffect(() => {
    if (!currentUser) return;
    const isAllowed = allowedModules.some((m) => m.id === activeTab);
    if (!isAllowed && allowedModules.length > 0) {
      setActiveTab(allowedModules[0].id);
    }
  }, [currentUser, allowedModules, activeTab]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    sessionStorage.setItem('eb_pos_user', JSON.stringify(user));
    setApiConnected(true);

    if (user.rol === 'Admin') setActiveTab('dashboard');
    else if (user.rol === 'Cajero' || user.rol === 'Mesero') setActiveTab('pos');
    else if (user.rol === 'Cocinero') setActiveTab('kds');
    else if (user.rol === 'Domiciliario') setActiveTab('domicilios');

    notify('ok', `Bienvenido(a), ${user.nombre} (${user.rol})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('eb_pos_user');
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-white flex flex-col">
      {/* Mandatory Offline Alert Banner (Prevents fake offline saves that desync inventory) */}
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 z-50">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            SIN CONEXIÓN A INTERNET: El guardado está bloqueado temporalmente para evitar
            desincronizar el inventario en Google Sheets.
          </span>
        </div>
      )}

      {/* Non-Blocking Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-sm rounded-2xl bg-[#181B22] border border-neutral-700 shadow-2xl p-4 flex items-start gap-3">
          {toast.type === 'ok' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs font-semibold text-white leading-relaxed">{toast.msg}</div>
        </div>
      )}

      {!currentUser ? (
        <PinLoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenSettings={() => setSettingsOpen(true)}
          isOnline={isOnline}
          apiConnected={apiConnected}
          businessName={config.NOMBRE_NEGOCIO}
        />
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Desktop Left Sidebar */}
          <aside className="hidden lg:flex lg:w-64 xl:w-72 bg-[#14171E] border-r border-neutral-800 flex-col justify-between shrink-0 sticky top-0 h-screen">
            <div className="p-5 space-y-6">
              {/* Brand Lockup */}
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-800">
                <div className="w-12 h-12 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src="/assets/aistudio/image_bfb0a3cc.png"
                    alt="Estación Burguer"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-extrabold text-white truncate">
                    {config.NOMBRE_NEGOCIO}
                  </div>
                  <div className="text-xs text-orange-400 font-semibold">
                    {currentUser.nombre} · {currentUser.rol}
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="space-y-1.5">
                {allowedModules.map((mod) => {
                  const Icon = mod.icon;
                  const active = activeTab === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setActiveTab(mod.id)}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                          : 'text-neutral-400 hover:text-white hover:bg-[#181B22]'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{mod.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer Controls */}
            <div className="p-5 border-t border-neutral-800 space-y-2.5">
              {!isInstalled && isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-xs font-bold text-orange-400 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar App POS</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#181B22] hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-orange-400" />
                <span>Ajustes & Conexión API</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-xs font-bold text-red-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Turno / Salir</span>
              </button>
            </div>
          </aside>

          {/* Main Content Wrapper */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Status Header */}
            <header className="sticky top-0 z-30 bg-[#0F1115]/90 backdrop-blur-md border-b border-neutral-800 px-4 sm:px-6 py-3 pt-safe flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="lg:hidden w-9 h-9 rounded-lg bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src="/assets/aistudio/image_bfb0a3cc.png"
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="truncate">
                  <span className="text-sm sm:text-base font-extrabold text-white">
                    {config.NOMBRE_NEGOCIO}
                  </span>
                  <span className="hidden sm:inline text-xs text-neutral-400 ml-2">
                    · Operador: <strong className="text-neutral-200">{currentUser.nombre}</strong> (
                    {currentUser.rol})
                  </span>
                </div>
              </div>

              {/* Connection Indicator & Mobile Actions */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#181B22] hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  {isOnline && apiConnected !== false ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="hidden sm:inline text-neutral-300">
                    {apiConnected === false ? 'Revisar URL' : 'Apps Script Activo'}
                  </span>
                  <Settings className="w-3.5 h-3.5 text-orange-400" />
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="lg:hidden min-h-[40px] min-w-[40px] px-2.5 rounded-xl bg-red-950/50 border border-red-800/50 text-red-300 flex items-center justify-center"
                  title="Salir"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Active Module Viewport */}
            <main className="flex-1 p-4 sm:p-6 pb-28 lg:pb-8 max-w-7xl w-full mx-auto">
              {activeTab === 'dashboard' && (
                <DashboardView onNavigate={setActiveTab} onNotify={notify} />
              )}
              {activeTab === 'pos' && (
                <PosView
                  currentUser={currentUser}
                  config={config}
                  onOrderCreated={(factura) => setActiveFactura(factura)}
                  onNotify={notify}
                />
              )}
              {activeTab === 'kds' && <KdsView currentUser={currentUser} onNotify={notify} />}
              {activeTab === 'domicilios' && (
                <DomiciliosView currentUser={currentUser} onNotify={notify} />
              )}
              {activeTab === 'inventario' && (
                <InventarioMenuView currentUser={currentUser} onNotify={notify} />
              )}
              {activeTab === 'personal' && <PersonalTurnosView onNotify={notify} />}
              {activeTab === 'caja' && (
                <CajaFacturacionView
                  currentUser={currentUser}
                  onOpenTicket={(factura) => setActiveFactura(factura)}
                  onNotify={notify}
                />
              )}
            </main>

            {/* Mobile Bottom Navigation Bar (iOS Safe Area compliant) */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#14171E]/95 backdrop-blur-md border-t border-neutral-800 pb-safe">
              <div className="flex items-center justify-around px-1">
                {allowedModules.map((mod) => {
                  const Icon = mod.icon;
                  const active = activeTab === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setActiveTab(mod.id)}
                      className={`flex-1 min-h-[54px] py-1.5 flex flex-col items-center justify-center transition-colors ${
                        active ? 'text-orange-400' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold tracking-tight mt-0.5 truncate max-w-[64px]">
                        {mod.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Settings & Connection Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onConfigUpdated={(newCfg) => setConfig(newCfg)}
        canEditBusinessConfig={currentUser?.rol === 'Admin'}
        onConnectionTested={(ok) => setApiConnected(ok)}
      />

      {/* 80mm Thermal POS Ticket Modal */}
      <TicketModal
        factura={activeFactura}
        config={config}
        onClose={() => setActiveFactura(null)}
      />
    </div>
  );
}
