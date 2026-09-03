import { useState, useEffect, useRef, useCallback } from "react";

// Configuración de URL base para la API y WebSockets
const RAW_URL =
  import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com";
const API_BASE_URL = `${RAW_URL.replace(/\/api\/?$/, "")}`;

const FARE_FEE = 500; // Tarifa por servicio ($500 COP)

/**
 * Formatea el nombre para mantener la estética del UI.
 */
const formatDriverName = (fullName) => {
  if (!fullName || typeof fullName !== "string") return "Conductor";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "Conductor";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
};

/**
 * Función de normalización universal para órdenes de carrera.
 */
const normalizeOrder = (ord) => {
  if (!ord) return null;
  const item = ord?.items?.[0] || {};

  const pickupAddress =
    item.origen ||
    item.origin ||
    item.pickupAddress ||
    ord?.origen ||
    ord?.originAddress ||
    ord?.pickupAddress ||
    "Origen no especificado";

  const destinationAddress =
    item.detalle ||
    item.destino ||
    item.destination ||
    ord?.destino ||
    ord?.destinationAddress ||
    ord?.destination ||
    "Sin especificar";

  const fare = ord?.totalAmount || ord?.fare || ord?.precio || item?.price || 0;

  const originLat = ord?.originCoords?.lat || ord?.originLat || ord?.lat;
  const originLng = ord?.originCoords?.lng || ord?.originLng || ord?.lng;

  return {
    ...ord,
    id: ord._id || ord.id,
    pickupAddress,
    destinationAddress,
    fare,
    originCoords:
      originLat && originLng
        ? { lat: Number(originLat), lng: Number(originLng) }
        : null,
  };
};

