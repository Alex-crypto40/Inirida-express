import { useState } from "react";
import { useNavigate } from "react-router-dom";

function RegisterStore() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("restaurante"); // Por defecto en minúsculas
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const newStore = {
      name,
      email,
      password,
      phone,
      category, // Se envía tal cual (ej: "hotel", "turismo")
    };

    try {
      const response = await fetch(
        "http://192.168.1.245:5000/api/stores/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newStore),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage(
          "🎉 ¡Solicitud recibida! Revisaremos tu comercio y te notificaremos cuando esté activo.",
        );
        setName("");
        setEmail("");
        setPassword("");
        setPhone("");
      } else {
        setMessage(`⚠️ ${data.message}`);
      }
    } catch (error) {
      setMessage("⚠️ Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const placeholdersPorCategoria = {
    restaurante: "Ej: Pizzería El Toque Real",
    licorera: "Ej: Licorera El Bodegón",
    hotel: "Ej: Hotel Oasis Inírida",
    mandados: "Ej: Mensajería Express",
    supermercado: "Ej: Supermercado El Proveedor",
    transporte: "Ej: Motocarros Inírida S.A.",
    turismo: "Ej: Guías Turísticos Cerros de Mavecure",
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="flex items-center justify-start mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-orange-500 text-slate-700 hover:text-white font-bold text-xs shadow-sm hover:shadow-md hover:shadow-orange-200 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            {/* Flecha SVG Gruesa con animación de desplazamiento a la izquierda al hacer hover */}
            <svg
              className="w-4 h-4 stroke-[3.5] transition-transform duration-200 group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            <span>Volver</span>
          </button>
        </div>
        <div className="text-center mb-6">
          <span className="text-4xl">🏪</span>
          <h2 className="text-2xl font-black text-gray-800 mt-2">
            Registra tu Comercio
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Únete a la red comercial de Inírida Express
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl mb-4 text-xs font-semibold text-center ${isSuccess ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
          >
            {message}
          </div>
        )}

        {!isSuccess ? (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* 1. CATEGORÍA (Ahora arriba del todo para activar el placeholder dinámico) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Tipo de Servicio / Categoría *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all capitalize"
              >
                <option value="restaurante">Restaurante</option>
                <option value="licorera">Licorera</option>
                <option value="hotel">Hotel</option>
                <option value="mandados">Mandados</option>
                <option value="supermercado">Supermercado</option>
                <option value="transporte">Transporte</option>
                <option value="turismo">Turismo</option>
              </select>
            </div>

            {/* 2. NOMBRE DEL COMERCIO (Con el placeholder dinámico activado) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Nombre del Comercio / Negocio *
              </label>
              <input
                type="text"
                required
                placeholder={
                  placeholdersPorCategoria[category] ||
                  "Ej: Tu increíble negocio"
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
              />
            </div>

            {/* 3. TELÉFONO / CELULAR (Ahora ocupa todo el ancho de forma independiente o lo puedes emparejar con otro campo) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Teléfono / Celular de Contacto
              </label>
              <input
                type="text"
                placeholder="Ej: 3124567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
              />
            </div>

            {/* 4. CORREO ELECTRÓNICO */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                placeholder="ejemplo@comercio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
              />
            </div>

            {/* 5. CONTRASEÑA */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Contraseña para tu panel *
              </label>
              <input
                type="password"
                required
                placeholder="Crea una contraseña segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
              />
            </div>

            {/* BOTÓN DE ENVIAR */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm mt-2 disabled:bg-gray-400 cursor-pointer"
            >
              {loading ? "Enviando solicitud..." : "Enviar Registro 🚀"}
            </button>

            {/* ENLACE PARA INICIAR SESIÓN */}
            <div className="text-center mt-3">
              <p className="text-xs text-gray-500 font-medium">
                ¿Ya tienes una cuenta?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </p>
            </div>
          </form>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all text-sm mt-2 cursor-pointer"
          >
            Ir al Login de Aliados ⬅️
          </button>
        )}
      </div>
    </div>
  );
}

export default RegisterStore;
