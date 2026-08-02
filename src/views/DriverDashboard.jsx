import React, { useState, useEffect } from "react";
import OrderChatModal from "../components/OrderChatModal";

const API_URL =
  import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com/api";

export default function DriverDashboard() {
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

  // Estado para la contraoferta individual de cada orden disponible { [orderId]: monto }
  const [driverOffers, setDriverOffers] = useState({});

  // Maximum increment allowed over the client's offer
  const MAX_INCREMENT = 3000;

  // 1. Cargar pedidos disponibles
  const fetchAvailableOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders/available`);
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data);

        // Inicializar las ofertas propuestas por el conductor con el valor base de cada orden
        setDriverOffers((prev) => {
          const nextState = { ...prev };
          data.forEach((order) => {
            if (!nextState[order._id]) {
              nextState[order._id] = order.total || 4000;
            }
          });
          return nextState;
        });
      }
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    }
  };

  // 2. Escuchar pedidos periódicamente cuando está En Línea
  useEffect(() => {
    let interval;
    if (driver.isOnline) {
      fetchAvailableOrders();
      interval = setInterval(fetchAvailableOrders, 4000);
    } else {
      setAvailableOrders([]);
    }
    return () => clearInterval(interval);
  }, [driver.isOnline]);

  // 3. Consultar si tiene una orden activa al cargar/conectar
  const checkActiveOrder = async () => {
    if (!driver?.id) return;
    try {
      const res = await fetch(`${API_URL}/orders/driver/${driver.id}/active`);
      if (res.ok) {
        const data = await res.json();
        if (data.activeOrder) {
          setActiveOrder(data.activeOrder);
        }
      }
    } catch (error) {
      console.error("Error al consultar orden activa:", error);
    }
  };

  useEffect(() => {
    if (driver.isOnline) {
      checkActiveOrder();
      fetchAvailableOrders();
    }
  }, [driver.isOnline]);

  // Handler para ajustar el contador (- / +) respetando topes
  const handleAjustarTarifa = (orderId, delta, basePrice) => {
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

  // 5. Tomar pedido al precio directo ofertado por el cliente
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

  // 5B. Enviar Contraoferta al cliente (Flujo Inverso)
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

  // 6. Completar Pedido mediante PIN
  const handleCompleteOrder = async () => {
    if (!activeOrder) return;

    if (!inputPin.trim()) {
      alert("⚠️ Por favor ingresa el PIN de 4 dígitos del cliente.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/orders/${activeOrder._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          driverId: driver.id,
          pin: inputPin.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setActiveOrder(null);
        setInputPin("");
        setMessage("¡Entrega verificada y completada con éxito! 💵");
        fetchAvailableOrders();
      } else {
        alert(data.message || "PIN incorrecto o error al completar el pedido.");
      }
    } catch (error) {
      alert("Error al conectar con el servidor.");
    }
  };

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
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
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

      {/* VISTA DE CARRERA ACTIVA */}
      {activeOrder ? (
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-orange-500 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
              {activeOrder.serviceType === "ride"
                ? "🛺 Carrera Activa"
                : "📦 Pedido en Curso"}
            </span>
            <span className="font-extrabold text-orange-600 text-lg">
              ${activeOrder.total?.toLocaleString()}
            </span>
          </div>

          {/* Badges de Detalles de Carrera */}
          {activeOrder.serviceType === "ride" && activeOrder.rideDetails && (
            <div className="flex flex-wrap gap-2 mb-4 p-2.5 bg-orange-50 rounded-xl border border-orange-100">
              <span className="bg-white text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                👥 {activeOrder.rideDetails.passengersCount || 1} Pasajero(s)
              </span>
              {activeOrder.rideDetails.hasLuggage && (
                <span className="bg-white text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                  🧳 Con Carga/Maleta
                </span>
              )}
              {activeOrder.rideDetails.hasPets && (
                <span className="bg-white text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                  🐱 Con Mascota
                </span>
              )}
            </div>
          )}

          {/* 💬 Botón de Chat Directo */}
          <button
            onClick={() => setActiveChatOrder(activeOrder)}
            className="w-full mb-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <span>💬 Abrir Chat con Cliente / Comercio</span>
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">
              En Vivo
            </span>
          </button>

          <div className="space-y-3 mb-5 text-sm text-gray-700">
            {/* Información de Recogida / Comercio */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase">
                {activeOrder.serviceType === "ride"
                  ? "📍 Punto de Recogida"
                  : "🏪 Comercio / Tienda"}
              </p>
              <p className="font-bold text-gray-800">
                {activeOrder.serviceType === "ride"
                  ? activeOrder.customer?.address
                  : activeOrder.store?.name || "Comercio Aliado"}
              </p>
              {activeOrder.serviceType !== "ride" && (
                <p className="text-xs text-gray-500">
                  📍 {activeOrder.store?.address || "Dirección del comercio"}
                </p>
              )}
            </div>

            {/* Información del Cliente / Destino */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase">
                {activeOrder.serviceType === "ride"
                  ? "🏁 Pasajero / Destino"
                  : "👤 Cliente / Entrega"}
              </p>
              <p className="font-bold text-gray-800">
                {activeOrder.customer?.name || "Cliente Inírida Express"}
              </p>
              {activeOrder.serviceType !== "ride" && (
                <p className="text-xs text-gray-600">
                  📍 {activeOrder.customer?.address}
                </p>
              )}
              <p className="text-xs text-gray-600">
                📞 {activeOrder.customer?.phone}
              </p>
              {activeOrder.customer?.notes && (
                <p className="text-xs italic text-orange-600 mt-1">
                  Nota: "{activeOrder.customer.notes}"
                </p>
              )}
            </div>
          </div>

          {/* 🔐 Módulo de Confirmación con PIN */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <label className="block text-xs font-bold text-gray-700 text-center">
              🔐 Ingresa el PIN de 4 dígitos del cliente para finalizar:
            </label>
            <input
              type="text"
              maxLength="4"
              placeholder="Ej: 4321"
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value)}
              className="w-full text-center tracking-widest text-xl font-extrabold border border-gray-300 rounded-xl py-2 focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
            />
            <button
              onClick={handleCompleteOrder}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors cursor-pointer"
            >
              💵 Verificar PIN y Completar Carrera
            </button>
          </div>
        </div>
      ) : (
        /* VISTA DE CARRERAS DISPONIBLES */
        <div>
          <h3 className="font-bold text-gray-800 mb-3 flex justify-between items-center text-sm">
            <span>Solicitudes Disponibles</span>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
              {availableOrders.length}
            </span>
          </h3>

          {!driver.isOnline ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
              <p className="text-4xl mb-2">🛵</p>
              <p className="text-sm font-semibold">
                Ponte "En línea" para ver carreras y pedidos disponibles.
              </p>
            </div>
          ) : availableOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
              <p className="text-3xl mb-2">⏳</p>
              <p className="text-xs">
                Buscando nuevas solicitudes en tiempo real...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableOrders.map((order) => {
                const isRide = order.serviceType === "ride" || order.isMandado;
                const clientPrice = order.total || 4000;
                const currentProposed = driverOffers[order._id] || clientPrice;
                const isModified = currentProposed !== clientPrice;

                return (
                  <div
                    key={order._id}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span
                          className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase mb-1 ${
                            isRide
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {isRide ? "🛺 Motocarro" : "🛍️ Tienda"}
                        </span>
                        <h4 className="font-bold text-gray-800 text-sm">
                          {isRide
                            ? `Origen: ${
                                order.customer?.address || "Zona Urbana"
                              }`
                            : order.store?.name || "Pedido de Comercio"}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {isRide
                            ? `${order.customer?.notes || ""}`
                            : `📍 Entregar en: ${order.customer?.address}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block font-medium">
                          Oferta Cliente
                        </span>
                        <span className="font-extrabold text-gray-800 text-sm">
                          ${clientPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Mostrar Badges visuales */}
                    {order.rideDetails && (
                      <div className="flex flex-wrap gap-1.5 my-2">
                        <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          👥 {order.rideDetails.passengersCount || 1} Pza
                        </span>
                        {order.rideDetails.hasLuggage && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            🧳 Maleta/Carga
                          </span>
                        )}
                        {order.rideDetails.hasPets && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            🐱 Mascota
                          </span>
                        )}
                      </div>
                    )}

                    {/* CONTROLES DE TARIFA E INVERSO (SOLO PARA MOTOCARROS) */}
                    {isRide && (
                      <div className="mt-2 pt-2 border-t border-gray-100 bg-orange-50/50 p-2.5 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-orange-900">
                            Tu Propuesta:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleAjustarTarifa(
                                  order._id,
                                  -1000,
                                  clientPrice,
                                )
                              }
                              disabled={currentProposed <= clientPrice}
                              className={`w-7 h-7 rounded-lg bg-white border border-orange-200 text-orange-700 font-bold text-sm flex items-center justify-center ${
                                currentProposed <= clientPrice
                                  ? "opacity-30 cursor-not-allowed"
                                  : "hover:bg-orange-100 cursor-pointer"
                              }`}
                            >
                              -
                            </button>
                            <span className="font-black text-orange-600 text-sm min-w-[65px] text-center">
                              ${currentProposed.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleAjustarTarifa(
                                  order._id,
                                  1000,
                                  clientPrice,
                                )
                              }
                              disabled={
                                currentProposed >= clientPrice + MAX_INCREMENT
                              }
                              className={`w-7 h-7 rounded-lg bg-orange-500 text-white font-bold text-sm flex items-center justify-center ${
                                currentProposed >= clientPrice + MAX_INCREMENT
                                  ? "opacity-30 cursor-not-allowed"
                                  : "hover:bg-orange-600 cursor-pointer"
                              }`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* Aceptar directo por la oferta original del cliente */}
                          <button
                            onClick={() => handleTakeOrder(order._id)}
                            disabled={loading}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate"
                          >
                            Aceptar ${clientPrice.toLocaleString()}
                          </button>

                          {/* Enviar Contraoferta si ajustó el precio */}
                          <button
                            onClick={() =>
                              isModified
                                ? handleSendCounterOffer(order._id)
                                : handleTakeOrder(order._id)
                            }
                            disabled={loading}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
                              isModified
                                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
                                : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                            }`}
                          >
                            {isModified
                              ? `Ofertar $${currentProposed.toLocaleString()}`
                              : "Misma Oferta"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* BANDERAS DE TIENDAS / PEDIDOS REGULARES */}
                    {!isRide && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                        <span className="text-xs text-gray-400">
                          Total Pedido:{" "}
                          <strong className="text-gray-700">
                            ${clientPrice.toLocaleString()} COP
                          </strong>
                        </span>
                        <button
                          onClick={() => handleTakeOrder(order._id)}
                          disabled={loading}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform cursor-pointer"
                        >
                          {loading ? "Tomando..." : "Tomar Pedido 📦"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal del Chat */}
      {activeChatOrder && (
        <OrderChatModal
          orderId={activeChatOrder._id}
          currentUserRole="driver"
          currentUserId={driver.id}
          currentUserName={driver.name || "Domiciliario"}
          onClose={() => setActiveChatOrder(null)}
        />
      )}
    </div>
  );
}
