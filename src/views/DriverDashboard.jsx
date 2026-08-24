import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Power,
  X,
  Clock,
  RefreshCw,
  MapPin,
  Navigation,
  CheckCircle,
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import ActiveOrderCard from "../components/ActiveTripCard";

// ============================================================================
// CONFIGURACIÓN DE ENDPOINTS
// ============================================================================
const API_BASE_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://inirida-express.onrender.com");

export default function DriverDashboard({
  driverName = "Conductor",
  driverId,
  socket,
  onLogout,
}) {
  // ID de Conductor Validador
  const validDriverId =
    driverId && driverId.length === 24 ? driverId : "650000000000000000000001";

  // --------------------------------------------------------------------------
  // ESTADOS GENERALES Y GPS
  // --------------------------------------------------------------------------
  const [isOnline, setIsOnline] = useState(true);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------------------------------
  // ESTADOS DE ÓRDENES Y UI (Persistencia inicial desde localStorage)
  // --------------------------------------------------------------------------
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(`activeOrders_${validDriverId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error leyendo activeOrders de localStorage:", e);
      return [];
    }
  });

  // Guardar en localStorage cada vez que activeOrders cambie
  useEffect(() => {
    try {
      localStorage.setItem(
        `activeOrders_${validDriverId}`,
        JSON.stringify(activeOrders),
      );
    } catch (e) {
      console.error("Error guardando activeOrders en localStorage:", e);
    }
  }, [activeOrders, validDriverId]);

  // --------------------------------------------------------------------------
  // ESTADOS Y REFERENCIAS DEL CHAT EN VIVO
  // --------------------------------------------------------------------------
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetOrder, setChatTargetOrder] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const chatEndRef = useRef(null);

  // --------------------------------------------------------------------------
  // FUNCIÓN AUXILIAR: Cálculo de distancia (Haversine)
  // --------------------------------------------------------------------------
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radio de la tierra en KM
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

  // --------------------------------------------------------------------------
  // 1. CARGA DE ÓRDENES Y PERSISTENCIA DESDE EL BACKEND
  // --------------------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Consultar carreras disponibles
      const res = await fetch(`${API_BASE_URL}/api/orders/available`);
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(Array.isArray(data) ? data : data?.orders || []);
      } else if (res.status === 404) {
        setAvailableOrders([]);
      }

      // Persistencia Backend: Consultar carreras activas asignadas a este conductor
      const activeRes = await fetch(
        `${API_BASE_URL}/api/orders/driver-active/${validDriverId}`,
      );

      if (activeRes.ok) {
        const activeData = await activeRes.json();

        // Normalizar respuesta (sea objeto único, arreglo o nulo)
        let activeList = [];
        if (Array.isArray(activeData)) {
          activeList = activeData;
        } else if (activeData && activeData._id) {
          activeList = [activeData];
        } else if (activeData?.orders && Array.isArray(activeData.orders)) {
          activeList = activeData.orders;
        }

        // Si el backend responde una orden activa válida, actualizamos el estado
        if (activeList.length > 0) {
          setActiveOrders(activeList);

          // Unir socket a las salas de las órdenes activas
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
          // PROTETOR DE PERSISTENCIA:
          // Si el backend da vacío, solo limpiamos si en localStorage la orden ya estaba completada/cancelada
          const savedLocal = localStorage.getItem(
            `activeOrders_${validDriverId}`,
          );
          if (savedLocal) {
            try {
              const parsedLocal = JSON.parse(savedLocal);
              if (
                parsedLocal.length > 0 &&
                (parsedLocal[0].status === "completed" ||
                  parsedLocal[0].status === "cancelled")
              ) {
                setActiveOrders([]);
              }
            } catch (e) {
              console.error("Error leyendo caché local:", e);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Consulta de órdenes vacía o endpoint inaccesible:", err);
    } finally {
      setLoading(false);
    }
  }, [validDriverId, socket]);

  useEffect(() => {
    if (isOnline) {
      fetchOrders();
    }
  }, [isOnline, fetchOrders]);

  // Re-vincular salas de Sockets tras reconexiones
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

  // --------------------------------------------------------------------------
  // 2. ESCUCHAR EVENTOS EN TIEMPO REAL (WEBSOCKETS)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!socket || !isOnline) return;

    // Registrar conductor en el servidor WebSocket
    socket.emit("register_driver", {
      driverId: validDriverId,
      driverName,
    });

    const handleNewOrder = (newOrder) => {
      setAvailableOrders((prev) => {
        const orderId = newOrder._id || newOrder.id;
        const exists = prev.some((o) => (o._id || o.id) === orderId);
        if (exists) return prev;
        return [newOrder, ...prev];
      });
    };

    const handleOrderCancelled = (data) => {
      const orderId = data.orderId || data._id;
      setAvailableOrders((prev) =>
        prev.filter((o) => (o._id || o.id) !== orderId),
      );

      setActiveOrders((prev) => {
        const wasActive = prev.some((o) => (o._id || o.id) === orderId);
        if (wasActive) {
          setError(
            "Una de tus carreras en curso fue cancelada por el cliente.",
          );
        }
        return prev.filter((o) => (o._id || o.id) !== orderId);
      });
    };

    const handleStatusUpdated = (data) => {
      const orderId = data.orderId || data._id;
      const newStatus = data.status;

      if (["completed", "cancelled"].includes(newStatus?.toLowerCase())) {
        setActiveOrders((prev) =>
          prev.filter((o) => (o._id || o.id) !== orderId),
        );
      } else {
        setActiveOrders((prev) =>
          prev.map((o) =>
            (o._id || o.id) === orderId ? { ...o, status: newStatus } : o,
          ),
        );
      }
    };

    // Handler optimizado con filtro anti-duplicados y ráfagas
    const handleReceiveMessage = (msg) => {
      const incomingText = msg.text || msg.message;
      const incomingSender = msg.senderType || msg.sender;

      setChatMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (
          lastMsg &&
          (lastMsg.text || lastMsg.message) === incomingText &&
          (lastMsg.senderType || lastMsg.sender) === incomingSender
        ) {
          return prev;
        }
        return [...prev, msg];
      });
    };

    // Suscripción a eventos
    socket.on("new_order", handleNewOrder);
    socket.on("order_created", handleNewOrder);
    socket.on("order_cancelled", handleOrderCancelled);
    socket.on("order_status_updated", handleStatusUpdated);
    socket.on("orderUpdated", handleStatusUpdated);
    socket.on("order:status_updated", handleStatusUpdated);

    // Limpieza de canal previo antes de registrar la escucha única
    socket.off("receive_message");
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("new_order", handleNewOrder);
      socket.off("order_created", handleNewOrder);
      socket.off("order_cancelled", handleOrderCancelled);
      socket.off("order_status_updated", handleStatusUpdated);
      socket.off("orderUpdated", handleStatusUpdated);
      socket.off("order:status_updated", handleStatusUpdated);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, isOnline, validDriverId, driverName]);

  // --------------------------------------------------------------------------
  // 3. RASTREO GPS Y EMISIÓN EN TIEMPO REAL
  // --------------------------------------------------------------------------
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
              driverName,
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
  }, [isOnline, socket, validDriverId, driverName, activeOrders]);

  // --------------------------------------------------------------------------
  // HANDLERS / ACCIONES DE NEGOCIO
  // --------------------------------------------------------------------------
  const handleAcceptOrder = async (order) => {
    if (activeOrders.length >= 2) {
      setError("Ya tienes el límite máximo de 2 carreras activas.");
      return;
    }

    setLoading(true);
    setError("");
    const orderId = order._id || order.id;
    const cleanId = orderId.toString().replace(/^order_/, "");

    try {
      if (socket && socket.connected) {
        socket.emit("join_order", cleanId);
        socket.emit("join", cleanId);
        socket.emit("accept_order", {
          orderId: cleanId,
          driverId: validDriverId,
          driverName,
        });
      }

      const res = await fetch(`${API_BASE_URL}/api/orders/take/${cleanId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: validDriverId,
          driverName,
        }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textError = await res.text();
        console.error("Respuesta no-JSON del servidor:", textError);
        throw new Error(`El servidor respondió con estado ${res.status}`);
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "No se pudo tomar la carrera.");
        return;
      }

      const takenOrder = data.order || { ...order, status: "on_the_way" };

      setActiveOrders((prev) => [...prev, takenOrder]);
      setAvailableOrders((prev) =>
        prev.filter((o) => (o._id || o.id) !== orderId),
      );
    } catch (err) {
      console.error("Error al tomar carrera:", err);
      setError(err.message || "Error de conexión al aceptar la carrera.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus, targetOrderId) => {
    const orderToUpdate = targetOrderId
      ? activeOrders.find((o) => (o._id || o.id) === targetOrderId)
      : activeOrders[0];

    if (!orderToUpdate) return;
    const orderId = orderToUpdate._id || orderToUpdate.id;
    const cleanId = orderId.toString().replace(/^order_/, "");

    // Normalización de estado para compatibilidad con backend
    const statusMapper = {
      COMPLETED: "completed",
      completed: "completed",
      CANCELLED: "cancelled",
      cancelled: "cancelled",
      ON_THE_WAY: "on_the_way",
      ARRIVED: "arrived",
      IN_PROGRESS: "in_progress",
    };

    const finalStatus = statusMapper[newStatus] || newStatus.toLowerCase();

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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error actualizando el estado.");
      }

      const formattedStatus = finalStatus.toLowerCase();

      if (formattedStatus === "completed" || formattedStatus === "cancelled") {
        setActiveOrders((prev) =>
          prev.filter((o) => (o._id || o.id) !== orderId),
        );
        if (
          chatTargetOrder &&
          (chatTargetOrder._id || chatTargetOrder.id) === orderId
        ) {
          setIsChatOpen(false);
          setChatMessages([]);
          setChatTargetOrder(null);
        }
        fetchOrders();
      } else {
        setActiveOrders((prev) =>
          prev.map((o) =>
            (o._id || o.id) === orderId ? { ...o, status: finalStatus } : o,
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

    // Emitimos una sola vía al servidor
    if (socket && socket.connected) {
      socket.emit("send_message", newMsg);
    }

    setNewMessageText("");
  };

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // ============================================================================
  // RENDERIZADO DE INTERFAZ DE USUARIO (UI)
  // ============================================================================
  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative transition-all duration-300 font-sans ${
        activeOrders.length > 0 ? "pb-72" : "pb-6"
      }`}
    >
      {/* CABECERA PRINCIPAL */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 p-4 sticky top-0 z-20 backdrop-blur-md flex justify-between items-center shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
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
          <div>
            <h1 className="font-extrabold text-sm text-slate-100 tracking-tight flex items-center gap-1.5">
              {driverName}
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {isOnline
                ? gpsAccuracy
                  ? `GPS Activo (±${Math.round(gpsAccuracy)}m)`
                  : "Conectado - Buscando GPS..."
                : "Fuera de Servicio"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? "DISPONIBLE" : "OFFLINE"}</span>
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/50"
            title="Cerrar sesión"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* BANNER DE NOTIFICACIONES O ERRORES */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-400 p-3 text-xs text-center flex justify-between items-center animate-fadeIn">
          <div className="flex items-center space-x-2 mx-auto">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError("")}
            className="font-bold text-red-400 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* PANEL PRINCIPAL / LISTADO DE SOLICITUDES */}
      <main className="p-4 flex-1 max-w-xl mx-auto w-full">
        {!isOnline ? (
          <div className="text-center py-20 px-4 bg-slate-900/40 border border-slate-800/60 rounded-3xl mt-4 shadow-xl">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
              <Power className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-base font-bold text-slate-200 mb-1">
              Estás fuera de servicio
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Activa tu disponibilidad en la esquina superior derecha para
              recibir solicitudes en Inírida.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Carreras Disponibles
                </h2>
                <span className="bg-amber-500/20 text-amber-400 font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  {availableOrders.length}
                </span>
              </div>

              <button
                onClick={fetchOrders}
                className="flex items-center space-x-1 text-slate-400 hover:text-amber-400 text-xs font-semibold transition-colors bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg"
                title="Actualizar carreras"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loading ? "animate-spin text-amber-400" : ""
                  }`}
                />
                <span>Actualizar</span>
              </button>
            </div>

            {availableOrders.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-10 text-center my-4 shadow-inner">
                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
                <p className="text-xs font-medium text-slate-400">
                  Buscando solicitudes cercanas en tiempo real...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableOrders.map((ord) => {
                  const item = ord?.items?.[0] || {};
                  const originText =
                    item.origen ||
                    item.origin ||
                    item.pickupAddress ||
                    ord?.origen ||
                    ord?.originAddress ||
                    "Origen no especificado";

                  const destinationText =
                    item.detalle ||
                    item.destino ||
                    item.destination ||
                    ord?.destino ||
                    ord?.destinationAddress ||
                    "Sin especificar";

                  const originLat = ord?.originCoords?.lat || ord?.originLat;
                  const originLng = ord?.originCoords?.lng || ord?.originLng;

                  const distance =
                    currentCoords && originLat && originLng
                      ? calculateDistance(
                          currentCoords.lat,
                          currentCoords.lng,
                          originLat,
                          originLng,
                        )
                      : null;

                  const isMaxReached = activeOrders.length >= 2;

                  return (
                    <div
                      key={ord._id || ord.id}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-lg transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded font-mono font-bold border border-slate-700">
                            #
                            {(ord?._id || ord?.id || "0000")
                              .toString()
                              .slice(-4)}
                          </span>
                          {distance && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                              A {distance} km
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                          Motocarro
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs mb-4 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                        <div className="flex items-start space-x-2.5">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-black">
                              Punto de Recogida
                            </p>
                            <p className="text-slate-200 font-medium line-clamp-2">
                              {originText}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-slate-800/60 my-1" />

                        <div className="flex items-start space-x-2.5">
                          <Navigation className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-black">
                              Destino
                            </p>
                            <p className="text-slate-200 font-medium line-clamp-2">
                              {destinationText}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAcceptOrder(ord)}
                        disabled={loading || isMaxReached}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/10 flex justify-center items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          {isMaxReached
                            ? "Límite alcanzado (2/2 activas)"
                            : "Aceptar Carrera"}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* TARJETA INFERIOR DE CARRERAS ACTIVAS */}
      {activeOrders.length > 0 && (
        <ActiveOrderCard
          activeOrders={activeOrders}
          loading={loading}
          onUpdateStatus={handleUpdateStatus}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* MODAL DE CHAT EN VIVO (Diseño compacto PRO) */}
      {isChatOpen && chatTargetOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm h-[480px] flex flex-col justify-between overflow-hidden shadow-2xl shadow-black/80">
            {/* Header del Chat */}
            <div className="p-3.5 bg-slate-800/90 border-b border-slate-700/60 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-100 leading-tight">
                    Chat de Carrera
                  </h3>
                  <p className="text-[10px] text-amber-400 font-mono font-semibold">
                    #
                    {(chatTargetOrder._id || chatTargetOrder.id || "")
                      .toString()
                      .slice(-4)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo de Mensajes */}
            <div className="p-3.5 flex-1 overflow-y-auto space-y-3 text-xs bg-slate-950/40">
              {chatMessages.filter((msg) => {
                const targetClean = (
                  chatTargetOrder?._id ||
                  chatTargetOrder?.id ||
                  ""
                )
                  .toString()
                  .replace(/^order_/, "");

                const msgClean = (msg.orderId || "")
                  .toString()
                  .replace(/^order_/, "");

                return msgClean === targetClean;
              }).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1 my-auto">
                  <MessageSquare className="w-8 h-8 opacity-30" />
                  <p className="text-[11px]">
                    Inicia la conversación con el cliente
                  </p>
                </div>
              ) : (
                chatMessages
                  .filter((msg) => {
                    const targetClean = (
                      chatTargetOrder?._id ||
                      chatTargetOrder?.id ||
                      ""
                    )
                      .toString()
                      .replace(/^order_/, "");

                    const msgClean = (msg.orderId || "")
                      .toString()
                      .replace(/^order_/, "");

                    return msgClean === targetClean;
                  })
                  .map((msg, idx) => {
                    // ================================================================
                    // DETECCIÓN ROBUSTA DEL ROL
                    // ================================================================
                    const rawRole = (
                      msg.senderType ||
                      msg.sender ||
                      msg.role ||
                      ""
                    )
                      .toString()
                      .trim()
                      .toLowerCase();

                    const isDriver =
                      rawRole === "driver" || rawRole === "conductor";

                    // ================================================================
                    // HORA DEL MENSAJE
                    // ================================================================
                    const formattedTime = msg.timestamp
                      ? new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        });

                    return (
                      <div
                        key={
                          msg._id ||
                          msg.id ||
                          `${msg.timestamp || Date.now()}-${idx}`
                        }
                        className={`w-full flex flex-col ${
                          isDriver ? "items-start" : "items-end"
                        }`}
                      >
                        {/* ============================================================
                ENCABEZADO DEL MENSAJE
                CONDUCTOR = IZQUIERDA
                CLIENTE   = DERECHA
               ============================================================ */}
                        <div
                          className={`flex items-center gap-1.5 mb-1 text-[10px] ${
                            isDriver ? "justify-start" : "justify-end"
                          }`}
                        >
                          <span className="font-bold text-slate-300">
                            {isDriver
                              ? "Conductor"
                              : msg.senderName || "Cliente"}
                          </span>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                              isDriver
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {isDriver ? "Motocarro 🛺" : "Cliente 👤"}
                          </span>
                        </div>

                        {/* ============================================================
                BURBUJA
                CONDUCTOR = IZQUIERDA
                CLIENTE   = DERECHA
               ============================================================ */}
                        <div
                          className={`max-w-[82%] p-2.5 rounded-2xl text-[11px] leading-snug shadow-sm ${
                            isDriver
                              ? `
                    bg-amber-500
                    text-slate-950
                    font-medium
                    rounded-tl-none
                  `
                              : `
                    bg-slate-800
                    text-slate-100
                    border border-slate-700/70
                    rounded-tr-none
                  `
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {msg.text || msg.message}
                          </p>

                          {/* Hora */}
                          <span
                            className={`block text-[9px] mt-1 text-right font-mono ${
                              isDriver ? "text-slate-800/80" : "text-slate-400"
                            }`}
                          >
                            {formattedTime}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Formulario / Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 bg-slate-900 border-t border-slate-800/80 flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Escribe un mensaje al cliente..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="submit"
                className="bg-amber-500 text-slate-950 p-2.5 rounded-xl font-bold hover:bg-amber-400 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
