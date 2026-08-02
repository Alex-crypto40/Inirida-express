import { useState } from "react";

function MotocarroForm({ onOrderCreated }) {
  // 1. Datos del cliente y ruta
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [comentarios, setComentarios] = useState("");

  // Estado para la lectura GPS
  const [loadingGps, setLoadingGps] = useState(false);

  // 2. Opciones de viaje
  const [zona, setZona] = useState("urbana");
  const [oferta, setOferta] = useState(4000);
  const [passengersCount, setPassengersCount] = useState(1);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [hasPets, setHasPets] = useState(false);

  // Toggle para mostrar/ocultar opciones avanzadas
  const [showExtraOptions, setShowExtraOptions] = useState(false);

  // Configuración de Zonas de Inírida
  const zonasTarifas = {
    urbana: { nombre: "Urbana / Centro", base: 4000 },
    coco: { nombre: "Centro ↔ Coco Viejo", base: 6000 },
    aeropuerto: { nombre: "Trayecto Aeropuerto", base: 12000 },
  };

  const handleSelectZona = (nuevaZona) => {
    setZona(nuevaZona);
    setOferta(zonasTarifas[nuevaZona].base);
  };

  // Función para autoseleccionar zona al tocar chips rápidos
  const handleQuickChipSelect = (chipName) => {
    setDestino(chipName);
    if (chipName === "Aeropuerto") {
      handleSelectZona("aeropuerto");
    } else if (chipName === "Coco Viejo") {
      handleSelectZona("coco");
    } else {
      handleSelectZona("urbana");
    }
  };

  // Función para capturar ubicación con GPS
  const obtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador o dispositivo no soporta geolocalización.");
      return;
    }

    setLoadingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();

          const barrioOCalle =
            data.address?.road ||
            data.address?.suburb ||
            data.address?.neighbourhood;

          if (barrioOCalle) {
            setOrigen(`📍 Ubicación GPS (${barrioOCalle}, Inírida)`);
          } else {
            setOrigen(`https://maps.google.com/?q=${latitude},${longitude}`);
          }
        } catch (error) {
          setOrigen(`https://maps.google.com/?q=${latitude},${longitude}`);
        } finally {
          setLoadingGps(false);
        }
      },
      (error) => {
        setLoadingGps(false);
        alert(
          "No se pudo obtener la ubicación. Asegúrate de activar los permisos de GPS en tu navegador."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const solicitarCarrera = async (e) => {
    e.preventDefault();
    if (!origen.trim() || !destino.trim() || !telefono.trim()) {
      alert(
        "Por favor completa los campos obligatorios (Celular, Origen y Destino)."
      );
      return;
    }

    const pedidoMotocarro = {
      serviceType: "ride",
      isMandado: false,
      store: null,
      rideDetails: {
        passengersCount: Number(passengersCount),
        hasLuggage: Boolean(hasLuggage),
        hasPets: Boolean(hasPets),
      },
      customer: {
        name: nombre.trim() || "Cliente Motocarro",
        phone: telefono.trim(),
        address: origen,
        notes: `Destino: ${destino}.`,
      },
      items: [
        {
          name: `Carrera Motocarro (${
            zonasTarifas[zona]?.nombre || "Zona General"
          })`,
          price: Number(oferta),
          quantity: 1,
        },
      ],
      subtotal: Number(oferta),
      deliveryFee: 0,
      total: Number(oferta),
      status: "pending_driver",
      notes: comentarios || "",
    };

    try {
      const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const API_BASE = RAW_API.replace(/\/api\/?$/, "");

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoMotocarro),
      });

      if (res.ok) {
        const data = await res.json();
        alert(
          `🛺 ¡Carrera solicitada! Buscando motocarro por $${oferta.toLocaleString()} COP...`
        );

        if (onOrderCreated) {
          onOrderCreated(data.order || data);
        }

        // Limpiar formulario tras éxito
        setOrigen("");
        setDestino("");
        setComentarios("");
        setShowExtraOptions(false);
      } else {
        alert("Hubo un error al crear la solicitud en el servidor.");
      }
    } catch (error) {
      console.error("Error al conectar con la API:", error);
      alert("No se pudo conectar con el servidor backend.");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 max-w-md mx-auto">
      {/* Header Breve */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl p-2 bg-orange-100 rounded-xl">🛺</span>
          <div>
            <h3 className="font-extrabold text-sm text-gray-800">
              Pedir Carrera
            </h3>
            <p className="text-[11px] text-gray-400">Solicitud rápida</p>
          </div>
        </div>
      </div>

      <form onSubmit={solicitarCarrera} className="space-y-3">
        {/* Teléfono y Nombre rápido */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="tel"
            placeholder="📱 Celular *"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none font-medium"
            required
          />
          <input
            type="text"
            placeholder="👤 Nombre (opcional)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none font-medium"
          />
        </div>

        {/* Tarjeta de Ruta Unificada con GPS */}
        <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80 space-y-2 relative">
          {/* Línea conectora visual */}
          <div className="absolute left-[22px] top-[28px] bottom-[28px] w-0.5 bg-gray-300 pointer-events-none" />

          {/* Campo Origen + Botón GPS */}
          <div className="flex items-center gap-2 relative z-10">
            <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
              A
            </span>
            <input
              type="text"
              placeholder="¿Dónde te recogen? *"
              value={origen}
              onChange={(e) => setOrigen(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-white border border-gray-200 focus:border-orange-500 outline-none font-medium text-gray-800 truncate"
              required
            />
            {/* Botón Geolocalización */}
            <button
              type="button"
              onClick={obtenerUbicacionGPS}
              disabled={loadingGps}
              className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              title="Obtener mi ubicación actual por GPS"
            >
              {loadingGps ? "⌛" : "📍 GPS"}
            </button>
          </div>

          {/* Campo Destino */}
          <div className="flex items-center gap-2 relative z-10">
            <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
              B
            </span>
            <input
              type="text"
              placeholder="¿A dónde vas? *"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-white border border-gray-200 focus:border-orange-500 outline-none font-medium text-gray-800"
              required
            />
          </div>

          {/* Chips Rápidos de Destino */}
          <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar">
            {["Centro", "Aeropuerto", "Coco Viejo", "Hospital"].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickChipSelect(chip)}
                className="text-[10px] bg-white hover:bg-orange-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Selección de Trayecto Rápida */}
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(zonasTarifas).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectZona(key)}
              className={`p-2 rounded-xl border text-[10px] font-bold transition-all text-center ${
                zona === key
                  ? "bg-orange-500 border-orange-500 text-white shadow-xs"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div>{item.nombre.split(" ")[0]}</div>
              <div className="opacity-90 font-black">
                ${item.base.toLocaleString()}
              </div>
            </button>
          ))}
        </div>

        {/* Resumen Fijo de Tarifa del Trayecto (Sin Contador Manual) */}
        <div className="bg-orange-50/60 border border-orange-200/80 p-3 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">
              Tarifa Estimada del Trayecto
            </span>
            <span className="text-[11px] text-gray-600 font-medium">
              {zonasTarifas[zona]?.nombre}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xl font-black text-orange-600 block">
              ${oferta.toLocaleString()}{" "}
              <small className="text-[10px] font-semibold text-orange-800">
                COP
              </small>
            </span>
          </div>
        </div>

        {/* Opciones Adicionales (Desplegable Minimalista) */}
        <div className="border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => setShowExtraOptions(!showExtraOptions)}
            className="w-full flex items-center justify-between text-xs text-gray-500 font-semibold py-1 px-1 hover:text-gray-800 transition-colors"
          >
            <span>
              ⚙️ Opciones de viaje ({passengersCount} pas.{" "}
              {hasLuggage ? "• Carga" : ""} {hasPets ? "• Mascota" : ""})
            </span>
            <span>{showExtraOptions ? "▲" : "▼"}</span>
          </button>

          {showExtraOptions && (
            <div className="mt-2 p-3 bg-gray-50 rounded-xl space-y-3 border border-gray-200/60 text-xs">
              {/* Pasajeros */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Pasajeros:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPassengersCount(num)}
                      className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                        passengersCount === num
                          ? "bg-orange-500 text-white"
                          : "bg-white border border-gray-200 text-gray-600"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles Carga / Mascotas */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHasLuggage(!hasLuggage)}
                  className={`p-2 rounded-xl border text-center font-bold transition-all ${
                    hasLuggage
                      ? "bg-orange-100 border-orange-400 text-orange-900"
                      : "bg-white border-gray-200 text-gray-500"
                  }`}
                >
                  🧳 {hasLuggage ? "Con Carga" : "Sin Carga"}
                </button>

                <button
                  type="button"
                  onClick={() => setHasPets(!hasPets)}
                  className={`p-2 rounded-xl border text-center font-bold transition-all ${
                    hasPets
                      ? "bg-orange-100 border-orange-400 text-orange-900"
                      : "bg-white border-gray-200 text-gray-500"
                  }`}
                >
                  🐱 {hasPets ? "Con Mascota" : "Sin Mascota"}
                </button>
              </div>

              {/* Detalle Opcional */}
              <input
                type="text"
                placeholder="Notas extras (Ej: Frente al árbol grande)"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                className="w-full p-2 text-xs rounded-xl bg-white border border-gray-200 outline-none"
              />
            </div>
          )}
        </div>

        {/* Botón Principal de Acción */}
        <button
          type="submit"
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold rounded-xl text-sm shadow-md shadow-orange-200 transition-all cursor-pointer active:scale-98 flex items-center justify-center gap-2"
        >
          <span>Solicitar Motocarro</span>
          <span>🚀</span>
        </button>
      </form>
    </div>
  );
}

export default MotocarroForm;
