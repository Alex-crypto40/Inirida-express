import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Navigation,
  CheckCircle,
  Phone,
  MessageSquare,
  X,
  Send,
  Power,
  RefreshCw,
  Clock,
  ExternalLink,
  Volume2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { io } from "socket.io-client";

// ==========================================
// CONFIGURACIÓN DE URLS Y SOCKETS
// ==========================================
const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_BASE = RAW_API_URL.replace(/\/$/, "");
const SOCKET_URL = API_BASE.replace(/\/api$/, "");

// ==========================================
// FUNCIONES AUXILIARES GPS Y NAVEGACIÓN
// ==========================================
const distance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371000; // metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Devuelve metros
};

const smoothPosition = (prevPos, newPos) => {
  if (!prevPos) return newPos;
  // Factor de suavizado (0.3 peso nuevo, 0.7 peso anterior)
  return {
    lat: prevPos.lat + (newPos.lat - prevPos.lat) * 0.3,
    lng: prevPos.lng + (newPos.lng - prevPos.lng) * 0.3,
  };
};

const getDynamicInterval = (speed) => {
  // Ajusta la frecuencia de envío del GPS según la velocidad (km/h)
  if (!speed || speed < 2) return 5000; // Detenido: cada 5s
  if (speed < 15) return 3000; // Desplazamiento lento: cada 3s
  return 1500; // En movimiento rápido: cada 1.5s
};

