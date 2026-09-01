import React from "react";
import {
  RefreshCw,
  MapPin,
  Navigation,
  DollarSign,
  CheckCircle2,
} from "lucide-react";

export default function AvailableOrdersList({
  availableOrders = [],
  activeOrdersCount = 0,
  loading = false,
  currentCoords = null,
  onFetchOrders,
  onAcceptOrder,
  calculateDistance,
}) {
  return (
    <div>
      {/* Cabecera de la sección */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <span>Carreras Disponibles</span>
          <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border border-amber-500/30">
            {availableOrders.length}
          </span>
        </h2>
        <button
          onClick={onFetchOrders}
          disabled={loading}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title="Actualizar lista"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              loading ? "animate-spin text-amber-400" : ""
            }`}
          />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Lista vacía */}
      {availableOrders.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center shadow-inner">
          <div className="w-12 h-12 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-700/40">
            <Navigation className="w-6 h-6 text-slate-500 animate-pulse" />
          </div>
          <p className="text-sm font-semibold text-slate-300">
            Sin servicios disponibles
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Esperando nuevas solicitudes de pasajeros en la zona...
          </p>
        </div>
      ) : (
        /* Tarjetas de carreras disponibles */
        <div className="space-y-3">
          {availableOrders.map((order, index) => {
            const orderId = order._id || order.id || order.orderId;

            // Extracción flexible y robusta de campos
            const passengerName =
              order.passengerName ||
              order.customerName ||
              order.customer?.name ||
              order.clientName ||
              "Pasajero";

            const fare =
              order.fare ||
              order.totalAmount ||
              order.price ||
              order.items?.[0]?.precio ||
              0;

            const originAddress =
              order.pickupAddress ||
              order.pickupLocation?.address ||
              (typeof order.pickupLocation === "string"
                ? order.pickupLocation
                : null) ||
              order.origen ||
              order.origin ||
              order.items?.[0]?.origen ||
              "Origen no especificado";

            const destinationAddress =
              order.destinationAddress ||
              order.dropoffLocation?.address ||
              (typeof order.dropoffLocation === "string"
                ? order.dropoffLocation
                : null) ||
              order.destino ||
              order.destination ||
              order.items?.[0]?.detalle ||
              order.items?.[0]?.destino ||
              "Destino no especificado";

            // Coordenadas para calcular distancia
            const pickupCoords =
              order.pickupLocation?.coords || order.pickupCoords || null;

            let distance = null;
            if (
              currentCoords &&
              pickupCoords &&
              calculateDistance &&
              typeof calculateDistance === "function"
            ) {
              distance = calculateDistance(
                currentCoords.lat,
                currentCoords.lng,
                pickupCoords.lat,
                pickupCoords.lng,
              );
            }

            return (
              <div
                key={orderId || index}
                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-xl transition-all duration-200 relative overflow-hidden group"
              >
                {/* Indicador lateral */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500 group-hover:bg-amber-400 transition-colors" />

                <div className="flex justify-between items-start mb-3 pl-1">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      ID: #{orderId ? orderId.toString().slice(-6) : "N/A"}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                      {passengerName}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-emerald-400 flex items-center justify-end">
                      <DollarSign className="w-4 h-4 -mr-0.5" />
                      {Number(fare).toLocaleString("es-CO")}
                    </span>
                    {distance && (
                      <span className="text-[10px] text-amber-400/90 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        A {distance} km de ti
                      </span>
                    )}
                  </div>
                </div>

                {/* Rutas (Origen / Destino) */}
                <div className="space-y-2 mb-4 pl-1 text-xs">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">
                        Origen
                      </p>
                      <p className="text-slate-200 font-semibold">
                        {originAddress}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">
                        Destino
                      </p>
                      <p className="text-slate-200 font-semibold">
                        {destinationAddress}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botón Aceptar Carrera sin bloqueo arbitrario */}
                <button
                  type="button"
                  onClick={() => onAcceptOrder(order)}
                  disabled={activeOrdersCount >= 2}
                  className={`w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-lg ${
                    activeOrdersCount >= 2
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95 cursor-pointer"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {activeOrdersCount >= 2
                      ? "Límite alcanzado (2 Máx)"
                      : "ACEPTAR CARRERA"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
