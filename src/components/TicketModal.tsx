import React from 'react';
import { Printer, MessageCircle, X, CheckCircle2, MapPin, Phone, User } from 'lucide-react';
import { BusinessConfig, Factura } from '../types/pos';
import { formatCOP } from '../services/api';

interface TicketModalProps {
  factura: Factura | null;
  config: BusinessConfig;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ factura, config, onClose }) => {
  if (!factura) return null;

  const handlePrint = () => {
    window.print();
  };

  const negocioNombre = factura.negocio?.NOMBRE_NEGOCIO || config.NOMBRE_NEGOCIO || 'ESTACIÓN BURGUER';
  const negocioNit = factura.negocio?.NIT || config.NIT || '900.000.000-1';
  const negocioDir = factura.negocio?.DIRECCION || config.DIRECCION || 'Calle Principal #10-20';
  const negocioTel = factura.negocio?.WHATSAPP || config.WHATSAPP || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-[#181B22] border border-neutral-800 shadow-2xl overflow-hidden my-auto">
        {/* Top Modal Header (Hidden on Print) */}
        <div className="no-print flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-[#0F1115]">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Ticket POS · {factura.numero_factura}
              </h3>
              <p className="text-xs text-neutral-400">Formato Térmico 80mm listo para impresión</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Cerrar ticket"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal 80mm Ticket Preview & Printable Target */}
        <div className="p-5 bg-[#12141A] max-h-[65vh] overflow-y-auto flex justify-center">
          <div
            id="pos-thermal-ticket"
            className="w-full max-w-[310px] bg-white text-black rounded-lg p-4 font-mono text-xs shadow-inner"
          >
            <div className="text-center border-b border-dashed border-neutral-400 pb-3 mb-3">
              <div className="text-base font-extrabold tracking-tight uppercase">
                {negocioNombre}
              </div>
              <div className="text-[11px] text-neutral-700">NIT: {negocioNit}</div>
              <div className="text-[11px] text-neutral-700">{negocioDir}</div>
              {negocioTel && <div className="text-[11px] text-neutral-700">Tel: {negocioTel}</div>}
            </div>

            <div className="space-y-1 border-b border-dashed border-neutral-400 pb-2.5 mb-2.5 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">FACTURA:</span>
                <span className="font-bold">{factura.numero_factura}</span>
              </div>
              <div className="flex justify-between">
                <span>PEDIDO:</span>
                <span>{factura.id_pedido}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>
                  {factura.fecha} {factura.hora ? `· ${factura.hora}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SERVICIO:</span>
                <span className="font-bold uppercase">{factura.tipo_pedido}</span>
              </div>
              {factura.mesa_o_direccion && (
                <div className="flex justify-between gap-2">
                  <span className="shrink-0">
                    {factura.tipo_pedido === 'Domicilio' ? 'DIR:' : 'UBICACIÓN:'}
                  </span>
                  <span className="text-right font-semibold">{factura.mesa_o_direccion}</span>
                </div>
              )}
              {factura.barrio && (
                <div className="flex justify-between">
                  <span>BARRIO:</span>
                  <span>{factura.barrio}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 border-b border-dashed border-neutral-400 pb-2.5 mb-2.5 text-[11px]">
              <div className="flex items-center gap-1 font-semibold">
                <User className="w-3 h-3 inline shrink-0" />
                <span>{factura.cliente_nombre || 'Cliente Mostrador'}</span>
              </div>
              {factura.cliente_telefono && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 inline shrink-0" />
                  <span>{factura.cliente_telefono}</span>
                </div>
              )}
            </div>

            {/* Product Line Items */}
            <div className="border-b border-dashed border-neutral-400 pb-2.5 mb-2.5">
              <div className="grid grid-cols-12 font-bold text-[10px] border-b border-neutral-300 pb-1 mb-1.5">
                <span className="col-span-2">CANT</span>
                <span className="col-span-6">PRODUCTO</span>
                <span className="col-span-4 text-right">TOTAL</span>
              </div>
              <div className="space-y-1.5">
                {factura.items.map((item, idx) => (
                  <div key={idx} className="text-[11px]">
                    <div className="grid grid-cols-12 items-start">
                      <span className="col-span-2 font-bold">{item.cantidad}x</span>
                      <span className="col-span-6 pr-1 leading-tight">{item.nombre}</span>
                      <span className="col-span-4 text-right font-semibold tabular-nums">
                        {formatCOP(item.subtotal || item.precio_unitario * item.cantidad)}
                      </span>
                    </div>
                    {item.notas && (
                      <div className="pl-6 text-[10px] italic text-neutral-700">
                        * Nota: {item.notas}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 border-b border-dashed border-neutral-400 pb-2.5 mb-2.5 text-[11px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span className="tabular-nums">{formatCOP(factura.subtotal)}</span>
              </div>
              {factura.impuesto > 0 && (
                <div className="flex justify-between">
                  <span>IMPUESTO:</span>
                  <span className="tabular-nums">{formatCOP(factura.impuesto)}</span>
                </div>
              )}
              {factura.costo_domicilio > 0 && (
                <div className="flex justify-between">
                  <span>DOMICILIO:</span>
                  <span className="tabular-nums">{formatCOP(factura.costo_domicilio)}</span>
                </div>
              )}
              {factura.descuento > 0 && (
                <div className="flex justify-between">
                  <span>DESCUENTO:</span>
                  <span className="tabular-nums">- {formatCOP(factura.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-neutral-300">
                <span>TOTAL A PAGAR:</span>
                <span className="tabular-nums">{formatCOP(factura.total)}</span>
              </div>
            </div>

            <div className="space-y-1 text-[11px] mb-3">
              <div className="flex justify-between">
                <span>MÉTODO PAGO:</span>
                <span className="font-bold">{factura.metodo_pago}</span>
              </div>
              <div className="flex justify-between">
                <span>ESTADO PAGO:</span>
                <span className="font-bold uppercase">{factura.estado_pago}</span>
              </div>
              {factura.responsable && (
                <div className="flex justify-between">
                  <span>ATENDIDO POR:</span>
                  <span>{factura.responsable}</span>
                </div>
              )}
              {factura.notas && (
                <div className="pt-1 text-[10px] border-t border-dashed border-neutral-300">
                  <span className="font-bold">OBS:</span> {factura.notas}
                </div>
              )}
            </div>

            <div className="text-center text-[10px] text-neutral-700 pt-2 border-t border-dashed border-neutral-400">
              <p className="font-bold">¡GRACIAS POR PREFERIR A {negocioNombre.toUpperCase()}!</p>
              <p>Sabor artesanal a la parrilla</p>
            </div>
          </div>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="no-print p-5 bg-[#181B22] border-t border-neutral-800 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-3 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Imprimir Ticket (80mm)</span>
          </button>

          {factura.whatsapp_url && (
            <a
              href={factura.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 py-3 transition-colors"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Enviar por WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
