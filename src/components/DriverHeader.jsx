import React from "react";
import { Power, X, Wallet } from "lucide-react";

export default function DriverHeader({
  driverName = "Conductor",
  isOnline,
  setIsOnline,
  gpsAccuracy,
  walletBalance = 0,
  onOpenWallet,
  onLogout,
}) {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 p-4 sticky top-0 z-20 backdrop-blur-md flex justify-between items-center shadow-2xl">
      {/* Información del Conductor */}
      <div className="flex items-center space-x-3 min-w-0 pr-2">
        <div className="relative flex items-center justify-center shrink-0">
          <span
            className={`w-3.5 h-3.5 rounded-full ${
              isOnline
                ? "bg-emerald-500 animate-ping absolute opacity-75"
                : "bg-red-500"
            }`}
          />
          <span
            className={`w-3 h-3 rounded-full ${
              isOnline ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-sm text-slate-100 tracking-tight flex items-center gap-1.5">
            <span className="truncate max-w-[120px] sm:max-w-[180px]">
              {driverName}
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono shrink-0">
              PRO
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium truncate">
            {isOnline
              ? gpsAccuracy
                ? `GPS Activo (±${Math.round(gpsAccuracy)}m)`
                : "Conectado - Buscando GPS..."
              : "Fuera de Servicio"}
          </p>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Acceso a Billetera Nequi */}
        <button
          onClick={onOpenWallet}
          className="flex items-center space-x-1.5 bg-slate-800/90 hover:bg-slate-800 border border-amber-500/30 text-amber-400 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
          title="Ver Billetera y Recargar"
        >
          <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>${walletBalance.toLocaleString("es-CO")}</span>
        </button>

        {/* Interruptor Online / Offline */}
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
          }`}
        >
          <Power className="w-3.5 h-3.5 shrink-0" />
          <span>{isOnline ? "DISPONIBLE" : "OFFLINE"}</span>
        </button>

        {/* Cerrar Sesión */}
        <button
          onClick={onLogout}
          className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50"
          title="Cerrar sesión"
        >
          <X className="w-5 h-5 shrink-0" />
        </button>
      </div>
    </header>
  );
}
