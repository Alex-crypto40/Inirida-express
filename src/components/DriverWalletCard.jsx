import React, { useState } from "react";
import { X, Wallet, Zap, Copy, Check, MessageCircle } from "lucide-react";

export default function DriverWalletCard({ balance = 20000, onClose }) {
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Configuración de recarga Nequi
  const NEQUI_NUMBER = "3143077813";

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(NEQUI_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white shadow-xl my-4 relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

      {/* Botón para cerrar/ocultar tarjeta (Si se recibe la función onClose) */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-full transition-colors z-10"
          title="Cerrar billetera"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Cabecera de la Tarjeta */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            Conductor Fundador
          </span>
          <h3 className="text-xs text-slate-400 font-medium mt-2">
            Billetera Inírida Express
          </h3>
        </div>
        {!onClose && (
          <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
        )}
      </div>

      {/* Mostrar Saldo */}
      <div className="mb-4">
        <div className="text-3xl font-black tracking-tight text-white flex items-baseline gap-1">
          ${Number(balance).toLocaleString("es-CO")}
          <span className="text-xs font-bold text-slate-500">COP</span>
        </div>
        <p className="text-[11px] text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Saldo activo para recibir carreras
        </p>
      </div>

      {/* Botón de Acción */}
      <button
        type="button"
        onClick={() => setShowRechargeModal(true)}
        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-extrabold py-3 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
      >
        <Zap className="w-4 h-4 fill-slate-950" />
        <span>Recargar Saldo con Nequi</span>
      </button>

      {/* MODAL / POPUP DE RECARGA NEQUI */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setShowRechargeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1.5 hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center text-xl mx-auto mb-2 font-black">
                N
              </div>
              <h4 className="text-base font-bold text-slate-100">
                Recargar Billetera
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Envía tu recarga por Nequi para actualizar tu saldo.
              </p>
            </div>

            {/* Número con opción de copia rápido */}
            <div className="bg-purple-950/40 border border-purple-800/40 rounded-2xl p-4 mb-5 text-center relative group">
              <span className="text-[11px] text-purple-300 font-semibold block mb-1">
                Número Nequi para Transferir:
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-black text-purple-200 tracking-wider">
                  {NEQUI_NUMBER}
                </span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="p-1.5 bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 rounded-lg transition-colors"
                  title="Copiar número"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              {copied && (
                <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                  ¡Número copiado!
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs text-slate-300 mb-6">
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-amber-400 bg-amber-400/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <p>Haz la transferencia desde tu aplicación Nequi.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-amber-400 bg-amber-400/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <p>
                  Envía el comprobante por WhatsApp notificando tu número de
                  cuenta.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/57${NEQUI_NUMBER}?text=Hola,%20acabo%20de%20hacer%20una%20recarga%20por%20Nequi%20para%20mi%20billetera%20de%20conductor.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 text-center transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Notificar Recarga por WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
