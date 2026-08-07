import React, { useState, useEffect, useRef, useCallback } from "react";
import io from "socket.io-client";
import {
  MapPin,
  Navigation,
  DollarSign,
  Package,
  User,
  CheckCircle2,
  XCircle,
  Send,
  MessageSquare,
  Phone,
  AlertCircle,
  RefreshCw,
  Power,
  ShieldCheck,
  Clock,
  ExternalLink,
} from "lucide-react";

// ============================================================================
// BLOQUE 1: CONFIGURACIÓN DE ENTORNO Y CONSTANTES DE RED
// ============================================================================

// Identificación del entorno de ejecución (Render vs Localhost)
const IS_PROD =
  process.env.NODE_ENV === "production" ||
  window.location.hostname !== "localhost";

const BASE_DOMAIN = IS_PROD
  ? "https://inirida-express.onrender.com"
  : "http://localhost:5000";

const API_URL = process.env.REACT_APP_API_URL || `${BASE_DOMAIN}/api`;
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || BASE_DOMAIN;

// ============================================================================
// BLOQUE 2: FUNCIONES AUXILIARES DE GEOLOCALIZACIÓN Y GPS
// ============================================================================

/**
 * Calculo de distancia entre dos coordenadas geográficas mediante Haversine.
 * @returns {number} Distancia en metros.
 */
function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio terrestre
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Aplica filtro paso bajo (suavizado) a la posición GPS para evitar saltos.
 */
function smoothPosition(prevPos, currentPos) {
  if (!prevPos) return currentPos;
  const factor = 0.3; // 30% posición actual, 70% anterior
  return {
    lat: prevPos.lat + (currentPos.lat - prevPos.lat) * factor,
    lng: prevPos.lng + (currentPos.lng - prevPos.lng) * factor,
  };
}

/**
 * Asigna intervalos dinámicos de transmisión según la velocidad del vehículo.
 */
function getDynamicInterval(speed) {
  if (!speed || speed < 1.5) return 7000; // Detenido o muy lento (7s)
  if (speed < 5) return 5000; // Velocidad moderada (5s)
  return 3000; // En movimiento rápido (3s)
}

// ============================================================================
// BLOQUE 3: COMPONENTE PRINCIPAL (DRIVER DASHBOARD)
// ============================================================================

