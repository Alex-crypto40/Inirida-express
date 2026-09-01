import React, { useState, useEffect, useRef } from "react";
import {
  GripHorizontal,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Phone,
  MapPin,
  Navigation,
  CheckCircle,
} from "lucide-react";

export default function ActiveTripCard({
  activeOrders = [], // Array de hasta 2 carreras
  activeOrder = null, // Retrocompatibilidad para objeto único
  onUpdateStatus,
  onOpenChat,
  loading = false,
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Estados de Cancelado o Finalizado a omitir
  const IGNORED_STATUSES = [
    "cancelled",
    "canceled",
    "cancelado",
    "completed",
    "completado",
    "rejected",
    "rechazado",
  ];

  // Normalización + Filtro de órdenes
  const rawOrders =
    Array.isArray(activeOrders) && activeOrders.length > 0
      ? activeOrders
      : activeOrder
        ? [activeOrder]
        : [];

  const ordersList = rawOrders.filter((ord) => {
    const st = (ord?.status || "").toString().toLowerCase().trim();
    return !IGNORED_STATUSES.includes(st);
  });

  // Estados de Arrastre (Draggable)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Ajuste de índice si se completa/cancela una carrera
  useEffect(() => {
    if (selectedIndex >= ordersList.length && ordersList.length > 0) {
      setSelectedIndex(Math.max(0, ordersList.length - 1));
    }
  }, [ordersList.length, selectedIndex]);

  if (ordersList.length === 0) return null;

  const currentOrder = ordersList[selectedIndex] || ordersList[0];

  // Extracción robusta del ID de la orden activa
  const orderId =
    currentOrder?._id ||
    currentOrder?.id ||
    currentOrder?.orderId ||
    currentOrder?.order?._id ||
    currentOrder?.order?.id;

  // Propiedades unificadas
  const originText =
    currentOrder?.pickupAddress ||
    currentOrder?.pickupLocation?.address ||
    currentOrder?.origen ||
    currentOrder?.items?.[0]?.origen ||
    "Origen no especificado";

  const destinationText =
    currentOrder?.destinationAddress ||
    currentOrder?.dropoffLocation?.address ||
    currentOrder?.destino ||
    currentOrder?.items?.[0]?.detalle ||
    "Destino no especificado";

  const customerName =
    currentOrder?.customer?.name ||
    currentOrder?.customerName ||
    currentOrder?.clientName ||
    currentOrder?.passengerName ||
    "Cliente General";

  const customerPhone =
    currentOrder?.customer?.phone ||
    currentOrder?.clientPhone ||
    currentOrder?.customerPhone;

  // Formateo del estado a castellano
  const rawStatus = (currentOrder?.status || "en_camino").toLowerCase();
  const formatStatus = (st) => {
    if (
      [
        "on_the_way",
        "on the way",
        "assigned",
        "accepted",
        "in_progress",
        "en_camino",
        "en camino",
      ].includes(st)
    ) {
      return "En Camino";
    }
    if (["arrived", "llegue", "at_pickup"].includes(st)) {
      return "En Origen";
    }
    return st.replace(/_/g, " ");
  };

  // Control del arrastre
  const handleDragStart = (clientX, clientY) => {
    setIsDragging(true);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: position.x,
      initialY: position.y,
    };
  };

  const handleDragMove = (clientX, clientY) => {
    if (!isDragging) return;
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    setPosition({
      x: dragRef.current.initialX + deltaX,
      y: dragRef.current.initialY + deltaY,
    });
  };

  const handleDragEnd = () => setIsDragging(false);

  useEffect(() => {
    const onMouseMove = (e) => handleDragMove(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (e.touches.length > 0) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  // Apertura de chat segura con ID garantizado
  const handleOpenChatSafe = () => {
    if (!onOpenChat) return;
    const safeOrder = {
      ...currentOrder,
      _id: orderId,
      id: orderId,
    };
    onOpenChat(safeOrder);
  };

  // Finalizar carrera directamente
  const handleCompleteTrip = () => {
    setPosition({ x: 0, y: 0 });
    setSelectedIndex(0);

    if (typeof onUpdateStatus === "function") {
      onUpdateStatus(orderId || currentOrder, "COMPLETED");
    }
  };

  return (
    <div
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: "none",
      }}
      className="fixed bottom-3 left-0 right-0 z-40 px-3 flex justify-center pointer-events-none select-none"
    >
      <div className="w-full max-w-md bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl p-3.5 backdrop-blur-md max-h-[85vh] flex flex-col justify-between overflow-hidden pointer-events-auto">
        {/* Drag Handle */}
        <div
          onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
          className="w-full flex justify-center items-center py-1 cursor-grab active:cursor-grabbing hover:bg-slate-800/40 rounded-t-xl transition-colors"
        >
          <GripHorizontal className="w-6 h-4 text-slate-500" />
        </div>

        {/* Pestañas para Múltiples Carreras */}
        {ordersList.length > 1 && (
          <div className="flex space-x-2 mb-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            {ordersList.map((ord, idx) => {
              const currentId =
                ord._id || ord.id || ord.orderId || `${idx + 1}`;
              const shortCode = currentId.toString().slice(-4);
              const isActive = idx === selectedIndex;

              return (
                <button
                  key={currentId}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    isActive
                      ? "bg-amber-500 text-slate-950 shadow-md"
                      : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>Carrera #{shortCode}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? "bg-slate-950/20 text-slate-950"
                        : "bg-slate-800 text-amber-400"
                    }`}
                  >
                    {idx + 1}/2
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Cabecera de la Tarjeta */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {ordersList.length > 1
                ? `Carrera (${selectedIndex + 1}/${ordersList.length})`
                : "Carrera en Curso"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs transition cursor-pointer"
              title={isMinimized ? "Expandir" : "Minimizar"}
            >
              {isMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenChatSafe}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 p-1.5 rounded-lg text-xs flex items-center space-x-1 border border-amber-500/20 transition cursor-pointer"
              title="Chat con el cliente"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 p-1.5 rounded-lg text-xs border border-emerald-500/30 transition cursor-pointer"
                title="Llamar al cliente"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Cuerpo / Información del Viaje */}
        {!isMinimized && (
          <div className="my-2 space-y-2">
            <div className="flex justify-between text-xs items-center px-1">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Cliente</p>
                <p className="font-semibold text-slate-200 truncate max-w-[200px]">
                  {customerName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase">Estado</p>
                <p className="font-bold text-amber-400 text-xs capitalize">
                  {formatStatus(rawStatus)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center space-x-2 overflow-hidden">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate text-slate-200 text-xs font-medium">
                  {originText}
                </span>
              </div>

              <div className="flex items-center space-x-2 overflow-hidden">
                <Navigation className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate text-slate-200 text-xs font-medium">
                  {destinationText}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Único Botón de Acción: Finalizar Carrera */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleCompleteTrip}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex justify-center items-center space-x-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finalizar Carrera</span>
          </button>
        </div>
      </div>
    </div>
  );
}
