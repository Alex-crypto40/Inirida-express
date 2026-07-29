import React from "react";
import { Routes, Route, Link } from "react-router-dom";

import Home from "./views/Home";
import Login from "./views/Login";
import StoreDetail from "./views/StoreDetail";
import { CartProvider } from "./context/CartContext";
import AdminStore from "./views/AdminStore";
import RegisterStore from "./views/RegisterStore";
import DriverDashboard from "./views/DriverDashboard";
import DriverLogin from "./views/DriverLogin";

// Vista para la convocatoria de domiciliarios
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

      {/* Botón hacia el Formulario de Registro / Login */}
      <Link to="/driver-login" className="mt-6">
        <button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all">
          Ingresar / Registrarme 🛵
        </button>
      </Link>
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <div className="bg-gray-50 min-h-screen flex flex-col w-full">
      
        <main className="max-w-md w-full mx-auto flex-1 overflow-x-hidden">
          {/* Intercambio de pantallas */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unete-repartidor" element={<Repartidores />} />
            <Route path="/store/:id" element={<StoreDetail />} />
            <Route path="/driver-login" element={<DriverLogin />} />
            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/admin/:storeId" element={<AdminStore />} />
            <Route path="/register-store" element={<RegisterStore />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  );
}

export default App;
