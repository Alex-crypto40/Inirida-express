import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://192.168.1.245:5000/api";

export default function DriverLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    vehicleType: "moto",
    vehiclePlate: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleRegisterMode = () => {
    setIsRegister(!isRegister);
    setFormData({
      name: "",
      phone: "",
      email: "",
      password: "",
      vehicleType: "moto",
      vehiclePlate: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validaciones previas en el Frontend para Registro
    if (isRegister) {
      const { name, phone, email, password, vehicleType, vehiclePlate } =
        formData;

      if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
        alert("Por favor completa todos los campos obligatorios.");
        return;
      }

      // Si el vehículo NO es bicicleta, la placa es 100% obligatoria
      if (vehicleType !== "bicicleta" && !vehiclePlate.trim()) {
        alert("La placa del vehículo es obligatoria para motos y motocarros.");
        return;
      }
    }

    const endpoint = isRegister ? "/drivers/register" : "/drivers/login";

    // 2. Preparar el payload enviando 'N/A' en la placa si es bicicleta sin placa
    const payload = {
      ...formData,
      vehiclePlate:
        formData.vehicleType === "bicicleta" && !formData.vehiclePlate.trim()
          ? "N/A"
          : formData.vehiclePlate.trim().toUpperCase(),
    };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister
            ? payload
            : { email: formData.email, password: formData.password },
        ),
      });

      const data = await res.json();

      if (res.ok) {
        if (isRegister) {
          alert("Registro exitoso. Un administrador aprobará tu cuenta.");
          toggleRegisterMode();
        } else {
          // Guardar en localStorage la sesión del domiciliario
          localStorage.setItem("driverInfo", JSON.stringify(data.driver));
          navigate("/driver");
        }
      } else {
        alert(data.message || "Error al procesar la solicitud.");
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 p-6 flex flex-col justify-center">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
        <h2 className="text-xl font-bold text-gray-800 text-center mb-2">
          {isRegister
            ? "Registro de Domiciliario 🛵"
            : "Acceso Domiciliarios 🛵"}
        </h2>
        <p className="text-xs text-gray-500 text-center mb-6">
          {isRegister
            ? "Súmate al equipo de entregas de Inírida"
            : "Ingresa para empezar a tomar carreras"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {isRegister && (
            <>
              {/* Nombre Completo */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ""}
                  placeholder="Ej: Carlos Pérez"
                  autoComplete="off"
                  required
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Teléfono / WhatsApp */}
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ""}
                  placeholder="Ej: 3101234567"
                  autoComplete="off"
                  required
                  onChange={handleChange}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Vehículo y Placa */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">
                    Vehículo *
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType || "moto"}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="moto">Moto</option>
                    <option value="motocarro">Motocarro</option>
                    <option value="bicicleta">Bicicleta</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">
                    Placa{" "}
                    {formData.vehicleType !== "bicicleta" ? "*" : "(Opcional)"}
                  </label>
                  <input
                    type="text"
                    name="vehiclePlate"
                    value={formData.vehiclePlate || ""}
                    placeholder={
                      formData.vehicleType === "bicicleta"
                        ? "N/A"
                        : "Ej: ABC12D"
                    }
                    autoComplete="off"
                    required={formData.vehicleType !== "bicicleta"}
                    onChange={handleChange}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Correo Electrónico */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              Correo Electrónico *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              placeholder="ejemplo@correo.com"
              autoComplete="off"
              required
              onChange={handleChange}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              Contraseña *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password || ""}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              onChange={handleChange}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Botón Enviar */}
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold p-3 rounded-xl text-sm shadow-md active:scale-95 transition-all mt-4"
          >
            {isRegister ? "Registrarme" : "Iniciar Sesión"}
          </button>
        </form>

        {/* Cambiar entre Login y Registro */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={toggleRegisterMode}
            className="text-xs text-orange-600 font-bold hover:underline"
          >
            {isRegister
              ? "¿Ya tienes cuenta? Inicia sesión"
              : "¿Quieres ser domiciliario? Regístrate"}
          </button>
        </div>
      </div>
    </div>
  );
}
