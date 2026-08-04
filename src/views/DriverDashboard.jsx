import React, { useState, useEffect, useRef } from "react";
import OrderChatModal from "../components/OrderChatModal";

const API_URL =
  import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com/api";

// Auxiliar para validar si la orden es un servicio de pasajeros/motocarro
const checkIsRide = (order) => {
  if (!order) return false;
  const type = (
    order.serviceType ||
    order.orderType ||
    order.type ||
    ""
  ).toLowerCase();
  return (
    type === "ride" ||
    type === "pasajero" ||
    type === "taxi" ||
    order.isRide === true ||
    order.isMandado === true
  );
};

export default function DriverDashboard({ socket }) {
  const [driver, setDriver] = useState(() => {
    const saved = localStorage.getItem("driverInfo");
    return saved
      ? JSON.parse(saved)
      : { id: "", name: "Domiciliario", isOnline: false };
  });

  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [inputPin, setInputPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [driverOffers, setDriverOffers] = useState({});
  const modifiedOffersRef = useRef({});

  const MAX_INCREMENT = 3000;

  // 🛰️ EFECTO GPS: Rastreo en tiempo real mediante WebSockets cuando está En Línea
  useEffect(() => {
    let watchId;
    const driverId = driver.id || driver._id;

    if (driver.isOnline && socket && driverId) {
      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;

            // Transmitir coordenadas al servidor vía WebSocket
            socket.emit("update_driver_location", {
              driverId,
              driverName: driver.name || "Conductor Motocarro",
              lat: latitude,
              lng: longitude,
              isAvailable: true,
            });
          },
          (error) => console.error("Error al obtener ubicación GPS:", error),
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          },
        );
      }
    } else if (!driver.isOnline && socket && driverId) {
      // Notificar al servidor que el conductor se desconectó del mapa
      socket.emit("update_driver_location", {
        driverId,
        isAvailable: false,
      });
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [driver.isOnline, driver.id, driver.name, socket]);

  // 1. Cargar pedidos disponibles
  const fetchAvailableOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders/available`);
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data);

        setDriverOffers((prev) => {
          const nextState = { ...prev };
          data.forEach((order) => {
            const orderId = order._id || order.id;
            if (!modifiedOffersRef.current[orderId] && !nextState[orderId]) {
              nextState[orderId] = order.total || 4000;
            }
          });
          return nextState;
        });
      }
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    }
  };

  // 2. Consultar si tiene una orden activa
  const checkActiveOrder = async () => {
    if (!driver?.id) return;
    try {
      const res = await fetch(`${API_URL}/orders/driver/${driver.id}/active`);
      if (res.ok) {
        const data = await res.json();
        if (data.activeOrder) {
          setActiveOrder(data.activeOrder);
        } else {
          setActiveOrder(null);
        }
      } else if (res.status === 404) {
        setActiveOrder(null);
      }
    } catch (error) {
      console.error("Error al consultar orden activa:", error);
    }
  };

  // 3. Control de Polling periódico
  useEffect(() => {
    let interval;
    if (driver.isOnline) {
      checkActiveOrder();
      fetchAvailableOrders();

      interval = setInterval(() => {
        fetchAvailableOrders();
      }, 4000);
    } else {
      setAvailableOrders([]);
    }
    return () => clearInterval(interval);
  }, [driver.isOnline, driver.id]);

  const handleAjustarTarifa = (orderId, delta, basePrice) => {
    modifiedOffersRef.current[orderId] = true;
    setDriverOffers((prev) => {
      const currentVal = prev[orderId] || basePrice;
      const minPermitido = basePrice;
      const maxPermitido = basePrice + MAX_INCREMENT;

      const nuevoValor = Math.min(
        maxPermitido,
        Math.max(minPermitido, currentVal + delta),
      );

      return { ...prev, [orderId]: nuevoValor };
    });
  };

  // 4. Cambiar estado En línea / Desconectado
  const toggleOnline = async () => {
    if (!driver.id) {
      alert("Debes iniciar sesión como repartidor.");
      return;
    }
    const newStatus = !driver.isOnline;
    try {
      const res = await fetch(`${API_URL}/drivers/${driver.id}/online`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: newStatus }),
      });
      if (res.ok) {
        const updatedDriver = { ...driver, isOnline: newStatus };
        setDriver(updatedDriver);
        localStorage.setItem("driverInfo", JSON.stringify(updatedDriver));
      }
    } catch (error) {
      alert("Error al cambiar de estado.");
    }
  };

  // 5. Tomar pedido
  const handleTakeOrder = async (orderId) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/take`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driver.id }),
      });

      const data = await res.json();

      if (res.ok) {
        setActiveOrder(data.order);
        setAvailableOrders((prev) => prev.filter((o) => o._id !== orderId));
        setMessage("¡Carrera asignada con éxito! 🛵");
      } else {
        alert(data.message || "No se pudo tomar la carrera.");
        fetchAvailableOrders();
      }
    } catch (error) {
      alert("Error de conexión al intentar tomar la carrera.");
    } finally {
      setLoading(false);
    }
  };

  // 5B. Enviar Contraoferta
  const handleSendCounterOffer = async (orderId) => {
    const proposedPrice = driverOffers[orderId];
    if (!proposedPrice) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/counter-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: driver.id,
          driverName: driver.name || "Conductor Motocarro",
          proposedPrice: Number(proposedPrice),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(
          `Oferta enviada por $${proposedPrice.toLocaleString()} COP. Esperando respuesta... ⏳`,
        );
        fetchAvailableOrders();
      } else {
        alert(data.message || "Error al enviar la propuesta.");
      }
    } catch (error) {
      console.error("Error al enviar contraoferta:", error);
      alert("Error al enviar la oferta al cliente.");
    } finally {
      setLoading(false);
    }
  };

  // 6. Completar Pedido
  const handleCompleteOrder = async () => {
    if (!activeOrder) return;

    const isRide = checkIsRide(activeOrder);

    if (!isRide && !inputPin.trim()) {
      alert("⚠️ Por favor ingresa el PIN de 4 dígitos del cliente.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        status: "completed",
        driverId: driver.id,
      };

      if (!isRide) {
        payload.pin = inputPin.trim();
      }

      const res = await fetch(`${API_URL}/orders/${activeOrder._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setActiveOrder(null);
        setInputPin("");
        setMessage(
          isRide
            ? "¡Carrera finalizada con éxito! 💵"
            : "¡Entrega verificada y completada con éxito! 📦",
        );
        fetchAvailableOrders();
      } else {
        alert(
          data.message ||
            (isRide
              ? "Error al finalizar la carrera."
              : "PIN incorrecto o error al completar el pedido."),
        );
      }
    } catch (error) {
      alert("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const isCurrentActiveRide = checkIsRide(activeOrder);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 p-4 pb-20">
      {/* Encabezado del Domiciliario */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-gray-800 text-lg">
            Hola, {driver.name} 👋
          </h2>
          <p className="text-xs text-gray-500">
            Estado:{" "}
            <span
              className={
                driver.isOnline
                  ? "text-green-600 font-semibold"
                  : "text-red-500 font-semibold"
              }
            >
              {driver.isOnline ? "En línea 🟢" : "Desconectado 🔴"}
            </span>
          </p>
        </div>
        <button
          onClick={toggleOnline}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            driver.isOnline
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-green-500 text-white hover:bg-green-600 shadow-md"
          }`}
        >
          {driver.isOnline ? "Desconectar" : "Conectarme"}
        </button>
      </div>

      {message && (
        <div className="bg-orange-100 text-orange-800 p-3 rounded-xl text-xs font-semibold mb-4 text-center">
          {message}
        </div>
      )}

      {/* VISTA DE CARRERA / PEDIDO ACTIVO */}
      {activeOrder ? (
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-orange-500 mb-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {isCurrentActiveRide ? "🛺 Carrera Activa" : "📦 Pedido en Curso"}
            </span>
            <span className="font-extrabold text-orange-600 text-xl">
              ${activeOrder.total?.toLocaleString()}
            </span>
          </div>

          {/* Badges de Detalles de Carrera */}
          {isCurrentActiveRide && activeOrder.rideDetails && (
            <div className="flex flex-wrap gap-2 p-2.5 bg-orange-50 rounded-xl border border-orange-100">
              <span className="bg-white text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-200 shadow-xs">
                👥 {activeOrder.rideDetails.passengersCount || 1} Pasajero(s)
              </span>
              {activeOrder.rideDetails.hasLuggage && (
                <span className="bg-white text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-200 shadow-xs">
                  🧳 Con Carga/Maleta
                </span>
              )}
              {activeOrder.rideDetails.hasPets && (
                <span className="bg-white text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-200 shadow-xs">
                  🐱 Con Mascota
                </span>
              )}
            </div>
          )}

          {/* 💬 Botón de Chat Directo */}
          <button
            onClick={() => setActiveChatOrder(activeOrder)}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <span>💬 Abrir Chat con Cliente / Comercio</span>
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold">
              En Vivo
            </span>
          </button>

          <div className="space-y-3 text-sm text-gray-700">
            {/* Información de Recogida / Comercio */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase">
                {isCurrentActiveRide
                  ? "📍 Punto A (Recoger en)"
                  : "🏪 Comercio / Tienda"}
              </p>
              <p className="font-bold text-gray-800">
                {isCurrentActiveRide
                  ? activeOrder.customer?.address || "Ubicación del cliente"
                  : activeOrder.store?.name || "Comercio Aliado"}
              </p>
              {!isCurrentActiveRide && (
                <p className="text-xs text-gray-500">
                  📍 {activeOrder.store?.address || "Dirección del comercio"}
                </p>
              )}
            </div>

            {/* Información del Cliente / Destino */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase">
                {isCurrentActiveRide
                  ? "🏁 Punto B (Destino / Pasajero)"
                  : "👤 Cliente / Entrega"}
              </p>
              <p className="font-bold text-gray-800">
                {activeOrder.customer?.name || "Cliente Inírida Express"}
              </p>
              <p className="text-xs text-gray-600 font-medium mt-0.5">
                📞 {activeOrder.customer?.phone}
              </p>
              {activeOrder.customer?.notes && (
                <p className="text-xs italic text-orange-600 mt-1 font-semibold">
                  "{activeOrder.customer.notes}"
                </p>
              )}
            </div>
          </div>

          {/* MÓDULO DE FINALIZACIÓN */}
          {isCurrentActiveRide ? (
            <button
              onClick={handleCompleteOrder}
              disabled={loading}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-base shadow-md transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
            >
              <span>{loading ? "Finalizando..." : "Finalizar Carrera 💵"}</span>
            </button>
          ) : (
            <div className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="Ingresa PIN de 4 dígitos"
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                maxLength={4}
                className="w-full p-3 border border-gray-300 rounded-xl text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <button
                onClick={handleCompleteOrder}
                disabled={loading}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer active:scale-98"
              >
                {loading ? "Verificando..." : "Completar Entrega 📦"}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* LISTA DE CARRERAS DISPONIBLES */
        <div className="space-y-4">
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">
            Solicitudes Disponibles ({availableOrders.length})
          </h3>

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <p className="text-3xl mb-2">🛺</p>
              <p className="text-gray-500 font-medium text-sm">
                No hay carreras ni pedidos pendientes en Inírida.
              </p>
            </div>
          ) : (
            availableOrders.map((order) => {
              const orderId = order._id || order.id;
              const basePrice = order.total || 4000;
              const currentOffer = driverOffers[orderId] || basePrice;
              const isRide = checkIsRide(order);

              return (
                <div
                  key={orderId}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {isRide ? "🛺 Carrera" : "📦 Pedido"}
                      </span>
                      <h4 className="font-bold text-gray-800 text-base mt-1">
                        {isRide
                          ? order.customer?.address || "Solicitud de Motocarro"
                          : order.store?.name || "Comercio"}
                      </h4>
                    </div>
                    <span className="text-lg font-black text-gray-900">
                      ${basePrice.toLocaleString()}
                    </span>
                  </div>

                  {/* Detalle visual de Ruta (Origen y Destino) para Carreras */}
                  {isRide && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/60 space-y-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">
                            Origen / Recogida
                          </span>
                          <span className="font-semibold text-gray-800">
                            {order.customer?.address ||
                              "Ubicación no especificada"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-1 border-t border-gray-200/40">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">
                            Destino / Notas
                          </span>
                          <span className="font-semibold text-gray-800">
                            {order.customer?.notes ||
                              "Sin especificación de destino"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Indicadores Adicionales de la Carrera */}
                  {isRide && order.rideDetails && (
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                        👥 {order.rideDetails.passengersCount || 1} Pasajero(s)
                      </span>
                      {order.rideDetails.hasLuggage && (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-medium">
                          🧳 Con Carga
                        </span>
                      )}
                      {order.rideDetails.hasPets && (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-medium">
                          🐱 Con Mascota
                        </span>
                      )}
                    </div>
                  )}

                  {/* Contraoferta opcional */}
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">
                      Proponer tarifa:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleAjustarTarifa(orderId, -500, basePrice)
                        }
                        className="w-7 h-7 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 shadow-xs flex items-center justify-center active:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="font-bold text-sm text-orange-600 min-w-[70px] text-center">
                        ${currentOffer.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleAjustarTarifa(orderId, 500, basePrice)
                        }
                        className="w-7 h-7 bg-white border border-gray-300 rounded-lg font-bold text-gray-700 shadow-xs flex items-center justify-center active:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleSendCounterOffer(orderId)}
                      disabled={loading}
                      className="py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Enviar Oferta 💬
                    </button>
                    <button
                      onClick={() => handleTakeOrder(orderId)}
                      disabled={loading}
                      className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Aceptar Directo 🤝
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal de Chat si aplica */}
      {activeChatOrder && (
        <OrderChatModal
          orderId={activeChatOrder._id}
          currentUserRole="driver"
          currentUserId={driver.id}
          currentUserName={driver.name}
          onClose={() => setActiveChatOrder(null)}
        />
      )}
    </div>
  );
}
