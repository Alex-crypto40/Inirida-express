import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Configuración de URLs dinámicas (Producción en Render / Desarrollo)
const IS_PROD =
  process.env.NODE_ENV === "production" ||
  window.location.hostname !== "localhost";

const BASE_DOMAIN = IS_PROD
  ? "https://inirida-express.onrender.com"
  : "http://localhost:5000";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Login() {
  const navigate = useNavigate();

  // Estados para capturar las credenciales y manejo de errores
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validación estricta en el cliente para campos vacíos
    if (!email.trim() || !password.trim()) {
      setError("Por favor, llena todos los campos.");
      setLoading(false);
      return;
    }

    try {
      // 🟢 Petición con URL dinámica para adaptarse a Render o Localhost automáticamente
      const response = await fetch(`${API_URL}/stores/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Error al iniciar sesión. Revisa tus credenciales.",
        );
        setLoading(false);
        return;
      }

      // ¡LOGIN EXITOSO!
      const storeData = data.store || data;
      const storeId = storeData._id || storeData.id;

      if (!storeId) {
        throw new Error(
          "Respuesta inválida del servidor: No se recibió el ID de la tienda.",
        );
      }

      // Persistencia completa en localStorage
      localStorage.setItem("token_tienda", storeId);
      localStorage.setItem(
        "nombre_tienda",
        storeData.name || storeData.nombre || "Aliado",
      );
      localStorage.setItem("storeData", JSON.stringify(storeData));

      // Redirección al panel de administración de la tienda
      navigate(`/admin/${storeId}`);
    } catch (err) {
      console.error("Error de red o servidor:", err);
      setError(
        err.message.includes("Respuesta inválida")
          ? err.message
          : "No hay conexión con el servidor. Verifica que el Backend esté activo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
        {/* Encabezado del Formulario */}
        <div className="text-center mb-6">
          <span className="text-4xl">🔑</span>
          <h2 className="text-2xl font-black text-gray-800 mt-2">
            Acceso Aliados
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Ingresa para administrar tu catálogo, servicios y pedidos
          </p>
        </div>

        {/* Alerta de Error Dinámica */}
        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-semibold mb-4 text-center border border-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-gray-800"
              placeholder="ejemplo@restaurante.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-gray-800"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-3 rounded-xl shadow-md shadow-orange-500/20 transition-all text-sm mt-2 disabled:bg-gray-400 flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Validando...</span>
              </>
            ) : (
              "Iniciar Sesión 🚀"
            )}
          </button>
        </form>

        {/* Registro de Aliados Controlado */}
        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            ¿Tu negocio o comercio aún no está en la plataforma?
          </p>
          <button
            type="button"
            onClick={() => navigate("/register-store")}
            className="text-xs text-orange-500 font-bold hover:underline block mt-1 w-full text-center"
          >
            Solicita tu acceso de Aliado aquí 📲
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
