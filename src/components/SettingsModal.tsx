import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Link2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { BusinessConfig } from '../types/pos';
import {
  api,
  API_KEY,
  DEFAULT_API_URL,
  getStoredApiUrl,
  setStoredApiUrl,
} from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BusinessConfig;
  onConfigUpdated: (newConfig: BusinessConfig) => void;
  canEditBusinessConfig: boolean;
  onConnectionTested: (ok: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
  canEditBusinessConfig,
  onConnectionTested,
}) => {
  const [apiUrl, setApiUrl] = useState(getStoredApiUrl());
  const [formConfig, setFormConfig] = useState<BusinessConfig>(config);
  const [testing, setTesting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiUrl(getStoredApiUrl());
      setFormConfig(config);
      setFeedback(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSaveUrlAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setFeedback(null);
    try {
      setStoredApiUrl(apiUrl);
      const remoteConfig = await api.getConfig();
      onConfigUpdated(remoteConfig);
      setFormConfig(remoteConfig);
      onConnectionTested(true);
      setFeedback({
        type: 'ok',
        msg: `Conexión exitosa con "${remoteConfig.NOMBRE_NEGOCIO}" en Google Apps Script.`,
      });
    } catch (err: any) {
      onConnectionTested(false);
      setFeedback({
        type: 'err',
        msg: err?.message || 'No se pudo conectar con la URL de Google Apps Script.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResetDefaultUrl = () => {
    setApiUrl(DEFAULT_API_URL);
    setStoredApiUrl(DEFAULT_API_URL);
    setFeedback({
      type: 'ok',
      msg: 'URL restaurada al endpoint oficial de Estación Burguer.',
    });
  };

  const handleSaveBusinessConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setFeedback(null);
    try {
      await api.updateConfig({
        NOMBRE_NEGOCIO: formConfig.NOMBRE_NEGOCIO,
        NIT: formConfig.NIT,
        DIRECCION: formConfig.DIRECCION,
        WHATSAPP: formConfig.WHATSAPP,
        PREFIJO_FACTURA: formConfig.PREFIJO_FACTURA,
        PORCENTAJE_IMPUESTO: Number(formConfig.PORCENTAJE_IMPUESTO) || 0,
        COSTO_DOMICILIO_BASE: Number(formConfig.COSTO_DOMICILIO_BASE) || 0,
      });
      onConfigUpdated(formConfig);
      setFeedback({
        type: 'ok',
        msg: 'Parámetros del restaurante actualizados en Google Sheets.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'err',
        msg: err?.message || 'Error al guardar la configuración del negocio.',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#181B22] border border-neutral-800 shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#0F1115]">
          <div>
            <h2 className="text-lg font-bold text-white">
              Conexión Serverless & Configuración POS
            </h2>
            <p className="text-xs text-neutral-400">
              Google Apps Script API (Anti-CORS text/plain) · Key: {API_KEY}
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {feedback && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
                feedback.type === 'ok'
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                  : 'bg-red-950/50 border-red-700/60 text-red-200'
              }`}
            >
              {feedback.type === 'ok' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{feedback.msg}</span>
            </div>
          )}

          {/* Section 1: Google Apps Script Endpoint */}
          <form onSubmit={handleSaveUrlAndTest} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-orange-400">
                <Link2 className="w-4 h-4" />
                <span>URL de Ejecución de Google Apps Script (/exec)</span>
              </label>
              <button
                type="button"
                onClick={handleResetDefaultUrl}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-orange-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar URL por defecto</span>
              </button>
            </div>

            <input
              type="url"
              required
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={testing}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Verificando conexión...' : 'Guardar URL y Probar Conexión'}</span>
              </button>
            </div>
          </form>

          {/* Section 2: Business Parameters (Admin Only) */}
          {canEditBusinessConfig && (
            <form
              onSubmit={handleSaveBusinessConfig}
              className="pt-6 border-t border-neutral-800 space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                <Building2 className="w-4 h-4" />
                <span>Datos Fiscales y Parámetros de Facturación (updateConfig)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Nombre del Negocio</label>
                  <input
                    type="text"
                    required
                    value={formConfig.NOMBRE_NEGOCIO}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, NOMBRE_NEGOCIO: e.target.value })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">NIT / RUT</label>
                  <input
                    type="text"
                    required
                    value={formConfig.NIT}
                    onChange={(e) => setFormConfig({ ...formConfig, NIT: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Dirección Física</label>
                  <input
                    type="text"
                    required
                    value={formConfig.DIRECCION}
                    onChange={(e) => setFormConfig({ ...formConfig, DIRECCION: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    WhatsApp del Negocio (con indicativo 57)
                  </label>
                  <input
                    type="text"
                    required
                    value={formConfig.WHATSAPP}
                    onChange={(e) => setFormConfig({ ...formConfig, WHATSAPP: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Prefijo de Factura</label>
                  <input
                    type="text"
                    required
                    value={formConfig.PREFIJO_FACTURA}
                    onChange={(e) =>
                      setFormConfig({ ...formConfig, PREFIJO_FACTURA: e.target.value })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Porcentaje Impuesto (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formConfig.PORCENTAJE_IMPUESTO}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        PORCENTAJE_IMPUESTO: Number(e.target.value),
                      })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-neutral-400 mb-1">
                    Costo Domicilio Base (COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formConfig.COSTO_DOMICILIO_BASE}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        COSTO_DOMICILIO_BASE: Number(e.target.value),
                      })
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0F1115] border border-neutral-700 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingConfig ? 'Guardando en Google Sheets...' : 'Actualizar Parámetros'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