export function useDriverDashboard({
  driverName = "Conductor",
  driverId,
  socket,
}) {
  const validDriverId =
    driverId && driverId.length === 24 ? driverId : "650000000000000000000001";

  // Buscar nombre guardado en localStorage como respaldo rápido
  const getSavedName = () => {
    try {
      const saved = localStorage.getItem("driver_name");
      if (saved && saved !== "Conductor") return formatDriverName(saved);
    } catch (e) {}
    return formatDriverName(driverName);
  };

  // ---------------------------------------------------------------------------
  // ESTADOS PRINCIPALES Y PERSISTENCIA POR CONDUCTOR
  // ---------------------------------------------------------------------------
  const [driverNameState, setDriverNameState] = useState(getSavedName);

  const [isOnline, setIsOnline] = useState(() => {
    try {
      const saved = localStorage.getItem(`driver_is_online_${validDriverId}`);
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(`activeOrders_${validDriverId}`);
      return saved ? JSON.parse(saved).map(normalizeOrder) : [];
    } catch (e) {
      return [];
    }
  });

  // Saldo de billetera con persistencia local
  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      const savedBalance = localStorage.getItem(
        `walletBalance_${validDriverId}`,
      );
      if (savedBalance !== null && !isNaN(Number(savedBalance))) {
        return Number(savedBalance);
      }
    } catch (e) {}
    return 19500;
  });

  // Estados para el Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetOrder, setChatTargetOrder] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const chatEndRef = useRef(null);

  // ---------------------------------------------------------------------------
  // SINCRONIZACIÓN PERFIL Y DATOS DE BD (Nombre y Saldo)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (
      !validDriverId ||
      validDriverId === "650000000000000000000001" ||
      validDriverId.startsWith("drv_")
    ) {
      if (driverName && driverName !== "Conductor") {
        setDriverNameState(formatDriverName(driverName));
      }
      return;
    }

    const fetchDriverProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/drivers/${validDriverId}`);
        if (res.ok) {
          const data = await res.json();

          if (data && typeof data.walletBalance === "number") {
            setWalletBalance(data.walletBalance);
          }

          const rawName = data.name || data.driver?.name || driverName;
          if (rawName && rawName !== "Conductor") {
            setDriverNameState(formatDriverName(rawName));
          }
        }
      } catch (err) {
        console.error("Error al obtener el perfil del conductor:", err);
      }
    };

    fetchDriverProfile();
  }, [validDriverId, driverName]);

  // Guardar persistencia local
  useEffect(() => {
    try {
      localStorage.setItem(
        `activeOrders_${validDriverId}`,
        JSON.stringify(activeOrders),
      );
    } catch (e) {
      console.error("Error guardando activeOrders:", e);
    }
  }, [activeOrders, validDriverId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `driver_is_online_${validDriverId}`,
        JSON.stringify(isOnline),
      );
    } catch (e) {
      console.error("Error guardando isOnline:", e);
    }
  }, [isOnline, validDriverId]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `walletBalance_${validDriverId}`,
        walletBalance.toString(),
      );
    } catch (e) {
      console.error("Error guardando walletBalance:", e);
    }
  }, [walletBalance, validDriverId]);

  // ---------------------------------------------------------------------------
  // GEOLOCALIZACIÓN Y GPS EN TIEMPO REAL
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isOnline) {
      setCurrentCoords(null);
      setGpsAccuracy(null);
      return;
    }

    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setCurrentCoords(coords);
          setGpsAccuracy(pos.coords.accuracy);

          if (socket && socket.connected) {
            socket.emit("update_driver_location", {
              driverId: validDriverId,
              driverName: driverNameState,
              lat: coords.lat,
              lng: coords.lng,
              activeOrderIds: activeOrders.map((o) => o._id || o.id),
              isOnline: true,
            });
          }
        },
        (err) => {
          console.error("Error obteniendo ubicación GPS:", err);
          setError("No se pudo obtener la ubicación GPS en tiempo real.");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setError("La geolocalización no está soportada en este dispositivo.");
    }
  }, [isOnline, socket, validDriverId, driverNameState, activeOrders]);

  // ---------------------------------------------------------------------------
  // CARGA DE ÓRDENES (DISPONIBLES Y ACTIVAS DESDE BACKEND)
  // ---------------------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/orders/available`);
      let fetchedAvailable = [];
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : data?.orders || [];
        fetchedAvailable = rawList.map(normalizeOrder);
      } else if (res.status === 404) {
        fetchedAvailable = [];
      }

      const activeRes = await fetch(
        `${API_BASE_URL}/api/orders/driver-active/${validDriverId}`,
      );

      let activeList = [];
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        if (Array.isArray(activeData)) {
          activeList = activeData.map(normalizeOrder);
        } else if (activeData && (activeData._id || activeData.id)) {
          activeList = [normalizeOrder(activeData)];
        } else if (activeData?.orders && Array.isArray(activeData.orders)) {
          activeList = activeData.orders.map(normalizeOrder);
        }
      }

      if (activeList.length > 0) {
        setActiveOrders(activeList);

        if (socket && socket.connected) {
          activeList.forEach((ord) => {
            const cleanId = (ord._id || ord.id || "")
              .toString()
              .replace(/^order_/, "");
            socket.emit("join_order", cleanId);
            socket.emit("join", cleanId);
          });
        }
      } else {
        const savedLocal = localStorage.getItem(
          `activeOrders_${validDriverId}`,
        );
        if (savedLocal) {
          try {
            const parsedLocal = JSON.parse(savedLocal);
            const pendingOrActive = parsedLocal
              .filter(
                (o) => o.status !== "completed" && o.status !== "cancelled",
              )
              .map(normalizeOrder);

            setActiveOrders(pendingOrActive);
          } catch (e) {
            setActiveOrders([]);
          }
        } else {
          setActiveOrders([]);
        }
      }

      const activeIds = activeList.map((o) => (o._id || o.id || "").toString());
      const filteredAvailable = fetchedAvailable.filter(
        (ord) => !activeIds.includes((ord._id || ord.id || "").toString()),
      );

      setAvailableOrders(filteredAvailable);
    } catch (err) {
      console.warn("Consulta de órdenes vacía o inaccesible:", err);
    } finally {
      setLoading(false);
    }
  }, [validDriverId, socket]);

  useEffect(() => {
    if (isOnline) {
      fetchOrders();
    }
  }, [isOnline, fetchOrders]);

  useEffect(() => {
    if (socket && socket.connected && activeOrders.length > 0) {
      activeOrders.forEach((ord) => {
        const cleanId = (ord._id || ord.id || "")
          .toString()
          .replace(/^order_/, "");
        socket.emit("join_order", cleanId);
        socket.emit("join", cleanId);
      });
    }
  }, [socket, socket?.connected, activeOrders]);

  // ---------------------------------------------------------------------------
  // MANEJADORES DE CARRERAS (ACEPTAR Y CAMBIAR ESTADO)
  // ---------------------------------------------------------------------------
  const handleAcceptOrder = async (orderOrId) => {
    if (walletBalance < FARE_FEE) {
      setError(
        `Saldo insuficiente ($${walletBalance} COP). Recarga tu billetera para aceptar carreras.`,
      );
      return;
    }

    if (activeOrders.length >= 2) {
      setError("Ya tienes el límite máximo de 2 carreras activas.");
      return;
    }

    const rawId =
      typeof orderOrId === "object"
        ? orderOrId?._id || orderOrId?.id
        : orderOrId;

    if (!rawId) {
      setError("No se pudo identificar la carrera seleccionada.");
      return;
    }

    setLoading(true);
    setError("");
    const cleanId = rawId.toString().replace(/^order_/, "");

    try {
      if (socket && socket.connected) {
        socket.emit("join_order", cleanId);
        socket.emit("join", cleanId);
        socket.emit("accept_order", {
          orderId: cleanId,
          driverId: validDriverId,
          driverName: driverNameState,
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/orders/take/${cleanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: validDriverId,
          driverName: driverNameState,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "No se pudo tomar la carrera.");
        return;
      }

      const baseObject =
        typeof orderOrId === "object"
          ? orderOrId
          : availableOrders.find(
              (o) => (o._id || o.id || "").toString() === cleanId,
            ) || {};

      const takenOrder = normalizeOrder(
        data.order || {
          ...baseObject,
          id: cleanId,
          _id: cleanId,
          status: "on_the_way",
        },
      );

      setActiveOrders((prev) => [...prev, takenOrder]);
      setAvailableOrders((prev) =>
        prev.filter((o) => (o._id || o.id || "").toString() !== cleanId),
      );
    } catch (err) {
      console.error("Error al tomar carrera:", err);
      setError(err.message || "Error de conexión al aceptar la carrera.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (arg1, arg2) => {
    const knownStatuses = [
      "COMPLETED",
      "completed",
      "completado",
      "CANCELLED",
      "cancelled",
      "cancelado",
      "ON_THE_WAY",
      "on_the_way",
      "ARRIVED",
      "arrived",
      "IN_PROGRESS",
      "in_progress",
    ];

    let targetOrderId = null;
    let rawStatus = "";

    if (knownStatuses.includes(arg1)) {
      rawStatus = arg1;
      targetOrderId = arg2;
    } else if (knownStatuses.includes(arg2)) {
      targetOrderId = arg1;
      rawStatus = arg2;
    } else {
      targetOrderId = arg1;
      rawStatus = arg2 || "completed";
    }

    const orderToUpdate = targetOrderId
      ? activeOrders.find(
          (o) => (o._id || o.id || "").toString() === targetOrderId.toString(),
        )
      : activeOrders[0];

    if (!orderToUpdate) return;
    const orderId = orderToUpdate._id || orderToUpdate.id;
    const cleanId = orderId.toString().replace(/^order_/, "");

    const statusMapper = {
      COMPLETED: "completed",
      completed: "completed",
      completado: "completed",
      CANCELLED: "cancelled",
      cancelled: "cancelled",
      cancelado: "cancelled",
      ON_THE_WAY: "on_the_way",
      ARRIVED: "arrived",
      IN_PROGRESS: "in_progress",
    };

    const finalStatus = statusMapper[rawStatus] || rawStatus.toLowerCase();

    setLoading(true);
    setError("");

    try {
      if (socket && socket.connected) {
        socket.emit("update_order_status", {
          orderId: cleanId,
          status: finalStatus,
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/orders/${cleanId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: finalStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Error actualizando el estado.");
      }

      const formattedStatus = finalStatus.toLowerCase();

      if (formattedStatus === "completed") {
        if (typeof data.newBalance === "number") {
          setWalletBalance(data.newBalance);
          try {
            localStorage.setItem(
              `walletBalance_${validDriverId}`,
              data.newBalance.toString(),
            );
          } catch (e) {}
        } else {
          setWalletBalance((prev) => {
            const updated = Math.max(0, prev - FARE_FEE);
            try {
              localStorage.setItem(
                `walletBalance_${validDriverId}`,
                updated.toString(),
              );
            } catch (e) {}
            return updated;
          });
        }
      }

      if (formattedStatus === "completed" || formattedStatus === "cancelled") {
        setActiveOrders((prev) =>
          prev.filter(
            (o) => (o._id || o.id || "").toString() !== orderId.toString(),
          ),
        );
        if (
          chatTargetOrder &&
          (chatTargetOrder._id || chatTargetOrder.id || "").toString() ===
            orderId.toString()
        ) {
          setIsChatOpen(false);
          setChatMessages([]);
          setChatTargetOrder(null);
        }
      } else {
        setActiveOrders((prev) =>
          prev.map((o) =>
            (o._id || o.id || "").toString() === orderId.toString()
              ? { ...o, status: finalStatus }
              : o,
          ),
        );
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      setError(err.message || "Error al cambiar el estado de la carrera.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // WEBSOCKETS EN TIEMPO REAL (CANCELACIONES Y ACTUALIZACIONES)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!socket || !isOnline) return;

    socket.emit("register_driver", {
      driverId: validDriverId,
      driverName: driverNameState,
    });

    const handleNewOrder = (newOrder) => {
      const normalized = normalizeOrder(newOrder);
      if (!normalized) return;

      setAvailableOrders((prev) => {
        const orderId = (normalized._id || normalized.id || "").toString();
        const exists = prev.some(
          (o) => (o._id || o.id || "").toString() === orderId,
        );
        if (exists) return prev;
        return [normalized, ...prev];
      });
    };

    // Manejador unificado de eliminación/cancelación de órdenes por el cliente
    const handleOrderCancelled = (data) => {
      if (!data) return;
      const orderId = (
        data.orderId ||
        data._id ||
        data.id ||
        data.order?._id ||
        data.order?.id ||
        ""
      )
        .toString()
        .replace(/^order_/, "");

      if (!orderId) return;

      // 1. Quitar de disponibles inmediatamente
      setAvailableOrders((prev) =>
        prev.filter(
          (o) =>
            (o._id || o.id || "").toString().replace(/^order_/, "") !== orderId,
        ),
      );

      // 2. Quitar de activas si el conductor la tenía aceptada y lanzar advertencia
      setActiveOrders((prev) => {
        const wasActive = prev.some(
          (o) =>
            (o._id || o.id || "").toString().replace(/^order_/, "") === orderId,
        );

        // Solo si la carrera NO fue completada explícitamente mostramos el error
        if (wasActive && data.status !== "completed") {
          setError(
            "Una de tus carreras en curso fue cancelada por el cliente.",
          );
        }

        return prev.filter(
          (o) =>
            (o._id || o.id || "").toString().replace(/^order_/, "") !== orderId,
        );
      });

      // 3. Cerrar chat si estaba abierto para esta orden
      if (
        chatTargetOrder &&
        (chatTargetOrder._id || chatTargetOrder.id || "")
          .toString()
          .replace(/^order_/, "") === orderId
      ) {
        setIsChatOpen(false);
        setChatMessages([]);
        setChatTargetOrder(null);
      }
    };

    // Manejador cuando otro conductor toma la carrera
    const handleOrderTaken = (data) => {
      const orderId = (
        data?.orderId ||
        data?.order?._id ||
        data?.order?.id ||
        ""
      )
        .toString()
        .replace(/^order_/, "");
      if (!orderId) return;

      // Remover de disponibles para los demás conductores
      setAvailableOrders((prev) =>
        prev.filter(
          (o) =>
            (o._id || o.id || "").toString().replace(/^order_/, "") !== orderId,
        ),
      );
    };

    const handleStatusUpdated = (data) => {
      if (!data) return;
      const orderId = (data.orderId || data._id || data.id || "")
        .toString()
        .replace(/^order_/, "");
      const newStatus = (data.status || "").toLowerCase();

      if (newStatus === "completed") {
        // Remover de carreras activas limpiamente
        setActiveOrders((prev) =>
          prev.filter(
            (o) =>
              (o._id || o.id || "").toString().replace(/^order_/, "") !==
              orderId,
          ),
        );
        // Cerrar chat si corresponde
        if (
          chatTargetOrder &&
          (chatTargetOrder._id || chatTargetOrder.id || "")
            .toString()
            .replace(/^order_/, "") === orderId
        ) {
          setIsChatOpen(false);
          setChatMessages([]);
          setChatTargetOrder(null);
        }
      } else if (["cancelled", "cancelado"].includes(newStatus)) {
        handleOrderCancelled({ orderId, status: "cancelled" });
      } else {
        // Actualizar estado en tiempo real (on_the_way, arrived, etc.)
        setActiveOrders((prev) =>
          prev.map((o) =>
            (o._id || o.id || "").toString().replace(/^order_/, "") === orderId
              ? { ...o, status: data.status }
              : o,
          ),
        );
      }
    };

    const handleReceiveMessage = (msg) => {
      if (!msg) return;

      const incomingText = msg.text || msg.message;
      const incomingSender = msg.senderType || msg.sender;
      const msgOrderId = (msg.orderId || "").toString().replace(/^order_/, "");

      setChatMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (
          lastMsg &&
          (lastMsg.text || lastMsg.message) === incomingText &&
          (lastMsg.senderType || lastMsg.sender) === incomingSender
        ) {
          return prev;
        }
        return [...prev, { ...msg, orderId: msgOrderId }];
      });
    };

    const handleWalletUpdated = (data) => {
      if (typeof data?.newBalance === "number") {
        setWalletBalance(data.newBalance);
      }
    };

    // Registro de Listeners WebSockets
    socket.on("new_order", handleNewOrder);
    socket.on("order_created", handleNewOrder);
    socket.on("order:created", handleNewOrder);

    socket.on("order_cancelled", handleOrderCancelled);
    socket.on("order:cancelled", handleOrderCancelled);
    socket.on("orderCancelled", handleOrderCancelled);

    socket.on("order:taken", handleOrderTaken);
    socket.on("order_taken", handleOrderTaken);

    socket.on("order_status_updated", handleStatusUpdated);
    socket.on("orderUpdated", handleStatusUpdated);
    socket.on("order_updated", handleStatusUpdated);
    socket.on("order:status_updated", handleStatusUpdated);

    socket.off("receive_message");
    socket.on("receive_message", handleReceiveMessage);
    socket.on("wallet_updated", handleWalletUpdated);

    return () => {
      socket.off("new_order", handleNewOrder);
      socket.off("order_created", handleNewOrder);
      socket.off("order:created", handleNewOrder);

      socket.off("order_cancelled", handleOrderCancelled);
      socket.off("order:cancelled", handleOrderCancelled);
      socket.off("orderCancelled", handleOrderCancelled);

      socket.off("order:taken", handleOrderTaken);
      socket.off("order_taken", handleOrderTaken);

      socket.off("order_status_updated", handleStatusUpdated);
      socket.off("orderUpdated", handleStatusUpdated);
      socket.off("order_updated", handleStatusUpdated);
      socket.off("order:status_updated", handleStatusUpdated);

      socket.off("receive_message", handleReceiveMessage);
      socket.off("wallet_updated", handleWalletUpdated);
    };
  }, [socket, isOnline, validDriverId, driverNameState, chatTargetOrder]);

  // Auto-scroll del chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // ---------------------------------------------------------------------------
  // CHAT ACCIONES Y UTILIDAD
  // ---------------------------------------------------------------------------
  const handleOpenChat = (order) => {
    setChatTargetOrder(order);
    setIsChatOpen(true);

    const cleanId = (order._id || order.id || "")
      .toString()
      .replace(/^order_/, "");
    if (socket && socket.connected) {
      socket.emit("join_order", cleanId);
      socket.emit("join", cleanId);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !chatTargetOrder) return;

    const rawId = chatTargetOrder._id || chatTargetOrder.id;
    const cleanId = rawId.toString().replace(/^order_/, "");

    const newMsg = {
      orderId: cleanId,
      senderType: "driver",
      sender: "driver",
      text: newMessageText.trim(),
      message: newMessageText.trim(),
      timestamp: new Date().toISOString(),
    };

    if (socket && socket.connected) {
      socket.emit("send_message", newMsg);
    }

    setNewMessageText("");
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  return {
    driverName: driverNameState,
    isOnline,
    setIsOnline,
    gpsAccuracy,
    error,
    setError,
    loading,
    availableOrders,
    activeOrders,
    walletBalance,
    setWalletBalance,
    currentCoords,
    fetchOrders,
    handleAcceptOrder,
    handleUpdateStatus,
    isChatOpen,
    setIsChatOpen,
    chatTargetOrder,
    chatMessages,
    newMessageText,
    setNewMessageText,
    handleOpenChat,
    handleSendMessage,
    chatEndRef,
    calculateDistance,
  };
}
