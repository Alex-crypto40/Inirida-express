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

  // 1. Cargar pedidos disponibles
  const fetchAvailableOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/orders/available`);
      if (res.ok) {
        const data = await res.json();
        setAvailableOrders(data);
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

      {/* VISTA DE CARRERA ACTIVA (SIMPLIFICADA) */}
      {activeOrder ? (
        <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-orange-500 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
              Carrera en Curso
            </span>
            <span className="font-extrabold text-orange-600 text-lg">
              ${activeOrder.total?.toLocaleString()}
            </span>
          </div>

          {/* 💬 Botón de Chat Directo */}
          <button
            onClick={() => setActiveChatOrder(activeOrder)}
            className="w-full mb-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>💬 Abrir Chat con Cliente / Comercio</span>
            <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">
              En Vivo
            </span>
          </button>

          <div className="space-y-3 mb-5 text-sm text-gray-700">
            {/* Información del Comercio */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase">
                Comercio / Recogida
              </p>
              <p className="font-bold text-gray-800">
                {activeOrder.store?.name || "Comercio Aliado"}
              </p>
              <p className="text-xs text-gray-500">
                📍 {activeOrder.store?.address || "Dirección del comercio"}
              </p>
            </div>

            {/* Información del Cliente */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase">
                Cliente / Entrega
              </p>
              <p className="font-bold text-gray-800">
                {activeOrder.customer?.name}
              </p>
              <p className="text-xs text-gray-600">
                📍 {activeOrder.customer?.address}
              </p>
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
              className="w-full text-center tracking-widest text-xl font-extrabold border border-gray-300 rounded-xl py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <button
              onClick={handleCompleteOrder}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors"
            >
              💵 Verificar PIN y Entregar
            </button>
          </div>
        </div>
      ) : (
        /* VISTA DE CARRERAS DISPONIBLES */
        <div>
          <h3 className="font-bold text-gray-800 mb-3 flex justify-between items-center text-sm">
            <span>Carreras Disponibles</span>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
              {availableOrders.length}
            </span>
          </h3>

          {!driver.isOnline ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
              <p className="text-4xl mb-2">🛵</p>
              <p className="text-sm font-semibold">
                Ponte "En línea" para ver pedidos disponibles.
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
              {availableOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">
                        {order.store?.name || "Pedido de Comercio"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        📍 Entregar en: {order.customer?.address}
                      </p>
                    </div>
                    <span className="font-extrabold text-green-600 text-sm">
                      ${order.total?.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                    <span className="text-xs text-gray-400">
                      Gana tarifa de domicilio:{" "}
                      <strong className="text-gray-700">
                        ${order.deliveryFee}
                      </strong>
                    </span>
                    <button
                      onClick={() => handleTakeOrder(order._id)}
                      disabled={loading}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-transform"
                    >
                      {loading ? "Tomando..." : "Tomar Pedido 🛵"}
                    </button>
                  </div>
                </div>
              ))}
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