export default function DriverDashboard({ driver, onLogout }) {
  // ==========================================
  // 1. OBTENCIÓN DE DATOS DEL CONDUCTOR
  // ==========================================
  const getSavedDriver = () => {
    try {
      const item = localStorage.getItem("driverData");
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error("Error al leer driverData de localStorage", e);
      return null;
    }
  };

  const savedDriverData = getSavedDriver();
  const driverId =
    driver?.id ||
    driver?._id ||
    savedDriverData?.id ||
    savedDriverData?._id ||
    "DRV-123";
  const driverName =
    driver?.name || savedDriverData?.name || "Conductor Motocarro";

  // ==========================================
  // 2. ESTADOS PRINCIPALES
  // ==========================================
  const [isOnline, setIsOnline] = useState(() => {
    try {
      const savedStatus = localStorage.getItem(`driver_is_online_${driverId}`);
      return savedStatus ? JSON.parse(savedStatus) : false;
    } catch (e) {
      return false;
    }
  });

  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [geoError, setGeoError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false); // 🟢 Estado para colapsar/minimizar la tarjeta flotante

  // Guardar estado en línea
  useEffect(() => {
    try {
      localStorage.setItem(
        `driver_is_online_${driverId}`,
        JSON.stringify(isOnline),
      );
    } catch (e) {
      console.error("Error guardando el estado en línea", e);
    }
  }, [isOnline, driverId]);

  // GPS y Chat
  const [currentCoords, setCurrentCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");

  // Referencias declaradas correctamente
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const queueRef = useRef([]); // Buffer offline
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // ==========================================
  // HELPER PARA EXTRAER ORIGEN Y DESTINO ROBUSTO DESDE items[0] O LA RAÍZ
  // ==========================================
  const getOrigin = (ord) => {
    if (!ord) return "Origen no especificado";
    const item = ord?.items?.[0] || {};
    const r = ord.rideDetails || ord;
    return (
      item.origen ||
      item.origin ||
      item.pickupAddress ||
      item.originAddress ||
      r.origen ||
      r.pickupAddress ||
      r.originAddress ||
      r.originText ||
      r.pickup ||
      (typeof r.origin === "string" ? r.origin : r.origin?.address) ||
      "Origen no especificado"
    );
  };

  const getDestination = (ord) => {
    if (!ord) return "Destino no especificado";
    const item = ord?.items?.[0] || {};
    const r = ord.rideDetails || ord;
    return (
      item.detalle ||
      item.destino ||
      item.destination ||
      item.dropoffAddress ||
      item.description ||
      r.detalle ||
      r.destino ||
      r.destinationAddress ||
      r.dropoffAddress ||
      r.destinationText ||
      r.detail ||
      r.dropoff ||
      (typeof r.destination === "string"
        ? r.destination
        : r.destination?.address) ||
      "Destino no especificado"
    );
  };

  // ==========================================
  // 3. REPRODUCIR SONIDO DE ALERTA
  // ==========================================
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        880,
        audioCtx.currentTime + 0.3,
      );
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.log("No se pudo reproducir el sonido automático:", e);
    }
  };

  // ==========================================
  // 4. CÁLCULO DE DISTANCIA HAVERSINE (En km)
  // ==========================================
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

  // ==========================================
  // 5. CONSULTA DE CARRERAS DISPONIBLES
  // ==========================================
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/available`);
      if (res.ok) {
        const data = await res.json();
        const ordersList = Array.isArray(data) ? data : data.orders || [];

        setAvailableOrders((prevOrders) => {
          if (ordersList.length > prevOrders.length && prevOrders.length > 0) {
            playAlertSound();
          }
          return ordersList;
        });
      }
    } catch (err) {
      console.error("Error obteniendo carreras disponibles:", err);
    }
  }, []);

  // ==========================================
  // 6. CONSULTA DE CARRERA ACTIVA
  // ==========================================
  const checkActiveOrder = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/driver-active/${driverId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data._id || data.id)) {
          setActiveOrder(data);
        } else {
          setActiveOrder(null);
        }
      }
    } catch (err) {
      console.error("Error consultando carrera activa:", err);
    }
  }, [driverId]);

  // ==========================================
  // 7. SOCKET.IO: CONEXIÓN EN TIEMPO REAL
  // ==========================================
  useEffect(() => {
    if (!isOnline) {
      if (socketRef.current) socketRef.current.disconnect();
      return;
    }

    try {
      const socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        query: { driverId },
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log(
          "🟢 Conectado exitosamente por Socket.io como Conductor:",
          driverId,
        );
        fetchOrders();
        checkActiveOrder();
      });

      socket.on("order:created", () => {
        playAlertSound();
        fetchOrders();
      });

      socket.on("order:taken", () => {
        fetchOrders();
      });

      socket.on("order_status_updated", (updatedOrder) => {
        fetchOrders();
        const activeId = activeOrder?._id || activeOrder?.id;
        const updatedId = updatedOrder?._id || updatedOrder?.id;

        if (activeId && activeId === updatedId) {
          const statusLower = (updatedOrder.status || "").toLowerCase();
          if (statusLower === "completed" || statusLower === "cancelled") {
            setActiveOrder(null);
            setIsChatOpen(false);
          } else {
            setActiveOrder(updatedOrder);
          }
        }
      });

      socket.on("chat:message", (msg) => {
        const activeId = activeOrder?._id || activeOrder?.id;
        if (msg.orderId === activeId) {
          setChatMessages((prev) => [...prev, msg]);
        }
      });

      socket.on("disconnect", () => {
        console.log("🔴 Socket.io Desconectado");
      });
    } catch (err) {
      console.warn("Error inicializando Socket.io:", err);
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [
    isOnline,
    driverId,
    fetchOrders,
    checkActiveOrder,
    activeOrder?._id,
    activeOrder?.id,
  ]);

  // ==========================================
  // 7.5 HTTP POLLING DE RESPALDO DE SEGURIDAD
  // ==========================================
  useEffect(() => {
    if (!isOnline) return;

    if (activeOrder) {
      checkActiveOrder();
    } else {
      fetchOrders();
    }

    const interval = setInterval(() => {
      if (activeOrder) {
        checkActiveOrder();
      } else {
        fetchOrders();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOnline, activeOrder, fetchOrders, checkActiveOrder]);

  // ==========================================
  // 8. RASTREO GPS EN TIEMPO REAL
  // ==========================================
  useEffect(() => {
    if (!isOnline || !("geolocation" in navigator)) return;

    let lastSendTime = 0;
    let lastValidPosition = null;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } =
          position.coords;
        const now = Date.now();

        setCurrentCoords({ lat: latitude, lng: longitude });
        setGpsAccuracy(accuracy);

        // 🔴 1. FILTRO DE PRECISIÓN
        if (accuracy > 120) {
          console.warn(`[GPS] Baja precisión detectada (${accuracy}m)`);
          return;
        }

        // 🔴 2. FILTRO ANTI-SALTO
        if (lastValidPosition) {
          const dist = distance(
            lastValidPosition.lat,
            lastValidPosition.lng,
            latitude,
            longitude,
          );

          if (dist > 200) {
            console.warn("[GPS] Salto inusual de ubicación (>200m), ignorado");
            return;
          }
        }

        // 🟢 3. SUAVIZADO
        const smoothed = smoothPosition(lastValidPosition, {
          lat: latitude,
          lng: longitude,
        });

        lastValidPosition = smoothed;

        // 🟢 4. FRECUENCIA DINÁMICA
        const interval = getDynamicInterval(speed);

        if (now - lastSendTime < interval) return;
        lastSendTime = now;

        const locationData = {
          driverId,
          driverName: driver?.name || driverName,
          phone: driver?.phone || "",
          vehiclePlate: driver?.vehiclePlate || "",
          lat: smoothed.lat,
          lng: smoothed.lng,
          heading: heading || 0,
          speed: speed || 0,
          accuracy,
          timestamp: now,
          isAvailable: isOnline && !activeOrder,
        };

        // 🟢 5. ENVÍO VÍA SOCKET O BUFFER
        if (socketRef.current?.connected) {
          if (queueRef.current && queueRef.current.length > 0) {
            queueRef.current = [];
          }
          socketRef.current.emit("update_driver_location", locationData);
        } else if (queueRef.current) {
          if (queueRef.current.length >= 5) {
            queueRef.current.shift();
          }
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
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isOnline, driverId, driver, activeOrder, driverName]);

  // ==========================================
  // 9. ACCIONES DEL CONDUCTOR
  // ==========================================
  const handleAcceptOrder = async (order) => {
    setLoading(true);
    setError("");

    const orderId = order._id || order.id;

    try {
      const res = await fetch(`${API_BASE}/orders/take/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId }),
      });

      const responseData = await res.json();

      if (res.ok) {
        setActiveOrder(responseData.order || responseData);
        fetchOrders();
      } else {
        setError(responseData.message || "No se pudo tomar la carrera.");
      }
    } catch (err) {
      setError("Error de red al aceptar la carrera.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (nextStatus) => {
    const activeId = activeOrder?._id || activeOrder?.id;
    if (!activeId) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/orders/${activeId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, driverId }),
      });

      if (res.ok) {
        const nextStatusLower = nextStatus.toLowerCase();
        if (
          nextStatusLower === "completed" ||
          nextStatusLower === "cancelled"
        ) {
          setActiveOrder(null);
          setChatMessages([]);
          setIsChatOpen(false);
          fetchOrders();
        } else {
          setActiveOrder((prev) => ({ ...prev, status: nextStatus }));
        }
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const activeId = activeOrder?._id || activeOrder?.id;
    if (!newMessageText.trim() || !activeId) return;

    const messageObj = {
      senderType: "driver",
      senderId: driverId,
      text: newMessageText.trim(),
      timestamp: new Date().toISOString(),
    };

    if (socketRef.current) {
      socketRef.current.emit("chat_message", {
        orderId: activeId,
        message: messageObj,
      });
    }

    setChatMessages((prev) => [...prev, messageObj]);
    setNewMessageText("");
  };

  const openExternalNavigation = (lat, lng, address) => {
    if (lat && lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        "_blank",
      );
    } else if (address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        "_blank",
      );
    }
  };
  // ==========================================
  // INTERFAZ DE USUARIO (JSX)
  // ==========================================
  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative transition-all duration-300 ${
        activeOrder ? "pb-72" : "pb-6"
      }`}
    >
      {/* 1. CABECERA SUPERIOR */}
      <header className="bg-slate-900/90 border-b border-slate-800 p-4 sticky top-0 z-20 backdrop-blur flex justify-between items-center shadow-lg">
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <div>
            <h1 className="font-bold text-sm text-slate-100">{driverName}</h1>
            <p className="text-xs text-slate-400">
              {isOnline
                ? gpsAccuracy
                  ? `GPS Activo (±${Math.round(gpsAccuracy)}m)`
                  : "Conectado - Buscando GPS"
                : "Desconectado"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* BOTÓN CONECTAR / DESCONECTAR */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? "DISPONIBLE" : "OFFLINE"}</span>
          </button>

          {/* BOTÓN CERRAR SESIÓN */}
          <button
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title="Cerrar sesión"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MENSAJES DE ERROR */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-400 p-3 text-xs text-center flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 2. PANEL PRINCIPAL / LISTA DE CARRERAS DISPONIBLES */}
      <main className="p-4 flex-1 max-w-xl mx-auto w-full">
        {!isOnline ? (
          <div className="text-center py-16 px-4">
            <Power className="w-16 h-16 text-slate-700 mx-auto mb-4 animate-bounce" />
            <h2 className="text-lg font-bold text-slate-300 mb-1">
              Estás fuera de línea
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Activa tu disponibilidad en el botón superior para empezar a
              recibir solicitudes cercanas.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <span>Carreras Disponibles</span>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full ml-2">
                  {availableOrders.length}
                </span>
              </h2>

              <button
                onClick={fetchOrders}
                className="text-slate-400 hover:text-amber-400 transition-colors"
                title="Actualizar carreras"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* LISTA DE CARRERAS */}
            {availableOrders.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 text-center my-4">
                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  Buscando solicitudes cercanas...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableOrders.map((ord) => {
                  const rideDetails = ord?.rideDetails || ord;

                  // EXTRAER ORIGEN ROBUSTO
                  const item = ord?.items?.[0] || {};

                  const originText =
                    item.origen ||
                    item.origin ||
                    item.pickupAddress ||
                    item.originAddress ||
                    ord?.origen ||
                    ord?.originAddress ||
                    ord?.pickupAddress ||
                    "Origen no especificado";

                  // EXTRAER DESTINO ROBUSTO
                  const destinationText =
                    item.detalle ||
                    item.destino ||
                    item.destination ||
                    item.dropoffAddress ||
                    item.description ||
                    ord?.detalle ||
                    ord?.destino ||
                    ord?.destinationAddress ||
                    "Destino no especificado";

                  const originLat =
                    ord?.originCoords?.lat ||
                    rideDetails?.originLat ||
                    rideDetails?.pickupLat ||
                    ord?.originLat;
                  const originLng =
                    ord?.originCoords?.lng ||
                    rideDetails?.originLng ||
                    rideDetails?.pickupLng ||
                    ord?.originLng;

                  const distance =
                    currentCoords && originLat && originLng
                      ? calculateDistance(
                          currentCoords.lat,
                          currentCoords.lng,
                          originLat,
                          originLng,
                        )
                      : null;

                  return (
                    <div
                      key={ord._id || ord.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md hover:border-amber-500/40 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                            #
                            {(ord?._id || ord?.id || "0000")
                              .toString()
                              .slice(-4)}
                          </span>
                          {distance && (
                            <span className="ml-2 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                              A {distance} km de ti
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                            Tarifa Estándar
                          </span>
                        </div>
                      </div>

                      {/* DETALLES DE RUTA */}
                      <div className="space-y-2 text-xs mb-4">
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">
                              Origen
                            </p>
                            <p className="text-slate-200 line-clamp-1">
                              {originText}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2">
                          <Navigation className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500 uppercase font-semibold">
                              Destino
                            </p>
                            <p className="text-slate-200 line-clamp-1">
                              {destinationText}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* BOTÓN DIRECTO DE ACEPTAR */}
                      <button
                        onClick={() => handleAcceptOrder(ord)}
                        disabled={loading || !!activeOrder}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg flex justify-center items-center space-x-2 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Aceptar Carrera</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. TARJETA FLOTANTE (CARRERA EN CURSO) */}
      {activeOrder &&
        (() => {
          const item = activeOrder?.items?.[0] || {};

          // EXTRACCIÓN ROBUSTA DE ORIGEN EN CARRERA ACTIVA
          const activeOriginText =
            item.origen ||
            item.origin ||
            item.pickupAddress ||
            item.originAddress ||
            activeOrder.origen ||
            activeOrder.origin ||
            activeOrder.pickupAddress ||
            activeOrder.originAddress ||
            "Origen no especificado";

          // EXTRACCIÓN ROBUSTA DE DESTINO EN CARRERA ACTIVA
          const activeDestinationText =
            item.detalle ||
            item.destino ||
            item.destination ||
            item.dropoffAddress ||
            item.description ||
            activeOrder.detalle ||
            activeOrder.destino ||
            activeOrder.destination ||
            activeOrder.destinationAddress ||
            "Destino no especificado";

          const activeCustomerName =
            activeOrder.customer?.name ||
            activeOrder.customerName ||
            activeOrder.clientName ||
            activeOrder.passengerName ||
            "Cliente";

          const activeCustomerPhone =
            activeOrder.customer?.phone ||
            activeOrder.clientPhone ||
            activeOrder.customerPhone;

          // Normalizar estado (Soporta minúsculas y mayúsculas de MongoDB)
          const currentStatus = (activeOrder.status || "").toLowerCase();

          return (
            <div className="fixed bottom-2 left-2 right-2 max-w-lg mx-auto z-30 transition-all duration-300">
              <div className="bg-slate-900 border border-amber-500/50 rounded-2xl shadow-2xl p-3.5 backdrop-blur-md max-h-[80vh] flex flex-col justify-between overflow-y-auto">
                {/* CABECERA CON BOTÓN PARA MINIMIZAR/COLAPSAR */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Carrera en Curso
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* BOTÓN COLAPSAR / EXPANDIR TARJETA */}
                    <button
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg text-xs"
                      title={isMinimized ? "Expandir" : "Minimizar"}
                    >
                      {isMinimized ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* BOTÓN CHAT */}
                    <button
                      onClick={() => setIsChatOpen(!isChatOpen)}
                      className="bg-slate-800 hover:bg-slate-700 text-amber-400 p-1.5 rounded-lg text-xs flex items-center space-x-1 border border-amber-500/20"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {/* BOTÓN LLAMAR */}
                    {activeCustomerPhone && (
                      <a
                        href={`tel:${activeCustomerPhone}`}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 p-1.5 rounded-lg text-xs border border-emerald-500/30"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* CONTENIDO (SE OCULTA SI ESTÁ MINIMIZADO) */}
                {!isMinimized && (
                  <>
                    {/* DETALLES CLIENTE */}
                    <div className="grid grid-cols-2 gap-2 my-2 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Cliente
                        </p>
                        <p className="font-semibold text-slate-200 truncate">
                          {activeCustomerName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase">
                          Estado
                        </p>
                        <p className="font-bold text-amber-400 text-xs capitalize">
                          {currentStatus.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    {/* RUTA Y DIRECCIONES */}
                    <div className="space-y-2 mb-3 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 overflow-hidden">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="truncate text-slate-200 text-xs font-medium">
                            {activeOriginText}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 overflow-hidden">
                          <Navigation className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="truncate text-slate-200 text-xs font-medium">
                            {activeDestinationText}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* BOTONES DE ACCIÓN (SIEMPRE VISIBLES INCLUSO MINIMIZADO) */}
                <div className="pt-1">
                  {/* ESTADOS DONDE SE MUESTRA "INICIAR VIAJE" */}
                  {[
                    "accepted",
                    "aceptado",
                    "assigned",
                    "asignado",
                    "assigned_driver",
                    "pending_driver",
                  ].includes(currentStatus) && (
                    <button
                      onClick={() => handleUpdateStatus("IN_PROGRESS")}
                      disabled={loading}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex justify-center items-center space-x-2 shadow-lg active:scale-95 transition-all"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Iniciar Viaje (En camino)</span>
                    </button>
                  )}

                  {/* ESTADOS DONDE SE MUESTRA "FINALIZAR CARRERA" */}
                  {[
                    "in_progress",
                    "en_camino",
                    "en camino",
                    "inprogress",
                  ].includes(currentStatus) && (
                    <button
                      onClick={() => handleUpdateStatus("COMPLETED")}
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
        })()}

      {/* 4. MODAL DESPLEGABLE DEL CHAT */}
      {isChatOpen && activeOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg h-[80vh] flex flex-col justify-between overflow-hidden shadow-2xl">
            {/* CABECERA CHAT */}
            <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-slate-200">
                  Chat con{" "}
                  {activeOrder.customer?.name ||
                    activeOrder.clientName ||
                    activeOrder.passengerName ||
                    "Cliente"}
                </span>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MENSAJES */}
            <div className="p-3 flex-1 overflow-y-auto space-y-2 text-xs">
              {chatMessages.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  Envía un mensaje para ponerte en contacto con el cliente...
                </p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[80%] p-2.5 rounded-2xl ${
                      (msg.senderType || "").toLowerCase() === "driver"
                        ? "bg-amber-500/20 text-amber-200 border border-amber-500/30 ml-auto rounded-br-none"
                        : "bg-slate-800 text-slate-200 border border-slate-700 mr-auto rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-[9px] text-slate-400 block text-right mt-1">
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                ))
              )}
              {/* Referencia para auto-scroll dinámico */}
              <div ref={chatEndRef} />
            </div>

            {/* INPUT MENSAJE */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-slate-800/50 border-t border-slate-800 flex space-x-2"
            >
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl transition-colors"
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
