import { useState, useEffect } from "react";
import PhoneValidationModal from "./PhoneValidationModal";

function MotocarroForm({
  socket,
  selectedDriver,
  onClearSelectedDriver,
  onOrderCreated,
}) {
  // 1. Estado de verificación de teléfono (Gatekeeper)
  const [isVerified, setIsVerified] = useState(false);

  // Cargar datos del cliente previamente guardados si existen
  const [telefono, setTelefono] = useState(
    () => localStorage.getItem("userPhone") || "",
  );
  const [nombre, setNombre] = useState(
    () => localStorage.getItem("userName") || "",
  );

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [comentarios, setComentarios] = useState("");

  // Estados de carga y envío
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 2. Opciones de viaje
  const [zona, setZona] = useState("urbana");
  const [oferta, setOferta] = useState(4000);
  const [passengersCount, setPassengersCount] = useState(1);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [hasPets, setHasPets] = useState(false);

  // Toggle para mostrar/ocultar opciones avanzadas
  const [showExtraOptions, setShowExtraOptions] = useState(false);

  // Verificar en localStorage si ya validó el número previamente
  useEffect(() => {
    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) {
      setIsVerified(true);
      setTelefono(savedPhone);
    }
  }, []);

  // Callback ejecutado al completar con éxito el PhoneValidationModal
  const handlePhoneValidated = (data) => {
    setTelefono(data.phone);
    if (data.name) setNombre(data.name);
    setIsVerified(true);
  };

  // Configuración de Zonas de Inírida
  const zonasTarifas = {
    urbana: { nombre: "Urbana", base: 4000, label: "Urbana ($4k)" },
    coco: {
      nombre: "Centro ↔ Coco Viejo",
      base: 6000,
      label: "Especial ($6k)",
    },
    aeropuerto: {
      nombre: "Trayecto Aeropuerto",
      base: 12000,
      label: "Aeropuerto ($12k)",
    },
    acuerdo: { nombre: "Acuerdo / Negociar", base: 0, label: "🤝 Al Chat" },
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
    } else if (chipName === "Sabanitas" || chipName === "Caño Vitina") {
      handleSelectZona("acuerdo");
    } else {
      handleSelectZona("urbana");
    }
  };

  // Capturar ubicación con GPS (Nominatim / Google Maps fallback)
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
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          );
          const data = await res.json();

          const barrioOCalle =
            data.address?.road ||
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.village;

          if (barrioOCalle) {
            setOrigen(`📍 GPS: ${barrioOCalle}, Inírida`);
          } else {
            setOrigen(`https://maps.google.com/?q=${latitude},${longitude}`);
          }
        } catch {
          setOrigen(`https://maps.google.com/?q=${latitude},${longitude}`);
        } finally {
          setLoadingGps(false);
        }
      },
      () => {
        setLoadingGps(false);
        alert(
          "No se pudo obtener la ubicación. Asegúrate de activar los permisos de GPS en tu navegador.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const solicitarCarrera = async (e) => {
    e.preventDefault();
    if (!origen.trim() || !destino.trim() || !telefono.trim()) {
      alert(
        "Por favor completa los campos obligatorios (Celular, Origen y Destino).",
      );
      return;
    }

    setSubmitting(true);

    // Guardar datos de contacto localmente para autenticación persistente
    const phoneClean = telefono.trim();
    localStorage.setItem("userPhone", phoneClean);
    if (nombre.trim()) localStorage.setItem("userName", nombre.trim());

    const esAcuerdo = zona === "acuerdo";
    const nombreTarifa = zonasTarifas[zona]?.nombre || "Zona General";

    const pedidoMotocarro = {
      serviceType: "ride",
      isMandado: false,
      store: null,
      targetDriverId: selectedDriver ? selectedDriver.driverId : null,
      rideDetails: {
        passengersCount: Number(passengersCount),
        hasLuggage: Boolean(hasLuggage),
        hasPets: Boolean(hasPets),
        isNegotiable: esAcuerdo,
      },
      customer: {
        name: nombre.trim() || "Cliente Motocarro",
        phone: phoneClean,
        address: origen,
        notes: `Destino: ${destino}.${
          esAcuerdo ? " [Tarifa a convenir en Chat]" : ""
        }`,
      },
      items: [
        {
          name: `Carrera Motocarro (${nombreTarifa})`,
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
      const baseUrl =
        import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com";
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      const targetEndpoint = cleanBaseUrl.endsWith("/api")
        ? `${cleanBaseUrl}/orders`
        : `${cleanBaseUrl}/api/orders`;

      const res = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoMotocarro),
      });

      const data = await res.json();

      if (res.ok) {
        const createdOrder = data.order || data;

        if (createdOrder && createdOrder._id) {
          localStorage.setItem("activeOrderId", createdOrder._id);
        }

        // Si se seleccionó un motocarro directo en el mapa, transmitirle vía WebSocket
        if (selectedDriver && socket) {
          socket.emit("send_direct_order_request", {
            targetDriverId: selectedDriver.driverId,
            order: createdOrder,
          });
        }

        const msgExito = selectedDriver
          ? `🛺 Solicitud enviada directamente a ${
              selectedDriver.driverName || "Motocarro"
            }...`
          : esAcuerdo
            ? "🛺 ¡Carrera solicitada! Acuerda la tarifa directamente en el chat..."
            : `🛺 ¡Carrera solicitada! Buscando motocarro por $${oferta.toLocaleString()} COP...`;

        alert(msgExito);

        if (onOrderCreated) {
          onOrderCreated(createdOrder);
        }

        // Limpieza tras envío exitoso
        setOrigen("");
        setDestino("");
        setComentarios("");
        setShowExtraOptions(false);
        if (onClearSelectedDriver) onClearSelectedDriver();
      } else {
        alert(
          data.message || "Hubo un error al crear la solicitud en el servidor.",
        );
      }
    } catch (error) {
      console.error("Error al conectar con la API:", error);
      alert(
        "No se pudo conectar con el servidor backend. Verifica tu conexión.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* 🛑 TARJETA BLOQUEADORA: Se superpone si no se ha verificado el número */}
      {!isVerified && (
        <PhoneValidationModal onValidated={handlePhoneValidated} />
      )}

      {/* COMPONENTE FORMULARIO (Se desenfoca si el usuario no se ha verificado) */}
      <div
        className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4 max-w-md mx-auto transition-all ${
          !isVerified ? "pointer-events-none select-none filter blur-sm" : ""
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl p-2 bg-orange-100 rounded-xl">🛺</span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-800">
                Pedir Carrera
              </h3>
              <p className="text-[11px] text-gray-400">
                Solicitud rápida por Celular
              </p>
            </div>
          </div>
        </div>

        {/* Indicador de Motocarro Seleccionado en Mapa Radar */}
        {selectedDriver && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎯</span>
              <div>
                <p className="text-xs font-bold text-orange-900">
                  Seleccionado:{" "}
                  {selectedDriver.driverName || "Motocarro Express"}
                </p>
                <p className="text-[10px] text-orange-700">
                  Solicitud directa prioritaria
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearSelectedDriver}
              className="text-xs text-orange-600 hover:text-orange-800 font-bold px-2 py-1 bg-white rounded-lg border border-orange-200 cursor-pointer"
            >
              Quitar
            </button>
          </div>
        )}

        <form onSubmit={solicitarCarrera} className="space-y-3">
          {/* Teléfono y Nombre */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="tel"
              placeholder="📱 Celular *"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none font-medium text-gray-800"
              required
              readOnly={isVerified}
            />
            <input
              type="text"
              placeholder="👤 Nombre (opcional)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none font-medium text-gray-800"
            />
          </div>

          {/* Tarjeta de Ruta Unificada con GPS */}
          <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80 space-y-2 relative">
            <div className="absolute left-[22px] top-[28px] bottom-[28px] w-0.5 bg-gray-300 pointer-events-none" />

            {/* Origen + GPS */}
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
              <button
                type="button"
                onClick={obtenerUbicacionGPS}
                disabled={loadingGps}
                className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Obtener mi ubicación actual por GPS"
              >
                {loadingGps ? "⌛" : "📍 GPS"}
              </button>
            </div>

            {/* Destino */}
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

            {/* Chips Rápidos */}
            <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              {[
                "Centro",
                "Aeropuerto",
                "Coco Viejo",
                "Sabanitas",
                "Caño Vitina",
                "Hospital",
              ].map((chip) => (
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

          {/* Tarifas y Zonas */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Selecciona la tarifa o trayecto
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectZona("urbana")}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  zona === "urbana"
                    ? "bg-orange-500 border-orange-500 text-white font-bold"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="block text-[10px]">Urbana</span>
                <span className="block text-xs font-black">$4.000</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectZona("coco")}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  zona === "coco"
                    ? "bg-orange-500 border-orange-500 text-white font-bold"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="block text-[10px]">Centro</span>
                <span className="block text-xs font-black">$6.000</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectZona("aeropuerto")}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  zona === "aeropuerto"
                    ? "bg-orange-500 border-orange-500 text-white font-bold"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="block text-[10px]">Aeropuerto</span>
                <span className="block text-xs font-black">$12.000</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectZona("acuerdo")}
                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  zona === "acuerdo"
                    ? "bg-amber-500 border-amber-500 text-white font-bold"
                    : "bg-amber-50/60 border-amber-200 text-amber-800 hover:bg-amber-100/80"
                }`}
              >
                <span className="block text-[10px]">Sabanitas/Otros</span>
                <span className="block text-xs font-black">🤝 Al Chat</span>
              </button>
            </div>

            {zona === "acuerdo" && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium leading-tight">
                💬 <strong>Zona alejada:</strong> Acuerda el valor final con el
                mototaxista por el chat de la app.
              </div>
            )}
          </div>

          {/* Opciones Adicionales */}
          <div className="border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={() => setShowExtraOptions(!showExtraOptions)}
              className="w-full flex items-center justify-between text-xs text-gray-500 font-semibold py-1 px-1 hover:text-gray-800 transition-colors cursor-pointer"
            >
              <span>
                ⚙️ Opciones de viaje ({passengersCount} pas.{" "}
                {hasLuggage ? "• Carga" : ""} {hasPets ? "• Mascota" : ""})
              </span>
              <span>{showExtraOptions ? "▲" : "▼"}</span>
            </button>

            {showExtraOptions && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl space-y-3 border border-gray-200/60 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Pasajeros:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPassengersCount(num)}
                        className={`px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
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

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHasLuggage(!hasLuggage)}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
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
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      hasPets
                        ? "bg-orange-100 border-orange-400 text-orange-900"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}
                  >
                    🐱 {hasPets ? "Con Mascota" : "Sin Mascota"}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Notas extras (Ej: Frente al árbol grande)"
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl bg-white border border-gray-200 outline-none text-gray-800"
                />
              </div>
            )}
          </div>

          {/* Botón Principal */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-sm shadow-md shadow-orange-200 transition-all cursor-pointer active:scale-98 flex items-center justify-between px-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>
              {submitting ? "Procesando... ⏳" : "Solicitar Motocarro 🚀"}
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-xl text-xs backdrop-blur-xs font-black">
              {zona === "acuerdo"
                ? "A convenir 💬"
                : `$${oferta.toLocaleString()} COP`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default MotocarroForm;
