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
  MapPinCheck,
} from "lucide-react";

export default function ActiveTripCard({
  activeOrders = [], // Soporta array de hasta 2 carreras
  activeOrder = null, // Retrocompatibilidad para objeto único
  onUpdateStatus,
  onOpenChat,
  loading,
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

  // Normalización + Filtro: Descartamos cualquier orden cancelada o completada
  const rawOrders =
    Array.isArray(activeOrders) && activeOrders.length > 0
      ? activeOrders
      : activeOrder
        ? [activeOrder]
        : [];

  const ordersList = rawOrders.filter(
    (ord) => !IGNORED_STATUSES.includes((ord?.status || "").toLowerCase()),
  );

  // Estados de Arrastre (Draggable)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Garantizar que selectedIndex no quede fuera de rango
  useEffect(() => {
    if (selectedIndex >= ordersList.length && ordersList.length > 0) {
      setSelectedIndex(Math.max(0, ordersList.length - 1));
    }
  }, [ordersList.length, selectedIndex]);

  // Si no hay órdenes activas válidas, se oculta la tarjeta por completo
  if (ordersList.length === 0) return null;

  // Orden actualmente seleccionada en las pestañas
  const currentOrder = ordersList[selectedIndex] || ordersList[0];
  const orderId = currentOrder?._id || currentOrder?.id;

  // Extracción segura de datos de la orden seleccionada
  const item = currentOrder?.items?.[0] || {};

  const originText =
    item.origen ||
    item.origin ||
    item.pickupAddress ||
    item.originAddress ||
    currentOrder?.origen ||
    currentOrder?.origin ||
    currentOrder?.pickupAddress ||
    currentOrder?.originAddress ||
    "Origen no especificado";

  const destinationText =
    item.detalle ||
    item.destino ||
    item.destination ||
    item.dropoffAddress ||
    item.description ||
    currentOrder?.detalle ||
    currentOrder?.destino ||
    currentOrder?.destination ||
    currentOrder?.destinationAddress ||
    "Destino no especificado";

  const customerName =
    currentOrder?.customer?.name ||
    currentOrder?.customerName ||
    currentOrder?.clientName ||
    currentOrder?.passengerName ||
    "Cliente";

  const customerPhone =
    currentOrder?.customer?.phone ||
    currentOrder?.clientPhone ||
    currentOrder?.customerPhone;

  const currentStatus = (currentOrder?.status || "").toLowerCase();

  // Control del arrastre (Draggable)
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

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Listeners globales para el arrastre
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

  // Manejadores de Estado
  const isAcceptedStatus = [
    "accepted",
    "aceptado",
    "assigned",
    "asignado",
    "assigned_driver",
    "pending_driver",
  ].includes(currentStatus);

  const isArrivedStatus = ["arrived", "llegue", "llegué", "at_pickup"].includes(
    currentStatus,
  );

  const isInProgressStatus = [
    "in_progress",
    "en_camino",
    "en camino",
    "inprogress",
    "on_the_way",
  ].includes(currentStatus);

  const handleStatusUpdate = (nextStatus) => {
    if (nextStatus === "COMPLETED") {
      setPosition({ x: 0, y: 0 });
      setSelectedIndex(0);
    }
    onUpdateStatus(nextStatus, orderId);
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
        {/* Grip Bar */}
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

        {/* PESTAÑAS SI HAY 2 CARRERAS ACTIVAS */}
        {ordersList.length > 1 && (
          <div className="flex space-x-2 mb-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            {ordersList.map((ord, idx) => {
              const shortCode = (ord._id || ord.id || `${idx + 1}`)
                .toString()
                .slice(-4);
              const isActive = idx === selectedIndex;

              return (
                <button
                  key={ord._id || ord.id || idx}
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

        {/* Cabecera */}
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
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs transition"
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
              onClick={() => onOpenChat && onOpenChat(currentOrder)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 p-1.5 rounded-lg text-xs flex items-center space-x-1 border border-amber-500/20 transition"
              title="Chat con el usuario"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {customerPhone && (
              <a
                href={`tel:${customerPhone}`}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 p-1.5 rounded-lg text-xs border border-emerald-500/30 transition"
                title="Llamar al usuario"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Cuerpo (Detalles) */}
        {!isMinimized && (
          <div className="my-2 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Cliente</p>
                <p className="font-semibold text-slate-200 truncate">
                  {customerName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase">Estado</p>
                <p className="font-bold text-amber-400 text-xs capitalize truncate">
                  {currentStatus.replace(/_/g, " ")}
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

        {/* Flujo Dinámico de Acciones */}
        <div className="pt-1">
          {isAcceptedStatus && (
            <button
              type="button"
              onClick={() => handleStatusUpdate("IN_PROGRESS")}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex justify-center items-center space-x-2 shadow-lg active:scale-95 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>Voy en Camino (Hacia Cliente)</span>
            </button>
          )}

          {isArrivedStatus && (
            <button
              type="button"
              onClick={() => handleStatusUpdate("IN_PROGRESS")}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex justify-center items-center space-x-2 shadow-lg active:scale-95 transition-all"
            >
              <MapPinCheck className="w-4 h-4" />
              <span>Iniciar Recorrido al Destino</span>
            </button>
          )}

          {(isInProgressStatus || (!isAcceptedStatus && !isArrivedStatus)) && (
            <button
              type="button"
              onClick={() => handleStatusUpdate("COMPLETED")}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex justify-center items-center space-x-2 shadow-lg active:scale-95 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Finalizar Carrera</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
