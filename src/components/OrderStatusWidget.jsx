import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import OrderChatModal from "./OrderChatModal";

const RAW_URL =
  import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com";
const API_URL = `${RAW_URL.replace(/\/api\/?$/, "")}/api`;

export default function OrderStatusWidget({
  activeOrder: initialOrder,
  onCancelOrder,
  customerIdProp,
}) {
  const [activeOrder, setActiveOrder] = useState(initialOrder);
  const [showChat, setShowChat] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ESTADOS PARA CALIFICACIÓN
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const showChatRef = useRef(showChat);

  const checkIsRide = (order) => {
    if (!order) return false;
    const type = order.orderType || order.serviceType;
    return (
      type === "carrerita" ||
      type === "pasajero" ||
      type === "motocarro" ||
      type === "ride"
    );
  };

  useEffect(() => {
    showChatRef.current = showChat;
    if (showChat) {
      setUnreadCount(0);
    }
  }, [showChat]);

  // Sincronizar estado cuando se recibe una nueva orden vía props
  useEffect(() => {
    if (initialOrder && initialOrder._id) {
      setActiveOrder(initialOrder);
      localStorage.setItem("activeOrderId", initialOrder._id);
    }
  }, [initialOrder]);

  // Recuperación de orden activa al recargar la página
  useEffect(() => {
    if (activeOrder && activeOrder._id) return;

    const recoverActiveOrder = async () => {
      const storedOrderId = localStorage.getItem("activeOrderId");
      const targetCustomerId =
        customerIdProp || localStorage.getItem("userId") || "cliente";

      const hasValidStoredId =
        storedOrderId &&
        storedOrderId !== "undefined" &&
        storedOrderId !== "null" &&
        storedOrderId.trim() !== "";

      try {
        let res = null;
        if (hasValidStoredId) {
          res = await fetch(`${API_URL}/orders/${storedOrderId}`);
        } else if (targetCustomerId && targetCustomerId !== "cliente") {
          res = await fetch(
            `${API_URL}/orders/active?customerId=${targetCustomerId}`,
          );
        }

        if (res && res.ok) {
          const data = await res.json();
          const foundOrder = data.order || data.activeOrder || data;

          if (
            foundOrder &&
            foundOrder._id &&
            foundOrder.status !== "cancelled"
          ) {
            setActiveOrder(foundOrder);
            localStorage.setItem("activeOrderId", foundOrder._id);
          } else {
            localStorage.removeItem("activeOrderId");
          }
        } else {
          localStorage.removeItem("activeOrderId");
        }
      } catch (error) {
        console.error("Error al recuperar orden activa:", error);
      }
    };

    recoverActiveOrder();
  }, [activeOrder, customerIdProp]);

  // Suscripción WebSocket
  useEffect(() => {
    const orderId = activeOrder?._id;
    if (!orderId) return;

    const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.emit("join_order", `order_${orderId}`);
    socket.emit("join_order", orderId);
    socket.emit("join_order_room", orderId);

    const handleOrderUpdate = (updatedOrder) => {
      if (!updatedOrder) return;
      const receivedId =
        updatedOrder._id || updatedOrder.orderId || updatedOrder.id;

      if (receivedId === orderId || !receivedId) {
        setActiveOrder((prev) => {
          const nextState = {
            ...prev,
            ...(typeof updatedOrder === "object" ? updatedOrder : {}),
          };

          if (nextState.status === "cancelled") {
            localStorage.removeItem("activeOrderId");
            return null;
          }

          return nextState;
        });
      }
    };

    const handleOrderCancelled = (data) => {
      const cancelledId = data?._id || data?.orderId || data?.id || data;
      if (cancelledId === orderId) {
        localStorage.removeItem("activeOrderId");
        setActiveOrder(null);
      }
    };

    const handleNewChatMessage = (msg) => {
      if (
        msg &&
        (msg.senderRole === "customer" ||
          msg.senderType === "customer" ||
          msg.sender === "customer" ||
          msg.senderRole === "client")
      ) {
        return;
      }

      if (!showChatRef.current) {
        setUnreadCount((prev) => prev + 1);
        try {
          const audio = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
          );
          audio.play().catch(() => {});
        } catch (e) {
          console.warn("Audio play blocked:", e);
        }
      }
    };

    socket.on("orderUpdated", handleOrderUpdate);
    socket.on("order_status_updated", handleOrderUpdate);
    socket.on("order:status_updated", handleOrderUpdate);
    socket.on("orderCancelled", handleOrderCancelled);
    socket.on("order:cancelled", handleOrderCancelled);
    socket.on("counter_offer_received", handleOrderUpdate);
    socket.on("counterOffer", handleOrderUpdate);
    socket.on("new_message", handleNewChatMessage);
    socket.on("new_chat_message", handleNewChatMessage);
    socket.on("receive_message", handleNewChatMessage);
    socket.on("chat_message", handleNewChatMessage);

    return () => {
      socket.emit("leave_order", `order_${orderId}`);
      socket.emit("leave_order", orderId);
      socket.off("orderUpdated", handleOrderUpdate);
      socket.off("order_status_updated", handleOrderUpdate);
      socket.off("order:status_updated", handleOrderUpdate);
      socket.off("orderCancelled", handleOrderCancelled);
      socket.off("order:cancelled", handleOrderCancelled);
      socket.off("counter_offer_received", handleOrderUpdate);
      socket.off("counterOffer", handleOrderUpdate);
      socket.off("new_message", handleNewChatMessage);
      socket.off("new_chat_message", handleNewChatMessage);
      socket.off("receive_message", handleNewChatMessage);
      socket.off("chat_message", handleNewChatMessage);
      socket.disconnect();
    };
  }, [activeOrder?._id]);

  if (!activeOrder) return null;

  const isRide = checkIsRide(activeOrder);

  // Lógica de contraofertas
  const counterOffers = activeOrder.counterOffers || [];
  const activeCounterOffer =
    counterOffers.length > 0
      ? counterOffers[counterOffers.length - 1]
      : activeOrder.pendingCounterOffer ||
        activeOrder.counterOffer ||
        (activeOrder.proposedPrice
          ? {
              proposedPrice: activeOrder.proposedPrice,
              driverName: activeOrder.driverName || activeOrder.driver?.name,
              driverId: activeOrder.driverId || activeOrder.driver?._id,
            }
          : null);

  const status = activeOrder.status;

  const hasCounterOffer =
    Boolean(activeCounterOffer) &&
    [
      "pending",
      "pending_driver",
      "counter_offer",
      "counter_offered",
      "negotiating",
    ].includes(status);

  const isPending =
    ["pending", "pending_driver"].includes(status) && !hasCounterOffer;

  const isAccepted = [
    "assigned",
    "accepted",
    "in_transit",
    "on_the_way",
    "at_store",
    "in_progress",
  ].includes(status);

  const isCompleted = status === "completed";

  // OBTENCIÓN ROBUSTA DE CONDUCTOR Y VEHÍCULO BASADA EN TU MODELO DE BASE DE DATOS
  const driverObj =
    typeof activeOrder.driver === "object"
      ? activeOrder.driver
      : typeof activeOrder.assignedDriver === "object"
        ? activeOrder.assignedDriver
        : typeof activeOrder.driverId === "object"
          ? activeOrder.driverId
          : {};

  const displayDriverName =
    activeOrder.driverName ||
    driverObj?.name ||
    driverObj?.fullName ||
    activeCounterOffer?.driverName ||
    "Conductor Asignado";

  // En la DB del conductor la propiedad exacta es vehiclePlate
  const displayPlate =
    driverObj?.vehiclePlate ||
    driverObj?.plateNumber ||
    driverObj?.plate ||
    driverObj?.placa ||
    driverObj?.vehicle?.vehiclePlate ||
    driverObj?.vehicle?.plate ||
    activeOrder?.vehiclePlate ||
    activeOrder?.plateNumber ||
    activeOrder?.driverVehiclePlate ||
    activeOrder?.plate ||
    activeOrder?.placa ||
    "Sin placa";

  // En la DB del conductor la propiedad exacta es vehicleType
  const displayVehicleType =
    driverObj?.vehicleType ||
    driverObj?.vehicle?.vehicleType ||
    driverObj?.vehicle?.type ||
    activeOrder?.vehicleType ||
    activeOrder?.driverVehicleType ||
    "Motocarro";

  const pinCode = activeOrder.deliveryPin || activeOrder.pinCode;

  const customerId =
    activeOrder.customer?._id ||
    activeOrder.customer?.id ||
    activeOrder.customerId ||
    "cliente";
  const customerName =
    activeOrder.customer?.name || activeOrder.customerName || "Cliente";

  // Origen y Destino
  const origenAddress =
    activeOrder.origen ||
    activeOrder.origenName ||
    activeOrder.address ||
    activeOrder.pickupAddress ||
    activeOrder.pickup ||
    activeOrder.from ||
    activeOrder.customer?.address ||
    "Ubicación cliente";

  const destinoAddress =
    activeOrder.destino ||
    activeOrder.destinoName ||
    activeOrder.destination ||
    activeOrder.destinationAddress ||
    activeOrder.deliveryAddress ||
    activeOrder.dropoff ||
    activeOrder.dropoffAddress ||
    activeOrder.to ||
    (typeof activeOrder.destination === "object"
      ? activeOrder.destination?.address || activeOrder.destination?.name
      : null) ||
    activeOrder.customer?.notes ||
    "Sin especificar";

  // Handlers
  const handleCancelOrder = async () => {
    if (!window.confirm("¿Deseas cancelar la solicitud de motocarro?")) return;

    setLoadingAction(true);
    try {
      const res = await fetch(`${API_URL}/orders/${activeOrder._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          reason: "Cancelado por el cliente",
        }),
      });

      if (res.ok) {
        localStorage.removeItem("activeOrderId");
        if (onCancelOrder) onCancelOrder(activeOrder._id);
        setActiveOrder(null);
      } else {
        const data = await res.json();
        alert(data.message || "No se pudo cancelar la carrera.");
      }
    } catch {
      alert("Error de conexión al cancelar.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAcceptCounterOffer = async () => {
    if (!activeCounterOffer) return;
    setLoadingAction(true);
    try {
      const res = await fetch(
        `${API_URL}/orders/${activeOrder._id}/accept-counter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId: activeCounterOffer.driverId,
            acceptedPrice: activeCounterOffer.proposedPrice,
          }),
        },
      );

      const data = await res.json();
      if (res.ok) {
        setActiveOrder(data.order || data);
      } else {
        alert(data.message || "No se pudo aceptar la contraoferta.");
      }
    } catch {
      alert("Error de conexión al aceptar oferta.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectCounterOffer = async () => {
    if (!activeCounterOffer) return;
    setLoadingAction(true);
    try {
      const res = await fetch(
        `${API_URL}/orders/${activeOrder._id}/reject-counter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId: activeCounterOffer.driverId }),
        },
      );

      const data = await res.json();
      if (res.ok) {
        setActiveOrder(data.order || data);
      } else {
        alert(data.message || "Error al rechazar la oferta.");
      }
    } catch {
      alert("Error de conexión al rechazar oferta.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRateDriver = async () => {
    setLoadingAction(true);
    try {
      await fetch(`${API_URL}/orders/${activeOrder._id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: ratingComment,
        }),
      });
      setRatingSubmitted(true);
    } catch (e) {
      console.error("Error al calificar:", e);
    } finally {
      setLoadingAction(false);
      setTimeout(() => {
        localStorage.removeItem("activeOrderId");
        setActiveOrder(null);
      }, 1500);
    }
  };

  const handleCloseCompleted = () => {
    localStorage.removeItem("activeOrderId");
    setActiveOrder(null);
  };

  return (
    <>
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 p-4 bg-white shadow-2xl rounded-3xl border border-orange-300 flex flex-col justify-between z-50"
        style={{
          maxWidth: "390px",
          width: "92%",
          boxShadow: "0 12px 30px -5px rgba(234, 88, 12, 0.25)",
        }}
      >
        <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-gray-100">
          <h6 className="m-0 font-extrabold text-sm text-gray-800 flex items-center gap-2">
            <span className="p-1 bg-orange-100 rounded-lg">🛺</span> Estado de
            tu Carrera
          </h6>
          <span
            className={`badge rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-wide ${
              hasCounterOffer
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white animate-bounce shadow-sm"
                : isPending
                  ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                  : isAccepted
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "bg-emerald-600 text-white"
            }`}
          >
            {hasCounterOffer && "¡Nueva Oferta Recibida!"}
            {isPending && "Buscando motocarro..."}
            {isAccepted && "En camino"}
            {isCompleted && "¡Finalizado!"}
          </span>
        </div>

        {/* Detalle de ruta (Origen y Destino) */}
        {!isCompleted && (
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 mb-2 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-gray-700">
              <span className="text-green-600 font-bold">📍 Origen:</span>
              <span className="truncate font-medium">{origenAddress}</span>
            </div>

            <div className="flex items-center gap-1.5 text-gray-700 border-t border-gray-200/80 pt-1">
              <span className="text-orange-600 font-bold">🏁 Destino:</span>
              <span className="truncate font-medium">{destinoAddress}</span>
            </div>
          </div>
        )}

        {/* Contraoferta */}
        {hasCounterOffer && activeCounterOffer && (
          <div className="my-2 p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-400 text-center shadow-sm">
            <p className="text-xs text-orange-950 font-bold mb-1">
              💬 Un motocarro te propone una tarifa:
            </p>
            <div className="flex justify-center items-baseline gap-1 my-1">
              <span className="text-2xl font-black text-orange-600">
                ${activeCounterOffer.proposedPrice?.toLocaleString()} COP
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mb-3">
              Ofrecido por:{" "}
              <strong>
                {activeCounterOffer.driverName || "Conductor cercano"}
              </strong>
            </p>

            <div className="flex gap-2">
              <button
                disabled={loadingAction}
                onClick={handleRejectCounterOffer}
                className="w-1/2 py-2 border border-red-500 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs"
              >
                Rechazar ❌
              </button>
              <button
                disabled={loadingAction}
                onClick={handleAcceptCounterOffer}
                className="w-1/2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                {loadingAction ? "Aceptando..." : "Aceptar Oferta 🤝"}
              </button>
            </div>
          </div>
        )}

        {/* Esperando Conductor */}
        {isPending && (
          <div className="text-center my-2 space-y-2">
            <div className="flex items-center justify-center gap-2 bg-amber-50 py-2 px-3 rounded-xl border border-amber-200">
              <div
                className="spinner-border text-warning spinner-border-sm"
                role="status"
              ></div>
              <p className="text-xs text-amber-900 font-semibold m-0">
                Buscando conductores en Inírida...
              </p>
            </div>

            <button
              disabled={loadingAction}
              onClick={handleCancelOrder}
              type="button"
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              {loadingAction ? "Cancelando..." : "🚫 Cancelar Carrera"}
            </button>
          </div>
        )}

        {/* Conductor en camino */}
        {isAccepted && (
          <div className="space-y-2.5 mt-1">
            {!isRide && pinCode && (
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl p-2.5 text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">
                  Tu PIN de Seguridad
                </span>
                <span className="text-2xl font-black tracking-widest block my-0.5">
                  {pinCode}
                </span>
                <p className="text-[10px] opacity-90 m-0">
                  Entrágaselo al conductor al abordar
                </p>
              </div>
            )}

            <div className="bg-gradient-to-br from-gray-50 to-orange-50/30 p-2.5 rounded-2xl border border-orange-100 text-xs space-y-1.5 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">👤 Conductor:</span>
                <strong className="text-gray-900 font-bold text-sm">
                  {displayDriverName}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">🛵 Vehículo:</span>
                <span className="font-bold text-gray-700 capitalize">
                  {displayVehicleType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">💳 Placa:</span>
                <span className="bg-gray-900 text-white px-2 py-1 font-mono rounded-lg tracking-wider text-[11px] font-bold">
                  {displayPlate}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                className={`w-full py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 shadow-md ${
                  unreadCount > 0
                    ? "bg-red-500 text-white animate-bounce ring-4 ring-red-200"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95"
                }`}
                style={{ border: "none" }}
                onClick={() => {
                  setUnreadCount(0);
                  setShowChat(true);
                }}
              >
                <i className="bi bi-chat-dots-fill text-sm"></i>
                <span>Abrir Chat App</span>

                {unreadCount > 0 && (
                  <span className="bg-white text-red-600 rounded-full px-2 py-0.5 font-black text-[10px] shadow-sm ml-1 truncate">
                    {unreadCount} NUEVO{unreadCount > 1 ? "S" : ""}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Carrera Finalizada / Formulario de Calificación */}
        {isCompleted && (
          <div className="text-center my-1 space-y-2">
            {ratingSubmitted ? (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                <span className="text-2xl">🎉</span>
                <p className="text-xs font-extrabold text-emerald-800 mb-0 mt-1">
                  ¡Gracias por calificar el servicio!
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-orange-200 text-center space-y-2">
                <p className="text-xs font-extrabold text-gray-800 m-0">
                  🎉 ¡Llegaste a tu destino!
                </p>
                <p className="text-[11px] text-gray-600 m-0">
                  ¿Cómo estuvo tu servicio con{" "}
                  <strong>{displayDriverName}</strong>?
                </p>

                {/* Calificación por estrellas */}
                <div className="flex justify-center gap-1 my-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-2xl cursor-pointer transition-transform active:scale-125 border-none bg-transparent"
                    >
                      {(hoverRating || rating) >= star ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Comentario breve (opcional)..."
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-gray-200 rounded-xl outline-none"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCloseCompleted}
                    className="w-1/3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border-none cursor-pointer"
                  >
                    Omitir
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={handleRateDriver}
                    className="w-2/3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl border-none shadow-xs cursor-pointer"
                  >
                    {loadingAction ? "Enviando..." : "Enviar Calificación 🚀"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showChat && (
        <OrderChatModal
          orderId={activeOrder._id}
          currentUserRole="customer"
          currentUserId={customerId}
          currentUserName={customerName}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}
