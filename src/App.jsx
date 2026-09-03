import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

// Estilos CSS indispensables de Leaflet
import "leaflet/dist/leaflet.css";

// Corrección de rutas para los marcadores por defecto en Leaflet con React/Vite
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import Home from "./views/Home";
import Login from "./views/Login";
import StoreDetail from "./views/StoreDetail";
import { CartProvider } from "./context/CartContext";
import AdminStore from "./views/AdminStore";
import RegisterStore from "./views/RegisterStore";
import DriverDashboard from "./views/DriverDashboard";
import DriverLogin from "./views/DriverLogin";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://inirida-express.onrender.com");

function Repartidores() {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center p-6 text-center">
      <span className="text-5xl mb-4">🛺</span>
      <h2 className="text-2xl font-black text-gray-800">
        ¡Sé Domiciliario en Inírida!
      </h2>
      <p className="text-sm text-gray-500 mt-2 max-w-xs">
        ¿Tienes motocarro o moto? Regístrate para empezar a generar ingresos
        llevando los mejores platos de la ciudad.
      </p>

      <Link to="/driver-login" className="mt-6">
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all">
          Ingresar / Registrarme 🛵
        </button>
      </Link>
    </div>
  );
}

function App() {
  const [socket, setSocket] = useState(null);

  // Estado del conductor autenticado (recuperado de localStorage al iniciar/recargar)
  const [driver, setDriver] = useState(() => {
    try {
      const savedDriver = localStorage.getItem("current_driver");
      return savedDriver ? JSON.parse(savedDriver) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"], // 🟢 Priorizar WebSocket directo
      secure: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      withCredentials: true,
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("current_driver");
    setDriver(null);
    window.location.href = "/driver-login";
  };

  return (
    <CartProvider>
      <div className="bg-gray-50 min-h-screen flex flex-col w-full">
        <main className="max-w-md w-full mx-auto flex-1 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Home socket={socket} />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unete-repartidor" element={<Repartidores />} />
            <Route path="/store/:id" element={<StoreDetail />} />
            <Route
              path="/driver-login"
              element={<DriverLogin setDriver={setDriver} />}
            />
            <Route
              path="/driver"
              element={
                <DriverDashboard
                  socket={socket}
                  driverId={driver?._id || driver?.id}
                  driverName={driver?.name || driver?.nombre}
                  onLogout={handleLogout}
                />
              }
            />
            <Route path="/admin/:storeId" element={<AdminStore />} />
            <Route path="/register-store" element={<RegisterStore />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  );
}

export default App;
