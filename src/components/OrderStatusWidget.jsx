import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import OrderChatModal from "./OrderChatModal";

const API_URL =
  import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com/api";

export default function OrderStatusWidget({
  activeOrder: initialOrder,
  onCancelOrder,
  customerIdProp, // Opcional: Para consultar si viene desde props
}) {
  const [activeOrder, setActiveOrder] = useState(initialOrder);
  const [showChat, setShowChat] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // 1. Guardar en localStorage cada vez que la orden cambie
  useEffect(() => {
    if (initialOrder) {
      setActiveOrder(initialOrder);
      localStorage.setItem("activeOrderId", initialOrder._id);
    }
  }, [initialOrder]);

  // 2. AUTO-RECUPERACIÓN: Si no hay initialOrder (ej. recarga de página), buscar orden activa
  useEffect(() => {
    if (activeOrder) return; // Si ya hay una orden cargada, no hacer nada

    const recoverActiveOrder = async () => {
      const storedOrderId = localStorage.getItem("activeOrderId");

      // Determinar ID del cliente desde la orden o props
      const targetCustomerId =
        customerIdProp || localStorage.getItem("userId") || "cliente";

      try {
        let res;
        // Estrategia A: Si tenemos un ID guardado en localStorage
        if (storedOrderId) {
          res = await fetch(`${API_URL}/orders/${storedOrderId}`);
        } else if (targetCustomerId && targetCustomerId !== "cliente") {
          // Estrategia B: Consultar por la orden activa del cliente en el backend
          res = await fetch(
            `${API_URL}/orders/active?customerId=${targetCustomerId}`,
          );
        }

        if (res && res.ok) {
          const data = await res.json();
          const foundOrder = data.order || data.activeOrder || data;

          // Si la orden devuelta aún no está finalizada ni cancelada, se recupera
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
        }
      } catch (error) {
        console.error("Error intentando recuperar la orden activa:", error);
      }
    };

    recoverActiveOrder();
  }, [activeOrder, customerIdProp]);

  // 3. Escuchar actualizaciones por WebSockets en tiempo real
  useEffect(() => {
    const orderId = activeOrder?._id;
    if (!orderId) return;

    const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");
    const socket = io(SOCKET_URL);

    socket.emit("join_order", `order_${orderId}`);
    socket.emit("join_order", orderId);

    const handleOrderUpdate = (updatedOrder) => {
      console.log("⚡ Orden actualizada en tiempo real:", updatedOrder);
      if (
        updatedOrder &&
        (updatedOrder._id === orderId || updatedOrder.orderId === orderId)
      ) {
        setActiveOrder((prev) => {
          const nextState = {
            ...prev,
            ...(typeof updatedOrder === "object" ? updatedOrder : {}),
          };

          // Si el estado pasa a finalizado o cancelado, limpiar localStorage
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

    socket.on("orderUpdated", handleOrderUpdate);
    socket.on("order_status_updated", handleOrderUpdate);
    socket.on("order:status_updated", handleOrderUpdate);
    socket.on("counter_offer_received", handleOrderUpdate);

    return () => {
      socket.off("orderUpdated", handleOrderUpdate);
      socket.off("order_status_updated", handleOrderUpdate);
      socket.off("order:status_updated", handleOrderUpdate);
      socket.off("counter_offer_received", handleOrderUpdate);
      socket.disconnect();
    };
  }, [activeOrder?._id]);

  if (!activeOrder) return null;

  // Función para cancelar la carrera activada desde el botón
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

      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem("activeOrderId"); // Limpiar almacenamiento al cancelar
        if (onCancelOrder) {
          onCancelOrder(activeOrder._id);
        }
        setActiveOrder(null);
      } else {
        alert(data.message || "No se pudo cancelar la carrera.");
      }
    } catch (error) {
      console.error("Error al cancelar la carrera:", error);
      alert("Error de conexión al intentar cancelar.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Extraer contraoferta pendiente (si existe)
  const counterOffers = activeOrder.counterOffers || [];
  const activeCounterOffer =
    counterOffers.length > 0
      ? counterOffers[counterOffers.length - 1]
      : activeOrder.pendingCounterOffer || activeOrder.counterOffer || null;

  // Aceptar la contraoferta enviada por el motocarro
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
      console.error("Error aceptando oferta:", error);
      alert("Error de conexión al aceptar la propuesta.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Rechazar la contraoferta enviada por el motocarro
  const handleRejectCounterOffer = async () => {
    if (!activeCounterOffer) return;
    setLoadingAction(true);
    try {
      const res = await fetch(
        `${API_URL}/orders/${activeOrder._id}/reject-counter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId: activeCounterOffer.driverId,
          }),
        },
      );

      const data = await res.json();
      if (res.ok) {
        setActiveOrder(data.order || data);
      } else {
        alert(data.message || "Error al rechazar la oferta.");
      }
    } catch (error) {
      console.error("Error rechazando oferta:", error);
      alert("Error de conexión al rechazar la propuesta.");
    } finally {
      setLoadingAction(false);
    }
  };

  // Normalizar datos del conductor asignado
  const driver =
    activeOrder.driverId || activeOrder.driver || activeOrder.assignedDriver;
  const status = activeOrder.status;

  // Normalizar PIN de seguridad
  const pinCode = activeOrder.deliveryPin || activeOrder.pinCode;

  // Mapeo de estados de la orden
  const hasCounterOffer =
    Boolean(activeCounterOffer) &&
    (status === "pending" ||
      status === "pending_driver" ||
      status === "counter_offer" ||
      status === "counter_offered");

  const isPending =
    (status === "pending" || status === "pending_driver") && !hasCounterOffer;

  const isAccepted =
    status === "assigned" ||
    status === "accepted" ||
    status === "in_transit" ||
    status === "on_the_way" ||
    status === "at_store" ||
    status === "in_progress";

  const isCompleted = status === "completed";

  // Identificadores para el modal del chat
  const customerId =
    activeOrder.customer?._id ||
    activeOrder.customer?.id ||
    activeOrder.customerId ||
    "cliente";
  const customerName =
    activeOrder.customer?.name || activeOrder.customerName || "Cliente";

  return (
    <>
      {/* Tarjeta Flotante del Cliente */}
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
              hasCounterOffer
                ? "bg-orange-500 text-white animate-bounce"
                : isPending
                  ? "bg-warning text-dark animate-pulse"
                  : isAccepted
                    ? "bg-success text-white"
                    : "bg-secondary"
            }`}
          >
            {hasCounterOffer && "¡Nueva Oferta Recibida!"}
            {isPending && "Buscando motocarro..."}
            {isAccepted && "Conductor en camino"}
            {isCompleted && "Carrera finalizada"}
          </span>
        </div>

        {/* ESTADO 0: NUEVA CONTRAOFERTA RECIBIDA */}
        {hasCounterOffer && activeCounterOffer && (
          <div className="my-2 p-3 bg-orange-50 rounded-2xl border-2 border-orange-400 text-center shadow-xs">
            <p className="text-xs text-orange-900 font-bold mb-1">
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
            <div className="flex items-center justify-center gap-2">
              <div
                className="spinner-border text-warning spinner-border-sm"
                role="status"
              ></div>
              <p className="text-xs text-gray-500 font-medium m-0">
                Notificando a conductores cercanos en Inírida...
              </p>
            </div>

            <button
              disabled={loadingAction}
              onClick={handleCancelOrder}
              type="button"
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 font-bold text-xs py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            >
              {loadingAction ? (
                <span>Cancelando carrera...</span>
              ) : (
                <>
                  <span>🚫</span> Cancelar Carrera
                </>
              )}
            </button>
          </div>
        )}

        {/* ESTADO 2: CONDUCTOR EN CAMINO */}
        {isAccepted && (
          <div className="space-y-2 mt-2">
            {pinCode && activeOrder.serviceType !== "ride" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 text-center">
                <span className="text-[10px] text-orange-800 font-bold uppercase tracking-wider block">
                  Tu PIN de Seguridad
                </span>
                <span className="text-xl font-black text-orange-600 tracking-widest">
                  {pinCode}
                </span>
                <p className="text-[10px] text-orange-700/80 m-0">
                  Entrégale este código al repartidor al recibir
                </p>
              </div>
            )}

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

            <div className="pt-1">
              <button
                type="button"
                className="btn btn-warning text-white btn-sm font-bold text-xs rounded-xl d-flex align-items-center justify-content-center gap-2 w-100 py-2 shadow-sm cursor-pointer"
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