export default function DriverDashboard({ driver, onLogout }) {
  // --------------------------------------------------------------------------
  // 3.1 Carga Inicial y Persistencia de Identidad
  // --------------------------------------------------------------------------
  const savedDriverData = JSON.parse(
    localStorage.getItem("driverData") || "{}",
  );

  const driverId =
    driver?.id ||
    driver?._id ||
    driver?.driverId ||
    savedDriverData?.id ||
    savedDriverData?._id ||
    localStorage.getItem("driverId");

  const driverName =
    driver?.name ||
    driver?.fullName ||
    driver?.nombre ||
    savedDriverData?.name ||
    savedDriverData?.fullName ||
    savedDriverData?.nombre ||
    "Conductor";

  // Sincronizar datos del conductor en almacenamiento local ante recargas
  useEffect(() => {
    if (driver && Object.keys(driver).length > 0) {
      localStorage.setItem("driverData", JSON.stringify(driver));
      if (driver.id || driver._id) {
        localStorage.setItem("driverId", driver.id || driver._id);
      }
    }
  }, [driver]);

  // --------------------------------------------------------------------------
  // 3.2 Estados Reactivos
  // --------------------------------------------------------------------------

  // Estado de Disponibilidad (Lectura inicial persistida)
  const [isOnline, setIsOnline] = useState(() => {
    const savedStatus = localStorage.getItem("driver_is_online");
    if (savedStatus !== null) {
      return JSON.parse(savedStatus);
    }
    return (
      driver?.isAvailable ||
      driver?.isOnline ||
      savedDriverData?.isAvailable ||
      false
    );
  });

  const [activeOrder, setActiveOrder] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [customRates, setCustomRates] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [completionPin, setCompletionPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  // Referencias mutables (evitan renders innecesarios)
  const socketRef = useRef(null);
  const watchPositionId = useRef(null);
  const modifiedOffersRef = useRef(new Set());
  const queueRef = useRef([]); // Cola offline de geolocalización

  // Helper local para validar tipo de servicio
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

  // --------------------------------------------------------------------------
  // 3.3 Gestión de Conexión WebSocket (Socket.io)
  // --------------------------------------------------------------------------
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socketRef.current.on("connect", () => {
      console.log("Conectado exitosamente al servidor");
      if (driverId) {
        socketRef.current.emit("register_driver", driverId);
      }
      // Vaciar buffer de ubicaciones guardadas durante desconexión
      if (queueRef.current.length > 0) {
        queueRef.current.forEach((locationData) => {
          socketRef.current.emit("update_driver_location", locationData);
        });
        queueRef.current = [];
      }
    });

    // Escuchar nuevos pedidos en tiempo real
    socketRef.current.on("order_created", (newOrder) => {
      if (isOnline && !activeOrder) {
        setAvailableOrders((prev) => [
          newOrder,
          ...prev.filter(
            (o) => (o._id || o.id) !== (newOrder._id || newOrder.id),
          ),
        ]);
      }
    });

    // Eliminar pedido aceptado por otro conductor
    socketRef.current.on("order_taken", (takenOrderId) => {
      setAvailableOrders((prev) =>
        prev.filter((o) => (o._id || o.id) !== takenOrderId),
      );
    });

    // Recibir mensajes del chat activo
    socketRef.current.on("new_chat_message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // Reconectar en caso de cambio de pestaña o desbloqueo de pantalla
    const handlePageShow = () => {
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [driverId, isOnline, activeOrder]);

  // --------------------------------------------------------------------------
  // 3.4 Geolocalización Continua y Tolerante a Fallos (GPS)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isOnline || !("geolocation" in navigator)) return;

    let lastSendTime = 0;
    let lastValidPosition = null;

    watchPositionId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } =
          position.coords;
        const now = Date.now();

        // Descartar lecturas con margen de error amplio (>120m)
        if (accuracy > 120) {
          console.warn(`[GPS] Baja precisión (${accuracy}m)`);
          return;
        }

        // Prevenir saltos irrealistas mayores a 200m entre lecturas
        if (lastValidPosition) {
          const dist = distance(
            lastValidPosition.lat,
            lastValidPosition.lng,
            latitude,
            longitude,
          );
          if (dist > 200) {
            console.warn("[GPS] Salto detectado, ignorado");
            return;
          }
        }

        const smoothed = smoothPosition(lastValidPosition, {
          lat: latitude,
          lng: longitude,
        });

        lastValidPosition = smoothed;
        const interval = getDynamicInterval(speed);

        if (now - lastSendTime < interval) return;
        lastSendTime = now;

        const locationData = {
          driverId,
          driverName,
          phone: driver?.phone || savedDriverData?.phone || "",
          lat: smoothed.lat,
          lng: smoothed.lng,
          heading: heading || 0,
          speed: speed || 0,
          accuracy,
          timestamp: now,
          isAvailable: true,
        };

        if (socketRef.current?.connected) {
          socketRef.current.emit("update_driver_location", locationData);
        } else {
          queueRef.current.push(locationData);
        }

        setGeoError(null);
      },
      (err) => {
        console.warn("GPS error:", err.message);
        setGeoError("Señal GPS débil...");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      },
    );

    return () => {
      if (watchPositionId.current) {
        navigator.geolocation.clearWatch(watchPositionId.current);
      }
    };
  }, [isOnline, driverId, driver, driverName, savedDriverData]);

  // --------------------------------------------------------------------------
  // 3.5 Consulta y Sincronización REST (Pedidos)
  // --------------------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    if (!isOnline || activeOrder) return;
    try {
      const res = await fetch(`${API_URL}/orders/available`);
      if (!res.ok) throw new Error("Error en la solicitud de pedidos");
      const orders = await res.json();

      setAvailableOrders(orders || []);

      // Preservar contraofertas modificadas manualmente por el conductor
      setCustomRates((prev) => {
        const updated = { ...prev };
        (orders || []).forEach((order) => {
          const id = order._id || order.id;
          if (!modifiedOffersRef.current.has(id)) {
            updated[id] =
              order.offeredRate ||
              order.subtotal ||
              order.total ||
              order.deliveryFee ||
              0;
          }
        });
        return updated;
      });
    } catch (err) {
      console.error("Error obteniendo pedidos disponibles:", err);
    }
  }, [isOnline, activeOrder]);

  const checkActiveOrder = useCallback(async () => {
    if (!driverId) return;
    try {
      const res = await fetch(`${API_URL}/orders/active/driver/${driverId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveOrder(data);
      }
    } catch (err) {
      console.error("Error al verificar orden activa:", err);
    }
  }, [driverId]);

  useEffect(() => {
    checkActiveOrder();
  }, [checkActiveOrder]);

  // Polling de seguridad para actualizar lista disponible
  useEffect(() => {
    let interval;
    if (isOnline && !activeOrder) {
      fetchOrders();
      interval = setInterval(fetchOrders, 6000);
    }
    return () => clearInterval(interval);
  }, [isOnline, activeOrder, fetchOrders]);

  // --------------------------------------------------------------------------
  // 3.6 Acciones de Interacción y Manejo de Peticiones
  // --------------------------------------------------------------------------

  // Alternar Estado En Línea / Offline
  const toggleOnlineStatus = async () => {
    if (!driverId) {
      alert("Error de identificación del conductor. Vuelve a iniciar sesión.");
      return;
    }

    setLoading(true);
    const newStatus = !isOnline;

    try {
      const res = await fetch(`${API_URL}/drivers/${driverId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAvailable: newStatus,
          isOnline: newStatus,
        }),
      });

      if (!res.ok) {
        const fallbackRes = await fetch(
          `${API_URL}/drivers/${driverId}/status`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isAvailable: newStatus,
              isOnline: newStatus,
            }),
          },
        );
        if (!fallbackRes.ok)
          throw new Error("Error en actualización de estado");
      }

      setIsOnline(newStatus);
      localStorage.setItem("driver_is_online", JSON.stringify(newStatus));

      if (socketRef.current?.connected) {
        if (!newStatus) {
          socketRef.current.emit("update_driver_location", {
            driverId,
            isAvailable: false,
          });
          setAvailableOrders([]);
        }
      }
    } catch (err) {
      alert("No se pudo cambiar el estado de conexión. Intenta de nuevo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Aceptar Pedido u Oferta
  const handleAcceptOrder = async (orderId, acceptedPrice) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          price: Number(acceptedPrice),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Respuesta del servidor:", errorText);
        throw new Error(
          `Error ${res.status}: No se encontró la ruta en el servidor.`,
        );
      }

      alert("¡Carrera aceptada con éxito!");
      checkActiveOrder();
    } catch (error) {
      console.error("Error al aceptar la orden:", error);
      alert(error.message || "No se pudo aceptar la carrera.");
    } finally {
      setLoading(false);
    }
  };

  // Finalizar Carrera o Pedido Activo
  const handleCompleteOrder = async () => {
    if (!activeOrder) return;
    const isRide = checkIsRide(activeOrder);

    if (!isRide && completionPin.length !== 4) {
      setPinError("Ingresa el PIN de 4 dígitos enviado al cliente.");
      return;
    }

    setLoading(true);
    setPinError("");
    try {
      const orderId = activeOrder._id || activeOrder.id;
      const res = await fetch(`${API_URL}/orders/${orderId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId,
          pin: isRide ? null : completionPin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "PIN incorrecto o fallo en servidor.");
      }

      setActiveOrder(null);
      setCompletionPin("");
      fetchOrders();
    } catch (err) {
      setPinError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensaje al chat en vivo
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeOrder) return;

    const orderId = activeOrder._id || activeOrder.id;
    const payload = {
      orderId,
      senderId: driverId,
      senderType: "driver",
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    socketRef.current?.emit("send_chat_message", payload);
    setChatMessages((prev) => [...prev, payload]);
    setNewMessage("");
  };

  // Actualizar tarifa personalizada / contraoferta
  const handleRateChange = (orderId, val) => {
    const num = parseFloat(val) || 0;
    modifiedOffersRef.current.add(orderId);
    setCustomRates((prev) => ({ ...prev, [orderId]: num }));
  };

  // ============================================================================
  // BLOQUE 3.7: RENDERIZADO DEL COMPONENTE (FIX SINTAXIS Y SLICE)
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER PRINCIPAL Y CONTROL ONLINE */}
      {/* ------------------------------------------------------------------ */}
      <header className="flex items-center justify-between px-3 py-2.5 bg-[#0f172a] text-white w-full border-b border-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-amber-500/20 p-1.5 rounded-lg shrink-0">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>
          <div className="truncate">
            <h1 className="font-bold text-sm sm:text-base leading-tight truncate">
              Inírida Express
            </h1>
            <p className="text-[10px] sm:text-xs text-amber-400/90 font-medium leading-none truncate mt-0.5">
              {driverName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={toggleOnlineStatus}
            disabled={loading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-gray-800 text-gray-400 border border-gray-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
              }`}
            />
            <span className="whitespace-nowrap">
              {isOnline ? "En Línea" : "Off-line"}
            </span>
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Alerta de señal GPS débil */}
      {geoError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 text-amber-300 text-xs flex items-center space-x-2 justify-center">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CONTENIDO PRINCIPAL */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 p-4 max-w-3xl w-full mx-auto space-y-4">
        {activeOrder ? (
          /* ================================================================ */
          /* SECCIÓN A: ORDEN EN CURSO                                        */
          /* ================================================================ */
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-5 shadow-xl">
            <div className="flex justify-between items-start border-b border-slate-700 pb-3">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                  {checkIsRide(activeOrder)
                    ? "Carrera en Curso"
                    : "Domicilio en Curso"}
                </span>
                <h2 className="text-xl font-bold mt-2">
                  {checkIsRide(activeOrder)
                    ? "Servicio de Pasajero"
                    : `Pedido #${String(activeOrder._id || activeOrder.id || "").slice(-4)}`}
                </h2>
              </div>
              <a
                href={`tel:${
                  activeOrder.customer?.phone || activeOrder.clientPhone || ""
                }`}
                className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full hover:bg-emerald-500/30"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>

            {/* Rutas Activas */}
            <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Origen / Recogida</p>
                  <p className="font-medium text-slate-200">
                    {activeOrder.origen ||
                      activeOrder.pickupAddress ||
                      activeOrder.origin ||
                      activeOrder.store?.name ||
                      activeOrder.customer?.address ||
                      "Origen no especificado"}
                  </p>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-slate-700 ml-2.5 h-4" />
              <div className="flex items-start space-x-3">
                <Navigation className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Destino / Entrega</p>
                  <p className="font-medium text-slate-200">
                    {activeOrder.destino ||
                      activeOrder.deliveryAddress ||
                      activeOrder.destination ||
                      activeOrder.customer?.notes ||
                      activeOrder.notes ||
                      "Destino no especificado"}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalles del Cliente / Valor */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/30">
                <p className="text-xs text-slate-400">Cliente</p>
                <p className="font-semibold">
                  {activeOrder.customer?.name ||
                    activeOrder.clientName ||
                    "Usuario"}
                </p>
              </div>
              <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-700/30">
                <p className="text-xs text-slate-400">Valor Acordado</p>
                <p className="font-bold text-emerald-400 text-base">
                  $
                  {(
                    activeOrder.total ||
                    activeOrder.subtotal ||
                    activeOrder.agreedRate ||
                    activeOrder.totalAmount ||
                    0
                  ).toLocaleString()}{" "}
                  COP
                </p>
              </div>
            </div>

            {/* Chat Integrado y Verificación con PIN */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="w-full py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-xl font-medium flex items-center justify-center space-x-2 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>
                  {isChatOpen ? "Ocultar Chat" : "Abrir Chat con Cliente"}
                </span>
              </button>

              {isChatOpen && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 h-48 flex flex-col justify-between">
                  <div className="overflow-y-auto space-y-2 mb-2 pr-1 text-xs">
                    {chatMessages.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">
                        No hay mensajes previos
                      </p>
                    ) : (
                      chatMessages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg max-w-[80%] ${
                            m.senderType === "driver"
                              ? "bg-amber-500/20 text-amber-200 ml-auto"
                              : "bg-slate-800 text-slate-200"
                          }`}
                        >
                          {m.text}
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="p-2 bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {!checkIsRide(activeOrder) && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 block">
                    PIN de Entrega (Requerido para Comercios)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={completionPin}
                    onChange={(e) =>
                      setCompletionPin(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="0000"
                    className="w-full text-center tracking-widest text-lg font-mono bg-slate-900 border border-slate-700 rounded-xl py-2 focus:border-amber-400 focus:outline-none"
                  />
                  {pinError && (
                    <p className="text-xs text-rose-400 text-center">
                      {pinError}
                    </p>
                  )}
                </div>
              )}

              <button
                onClick={handleCompleteOrder}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {checkIsRide(activeOrder)
                    ? "Finalizar Carrera"
                    : "Confirmar Entrega con PIN"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* SECCIÓN B: LISTA DE PEDIDOS DISPONIBLES                          */
          /* ================================================================ */
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-200">
                Carreras y Pedidos Cerca
              </h2>
              <button
                onClick={fetchOrders}
                disabled={!isOnline || loading}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {!isOnline ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center space-y-3">
                <Power className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-slate-400 font-medium text-sm">
                  Ponte en línea para recibir servicios en Inírida
                </p>
              </div>
            ) : availableOrders.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-slate-400 text-sm">
                  No hay servicios disponibles en este momento
                </p>
              </div>
            ) : (
              availableOrders.map((order) => {
                const id = order._id || order.id || Math.random().toString();
                const isRide = checkIsRide(order);

                return (
                  <div
                    key={id}
                    className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 space-y-4 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          isRide
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {isRide ? "Carrera Pasajero" : "Domicilio / Comercio"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Sugerido: $
                        {(
                          order.offeredRate ||
                          order.subtotal ||
                          order.total ||
                          order.deliveryFee ||
                          0
                        ).toLocaleString()}{" "}
                        COP
                      </span>
                    </div>

                    {/* Direcciones de Recogida y Destino */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-300">
                          <span className="text-slate-500">De:</span>{" "}
                          {order.origen ||
                            order.pickupAddress ||
                            order.origin ||
                            order.store?.name ||
                            order.customer?.address ||
                            "Origen no especificado"}
                        </p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Navigation className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-slate-300">
                          <span className="text-slate-500">A:</span>{" "}
                          {order.destino ||
                            order.deliveryAddress ||
                            order.destination ||
                            order.customer?.notes ||
                            order.notes ||
                            "Destino no especificado"}
                        </p>
                      </div>
                    </div>

                    {/* Contraoferta y Aceptación */}
                    <div className="pt-2 border-t border-slate-700/50 flex items-center space-x-3">
                      <div className="flex-1 relative">
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          value={customRates[id] || ""}
                          onChange={(e) => handleRateChange(id, e.target.value)}
                          placeholder="Tu tarifa"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-semibold text-emerald-400 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <button
                        onClick={() =>
                          handleAcceptOrder(
                            id,
                            customRates[id] ||
                              order.offeredRate ||
                              order.subtotal ||
                              order.total ||
                              0,
                          )
                        }
                        disabled={loading}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-colors shadow-md shadow-amber-500/10"
                      >
                        Aceptar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
