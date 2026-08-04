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

  // Ref para rastrear el estado del modal sin re-renderizar sockets
  const showChatRef = useRef(showChat);
  useEffect(() => {
    showChatRef.current = showChat;
    if (showChat) {
      setUnreadCount(0); // Limpiar mensajes no leídos si el modal está abierto
    }
  }, [showChat]);

  // 1. Guardar en localStorage cuando llega una orden inicial
  useEffect(() => {
    if (initialOrder && initialOrder._id) {
      setActiveOrder(initialOrder);
      localStorage.setItem("activeOrderId", initialOrder._id);
    }
  }, [initialOrder]);

  // 2. AUTO-RECUPERACIÓN: Si no hay activeOrder al cargar o recargar la página
  useEffect(() => {
    if (activeOrder && activeOrder._id) return;

    const recoverActiveOrder = async () => {
      const storedOrderId = localStorage.getItem("activeOrderId");
      const targetCustomerId =
        customerIdProp || localStorage.getItem("userId") || "cliente";

      // 🛑 VALIDACIÓN BLINDADA: Evita hacer fetch con valores inválidos o "undefined"
      if (
        !storedOrderId ||
        storedOrderId === "undefined" ||
        storedOrderId === "null" ||
        storedOrderId.trim() === ""
      ) {
        localStorage.removeItem("activeOrderId");
        return;
      }

      try {
        let res;
        if (storedOrderId) {
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
            foundOrder.status !== "completed" &&
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
        console.error("Error al recuperar orden:", error);
      }
    };

    recoverActiveOrder();
  }, [activeOrder, customerIdProp]);

  // 3. Escuchar WebSockets (Actualizaciones de Orden + Mensajes del Chat + Contraofertas)
  useEffect(() => {
    const orderId = activeOrder?._id;
    if (!orderId) return;

    const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.emit("join_order", `order_${orderId}`);
    socket.emit("join_order", orderId);

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

          if (
            nextState.status === "completed" ||
            nextState.status === "cancelled"
          ) {
            localStorage.removeItem("activeOrderId");
          }

          return nextState;
        });
      }
    };

    // Listener para nuevos mensajes en el Chat
    const handleNewChatMessage = (msg) => {
      if (
        msg &&
        (msg.senderRole === "customer" ||
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
          console.warn("Audio error:", e);
        }
      }
    };

    // Subscripción de eventos
    socket.on("orderUpdated", handleOrderUpdate);
    socket.on("order_status_updated", handleOrderUpdate);
    socket.on("order:status_updated", handleOrderUpdate);
    socket.on("counter_offer_received", handleOrderUpdate);
    socket.on("counterOffer", handleOrderUpdate);

    // Eventos de mensajes
    socket.on("new_message", handleNewChatMessage);
    socket.on("receive_message", handleNewChatMessage);
    socket.on("chat_message", handleNewChatMessage);

    return () => {
      socket.off("orderUpdated", handleOrderUpdate);
      socket.off("order_status_updated", handleOrderUpdate);
      socket.off("order:status_updated", handleOrderUpdate);
      socket.off("counter_offer_received", handleOrderUpdate);
      socket.off("counterOffer", handleOrderUpdate);
      socket.off("new_message", handleNewChatMessage);
      socket.off("receive_message", handleNewChatMessage);
      socket.off("chat_message", handleNewChatMessage);
      socket.disconnect();
    };
  }, [activeOrder?._id]);

  if (!activeOrder) return null;

  // Lógica de detección de contraofertas robusta
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

  const driver =
    activeOrder.driverId || activeOrder.driver || activeOrder.assignedDriver;
  const pinCode = activeOrder.deliveryPin || activeOrder.pinCode;

  const customerId =
    activeOrder.customer?._id ||
    activeOrder.customer?.id ||
    activeOrder.customerId ||
    "cliente";
  const customerName =
    activeOrder.customer?.name || activeOrder.customerName || "Cliente";

  // Acciones de la orden
  const handleCancelOrder = async () => {
    const confirmCancel = window.confirm(
      "¿Estás seguro de que deseas cancelar la solicitud de motocarro?",
    );
    if (!confirmCancel) return;

    setLoadingAction(true);
    try {
      const res = await fetch(`${API_URL}/orders/${activeOrder._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelado por el cliente" }),
      });

      if (res.ok) {
        localStorage.removeItem("activeOrderId");
        if (onCancelOrder) onCancelOrder(activeOrder._id);
        setActiveOrder(null);
      } else {
        const data = await res.json();
        alert(data.message || "No se pudo cancelar la carrera.");
      }
    } catch (error) {
      alert("Error de conexión al intentar cancelar.");
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
    } catch (error) {
      alert("Error de conexión al aceptar la propuesta.");
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
    } catch (error) {
      alert("Error de conexión al rechazar la propuesta.");
    } finally {
      setLoadingAction(false);
    }
  };

  const openChatModal = () => {
    setUnreadCount(0);
    setShowChat(true);
  };

  return (
    <>
      {/* Tarjeta Flotante del Cliente */}
      <div
        className="position-fixed bottom-0 start-50 translate-middle-x mb-4 p-3.5 bg-white shadow-2xl rounded-3xl border border-orange-300 flex flex-col justify-between"
        style={{
          zIndex: 1040,
          maxWidth: "390px",
          width: "92%",
          boxShadow: "0 12px 30px -5px rgba(234, 88, 12, 0.25)",
        }}
      >
        {/* Cabecera del Estado */}
        <div className="d-flex justify-content-between align-items-center mb-2.5 pb-2 border-b border-gray-100">
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
                    : "bg-gray-500 text-white"
            }`}
          >
            {hasCounterOffer && "¡Nueva Oferta Recibida!"}
            {isPending && "Buscando motocarro..."}
            {isAccepted && "En camino"}
            {isCompleted && "Carrera finalizada"}
          </span>
        </div>

        {/* ESTADO 0: NUEVA CONTRAOFERTA RECIBIDA */}
        {hasCounterOffer && activeCounterOffer && (
          <div className="my-2 p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-400 text-center shadow-sm">
            <p className="text-xs text-orange-950 font-bold mb-1">
              💬 Un motocarro te propone una tarifa:
            </p>
            <div className="d-flex justify-content-center align-items-baseline gap-1 my-1">
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

            <div className="d-flex gap-2">
              <button
                disabled={loadingAction}
                onClick={handleRejectCounterOffer}
                className="btn btn-outline-danger btn-sm w-50 rounded-xl font-bold text-xs py-2"
              >
                Rechazar ❌
              </button>
              <button
                disabled={loadingAction}
                onClick={handleAcceptCounterOffer}
                className="btn btn-success btn-sm w-50 rounded-xl font-bold text-xs py-2 shadow-sm text-white"
                style={{ backgroundColor: "#16a34a", borderColor: "#15803d" }}
              >
                {loadingAction ? "Aceptando..." : "Aceptar Oferta 🤝"}
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 1: BUSCANDO CONDUCTOR */}
        {isPending && (
          <div className="text-center my-3 space-y-3">
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

        {/* ESTADO 2: CONDUCTOR EN CAMINO */}
        {isAccepted && (
          <div className="space-y-3 mt-1">
            {pinCode && activeOrder.serviceType !== "ride" && (
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

            {/* Ficha del Conductor */}
            <div className="bg-gradient-to-br from-gray-50 to-orange-50/30 p-3 rounded-2xl border border-orange-100 text-xs space-y-1.5 shadow-xs">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-gray-500 font-medium">👤 Conductor:</span>
                <strong className="text-gray-900 font-bold text-sm">
                  {driver?.name || driver?.fullName || "Asignado"}
                </strong>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-gray-500 font-medium">🛵 Vehículo:</span>
                <span className="font-bold text-gray-700 capitalize">
                  {driver?.vehicleType || "Motocarro"}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-gray-500 font-medium">💳 Placa:</span>
                <span className="badge bg-dark text-white px-2.5 py-1 font-mono rounded-lg tracking-wider">
                  {driver?.plateNumber || driver?.plate || "MTC-001"}
                </span>
              </div>
            </div>

            {/* BOTÓN DE CHAT CON NOTIFICACIÓN/BADGE */}
            <div className="pt-0.5">
              <button
                type="button"
                className={`btn w-100 py-2.5 px-3 rounded-2xl font-bold text-xs d-flex align-items-center justify-content-center gap-2 transition-all duration-300 shadow-md ${
                  unreadCount > 0
                    ? "bg-red-500 text-white animate-bounce ring-4 ring-red-200"
                    : "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-95"
                }`}
                style={{ border: "none" }}
                onClick={openChatModal}
              >
                <i className="bi bi-chat-dots-fill text-sm"></i>
                <span>Abrir Chat App</span>

                {unreadCount > 0 && (
                  <span className="badge bg-white text-red-600 rounded-full px-2 py-0.5 font-black text-[11px] shadow-sm ml-1">
                    {unreadCount} NUEVO{unreadCount > 1 ? "S" : ""}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ESTADO 3: CARRERA FINALIZADA */}
        {isCompleted && (
          <div className="text-center my-2 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
            <span className="text-xl">🎉</span>
            <p className="text-xs font-bold text-emerald-800 mb-0 mt-1">
              ¡Llegaste a tu destino con éxito!
            </p>
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
