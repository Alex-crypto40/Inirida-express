import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import OrderChatModal from "./OrderChatModal";

export default function OrderStatusWidget({
  activeOrder: initialOrder,
  onCancelOrder,
}) {
  const [activeOrder, setActiveOrder] = useState(initialOrder);
  const [showChat, setShowChat] = useState(false);

  // Mantener actualizado el estado local si cambia la prop
  useEffect(() => {
    setActiveOrder(initialOrder);
  }, [initialOrder]);

  // Escuchar actualizaciones por WebSockets en tiempo real
  useEffect(() => {
    if (!activeOrder?._id) return;

    const SOCKET_URL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace("/api", "")
      : "http://localhost:5000";

    const socket = io(SOCKET_URL);

    // Unirse a la sala única del pedido
    socket.emit("join_order", `order_${activeOrder._id}`);
    socket.emit("join_order", activeOrder._id);

    // Escuchar cuando el conductor acepta la carrera o cambia el estado
    const handleOrderUpdate = (updatedOrder) => {
      console.log("⚡ Orden actualizada en tiempo real:", updatedOrder);
      if (
        updatedOrder &&
        (updatedOrder._id === activeOrder._id ||
          updatedOrder.orderId === activeOrder._id)
      ) {
        setActiveOrder((prev) => ({
          ...prev,
          ...(typeof updatedOrder === "object" ? updatedOrder : {}),
        }));
      }
    };

    socket.on("orderUpdated", handleOrderUpdate);
    socket.on("order_status_updated", handleOrderUpdate);
    socket.on("order:status_updated", handleOrderUpdate);

    return () => {
      socket.off("orderUpdated", handleOrderUpdate);
      socket.off("order_status_updated", handleOrderUpdate);
      socket.off("order:status_updated", handleOrderUpdate);
      socket.disconnect();
    };
  }, [activeOrder?._id]);

  if (!activeOrder) return null;

  // Normalizar datos del conductor
  const driver =
    activeOrder.driverId || activeOrder.driver || activeOrder.assignedDriver;
  const status = activeOrder.status;

  // Normalizar PIN de seguridad
  const pinCode = activeOrder.deliveryPin || activeOrder.pinCode;

  // Mapeo preciso con los estados de MongoDB
  const isPending = status === "pending" || status === "pending_driver";
  const isAccepted =
    status === "assigned" ||
    status === "accepted" ||
    status === "in_transit" ||
    status === "on_the_way" ||
    status === "at_store" ||
    status === "in_progress";
  const isCompleted = status === "completed";

  return (
    <>
      {/* Tarjeta Flotante del Cliente con zIndex de tarjeta (1040) */}
      <div
        className="position-fixed bottom-0 start-50 translate-middle-x mb-3 p-3 bg-white shadow-lg rounded-2xl border border-orange-200"
        style={{
          zIndex: 1040,
          maxWidth: "380px",
          width: "92%",
          boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.25)",
        }}
      >
        {/* Cabecera del Estado */}
        <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
          <h6 className="m-0 font-extrabold text-sm text-gray-800 d-flex align-items-center gap-1">
            <span>🛺</span> Estado de tu Carrera
          </h6>
          <span
            className={`badge rounded-pill px-2.5 py-1.5 text-xs font-bold ${
              isPending
                ? "bg-warning text-dark animate-pulse"
                : isAccepted
                  ? "bg-success text-white"
                  : "bg-secondary"
            }`}
          >
            {isPending && "Buscando motocarro..."}
            {isAccepted && "Conductor en camino"}
            {isCompleted && "Carrera finalizada"}
          </span>
        </div>

        {/* ESTADO 1: BUSCANDO CONDUCTOR */}
        {isPending && (
          <div className="text-center my-3">
            <div
              className="spinner-border text-warning spinner-border-sm me-2"
              role="status"
            ></div>
            <p className="text-xs text-gray-500 font-medium mt-1 mb-0">
              Notificando a conductores cercanos en Inírida...
            </p>

            <button
              className="btn btn-outline-danger btn-sm w-100 mt-3 rounded-xl font-bold text-xs"
              onClick={() => onCancelOrder && onCancelOrder(activeOrder._id)}
            >
              Cancelar Carrera
            </button>
          </div>
        )}

        {/* ESTADO 2: CONDUCTOR EN CAMINO */}
        {isAccepted && (
          <div className="space-y-2 mt-2">
            {/* PIN DE SEGURIDAD */}
            {pinCode && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 text-center">
                <span className="text-[10px] text-orange-800 font-bold uppercase tracking-wider block">
                  Tu PIN de Seguridad
                </span>
                <span className="text-xl font-black text-orange-600 tracking-widest">
                  {pinCode}
                </span>
                <p className="text-[10px] text-orange-700/80 m-0">
                  Entrégale este código al conductor al subirte
                </p>
              </div>
            )}

            {/* Datos del Conductor y Vehículo */}
            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs space-y-1">
              <div className="d-flex justify-content-between">
                <span className="text-gray-500 font-medium">Conductor:</span>
                <strong className="text-gray-800">
                  {driver?.name || driver?.fullName || "Asignado"}
                </strong>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-gray-500 font-medium">Vehículo:</span>
                <span className="font-bold text-gray-700 capitalize">
                  {driver?.vehicleType || "Motocarro"}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-gray-500 font-medium">Placa:</span>
                <span className="badge bg-dark px-2 py-1 font-mono">
                  {driver?.plateNumber || driver?.plate || "MTC-001"}
                </span>
              </div>
            </div>

            {/* BOTÓN ÚNICO DE CHAT NATURA */}
            <div className="pt-1">
              <button
                className="btn btn-warning text-white btn-sm font-bold text-xs rounded-xl d-flex align-items-center justify-content-center gap-2 w-100 py-2 shadow-sm"
                style={{ backgroundColor: "#f97316", borderColor: "#ea580c" }}
                onClick={() => setShowChat(true)}
              >
                <i className="bi bi-chat-dots-fill"></i> Abrir Chat App
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 3: CARRERA FINALIZADA */}
        {isCompleted && (
          <div className="text-center my-2 p-2 bg-green-50 rounded-xl border border-green-200">
            <span className="text-lg">🎉</span>
            <p className="text-xs font-bold text-green-800 mb-0">
              ¡Llegaste a tu destino con éxito!
            </p>
          </div>
        )}
      </div>

      {/* Modal del Chat sobrepuesto de forma independiente */}
      {showChat && (
        <OrderChatModal
          orderId={activeOrder._id}
          currentUserRole="client"
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}
