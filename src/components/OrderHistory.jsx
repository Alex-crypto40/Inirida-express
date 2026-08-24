import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Bike,
  ShoppingBag,
} from "lucide-react";

export const OrderHistory = ({ customerId, onClose, API_BASE_URL }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'completed'

  // Limpieza de URL para evitar duplicar '/api' en caso de que API_BASE_URL ya lo traiga
  const cleanBaseUrl = API_BASE_URL
    ? API_BASE_URL.replace(/\/api\/?$/, "")
    : "";

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${cleanBaseUrl}/api/orders/customer/${customerId}`,
        );
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error al cargar historial:", err);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchHistory();
    }
  }, [customerId, cleanBaseUrl]);

  const filteredOrders = orders.filter((order) => {
    if (filter === "active") {
      return [
        "pending",
        "assigned",
        "accepted",
        "en_camino",
        "in_progress",
        "on_the_way",
      ].includes(order.status);
    }
    if (filter === "completed") {
      return ["completed", "delivered", "cancelled"].includes(order.status);
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
      case "delivered":
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completado
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Cancelado
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> En curso
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300">
      {/* ================================================================
        BACKDROP
        Cierra el modal al tocar fuera
       ================================================================ */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* ================================================================
        MODAL PRINCIPAL
        - Móvil: Drawer inferior
        - Desktop: Modal centrado
       ================================================================ */}
      <div className="relative z-10 w-full max-w-md h-[92vh] sm:h-[86vh] bg-slate-50 rounded-t-[28px] sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-white/20 animate-in slide-in-from-bottom duration-300">
        {/* ================================================================
          INDICADOR TÁCTIL PARA MÓVIL
         ================================================================ */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* ================================================================
          HEADER
         ================================================================ */}
        <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white px-4 py-4 shrink-0">
          {/* Decoración */}
          <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute right-8 -bottom-10 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-sm">
                <Bike className="w-5 h-5 text-white" />
              </div>

              <div>
                <h2 className="text-base font-black tracking-tight">
                  Mis Pedidos
                </h2>

                <p className="text-[10px] text-orange-100 font-medium mt-0.5">
                  Consulta tus carreras y servicios
                </p>
              </div>
            </div>

            {/* Contador */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1.5 rounded-xl bg-white/15 border border-white/20 backdrop-blur-md text-[10px] font-bold">
                {filteredOrders.length}{" "}
                {filteredOrders.length === 1 ? "pedido" : "pedidos"}
              </div>

              <button
                onClick={onClose}
                type="button"
                aria-label="Cerrar historial"
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center transition-all active:scale-90"
              >
                <span className="text-sm font-bold">✕</span>
              </button>
            </div>
          </div>
        </header>

        {/* ================================================================
          FILTROS
         ================================================================ */}
        <div className="px-3 py-3 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
            {[
              {
                id: "all",
                label: "Todos",
              },
              {
                id: "active",
                label: "En curso",
              },
              {
                id: "completed",
                label: "Historial",
              },
            ].map((item) => {
              const isActive = filter === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`relative flex-1 py-2.5 px-2 rounded-xl text-[11px] font-extrabold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-orange-600 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                  }`}
                >
                  {item.label}

                  {isActive && (
                    <span className="absolute left-1/2 -bottom-0.5 -translate-x-1/2 w-5 h-0.5 bg-orange-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================
          CONTENIDO / LISTA
         ================================================================ */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 bg-slate-50">
          {/* ================================================================
            LOADING
           ================================================================ */}
          {loading ? (
            <div className="min-h-[280px] flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-11 h-11 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />

                <Bike className="absolute inset-0 m-auto w-4 h-4 text-orange-500" />
              </div>

              <p className="mt-4 text-xs font-bold text-slate-600">
                Cargando tus pedidos...
              </p>

              <p className="text-[10px] text-slate-400 mt-1">
                Estamos consultando tu historial
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            /* ==============================================================
             EMPTY STATE
             ============================================================== */
            <div className="min-h-[320px] flex items-center justify-center">
              <div className="w-full bg-white rounded-3xl border border-slate-200 p-7 text-center shadow-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-orange-400" />
                </div>

                <h3 className="text-sm font-black text-slate-800">
                  No hay pedidos aquí
                </h3>

                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-[250px] mx-auto">
                  {filter === "active"
                    ? "No tienes carreras activas en este momento."
                    : filter === "completed"
                      ? "Todavía no tienes servicios finalizados."
                      : "Tus carreras y servicios aparecerán aquí."}
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 font-semibold">
                  🛺 Inírida Express
                </div>
              </div>
            </div>
          ) : (
            /* ==============================================================
             LISTA DE PEDIDOS
             ============================================================== */
            filteredOrders.map((ord) => {
              const createdDate = ord.createdAt
                ? new Date(ord.createdAt)
                : null;

              const origin =
                ord.originAddress ||
                ord.pickupAddress ||
                ord.origen ||
                "Inírida";

              const destination =
                ord.destinationAddress ||
                ord.destination ||
                ord.destino ||
                ord.notes ||
                "Inírida";

              const driverName =
                ord.driver?.name || ord.driverName || "Sin asignar";

              const plate =
                ord.driver?.vehiclePlate ||
                ord.driver?.plate ||
                ord.vehiclePlate ||
                ord.plate ||
                null;

              const fare = ord.fare ?? ord.price ?? ord.totalPrice ?? 0;

              const isActive = [
                "pending",
                "pending_driver",
                "assigned",
                "accepted",
                "on_the_way",
                "in_transit",
                "at_store",
                "in_progress",
              ].includes(String(ord.status || "").toLowerCase());

              return (
                <article
                  key={ord._id}
                  className={`relative overflow-hidden bg-white rounded-3xl border transition-all duration-200 shadow-sm ${
                    isActive
                      ? "border-orange-200 shadow-orange-100/50"
                      : "border-slate-200 hover:border-orange-200"
                  }`}
                >
                  {/* Barra lateral para pedidos activos */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-amber-500" />
                  )}

                  <div className="p-3.5">
                    {/* ======================================================
                      CABECERA DEL PEDIDO
                     ====================================================== */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Pedido
                          </span>

                          <span className="text-[9px] font-bold text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded-md">
                            #
                            {(ord._id || "0000")
                              .toString()
                              .slice(-6)
                              .toUpperCase()}
                          </span>
                        </div>

                        {createdDate && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {createdDate.toLocaleDateString("es-CO", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            ·{" "}
                            {createdDate.toLocaleTimeString("es-CO", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {getStatusBadge(ord.status)}
                      </div>
                    </div>

                    {/* ======================================================
                      RUTA
                     ====================================================== */}
                    <div className="relative rounded-2xl bg-slate-50 border border-slate-200 p-3">
                      {/* Línea vertical */}
                      <div className="absolute left-[19px] top-[28px] bottom-[28px] w-px bg-slate-300" />

                      {/* ORIGEN */}
                      <div className="relative flex items-start gap-3">
                        <div className="relative z-10 w-3.5 h-3.5 mt-0.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50 shrink-0" />

                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] uppercase tracking-wider font-black text-emerald-600">
                            Recogida
                          </p>

                          <p className="text-[11px] font-bold text-slate-700 leading-snug line-clamp-2 mt-0.5">
                            {origin}
                          </p>
                        </div>
                      </div>

                      {/* DESTINO */}
                      <div className="relative flex items-start gap-3 mt-4">
                        <div className="relative z-10 w-3.5 h-3.5 mt-0.5 rounded-full bg-rose-500 ring-4 ring-rose-50 shrink-0" />

                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] uppercase tracking-wider font-black text-rose-600">
                            Destino
                          </p>

                          <p className="text-[11px] font-bold text-slate-700 leading-snug line-clamp-2 mt-0.5">
                            {destination}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ======================================================
                      INFORMACIÓN DEL CONDUCTOR + PRECIO
                     ====================================================== */}
                    <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Bike className="w-4 h-4 text-slate-500" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                            Conductor
                          </p>

                          <p className="text-[11px] font-extrabold text-slate-700 truncate">
                            {driverName}
                          </p>

                          {plate && (
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                              Placa · {plate}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* PRECIO */}
                      <div className="text-right shrink-0">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                          Total
                        </p>

                        <p className="text-base font-black text-orange-600 leading-tight">
                          ${Number(fare || 0).toLocaleString("es-CO")}
                        </p>

                        <p className="text-[9px] text-slate-400 font-medium">
                          COP
                        </p>
                      </div>
                    </div>

                    {/* ======================================================
                      INDICADOR DE CARRERA ACTIVA
                     ====================================================== */}
                    {isActive && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100">
                        <span className="relative flex w-2 h-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex w-2 h-2 rounded-full bg-orange-500" />
                        </span>

                        <span className="text-[10px] font-bold text-orange-700">
                          Servicio en curso
                        </span>

                        <ChevronRight className="w-3.5 h-3.5 text-orange-400 ml-auto" />
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ================================================================
          FOOTER
         ================================================================ */}
        {!loading && filteredOrders.length > 0 && (
          <div className="shrink-0 px-4 py-2.5 bg-white border-t border-slate-200 text-center">
            <p className="text-[9px] text-slate-400 font-medium">
              Mostrando {filteredOrders.length}{" "}
              {filteredOrders.length === 1 ? "servicio" : "servicios"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
