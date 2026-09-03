import { useState, useEffect } from "react";
import PhoneValidationModal from "./PhoneValidationModal";

function MotocarroForm({
  socket,
  selectedDriver,
  onClearSelectedDriver,
  onOrderCreated,
}) {
  const [isVerified, setIsVerified] = useState(false);
  const [telefono, setTelefono] = useState(
    () => localStorage.getItem("userPhone") || "",
  );
  const [nombre, setNombre] = useState(
    () => localStorage.getItem("userName") || "",
  );

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [gpsCoords, setGpsCoords] = useState(null);
  const [rawCoords, setRawCoords] = useState(null);

  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estado para desplegar la Guía Informativa de Tarifas
  const [showTarifasGuide, setShowTarifasGuide] = useState(false);

  // Tabla informativa de precios promedio en Inírida
  const TARIFAS_GUIA = [
    {
      zona: "Casco Urbano General",
      precio: "$4.000 COP",
      detalle: "Carrera corta / Barrio a barrio dentro de la zona urbana.",
      icon: "🏙️",
    },
    {
      zona: "Centro ↔ Coco Viejo / Nuevo",
      precio: "$6.000 - 8.000 COP",
      detalle: "Trayectos hacia o desde la comunidad de El Coco.",
      icon: "🌴",
    },
    {
      zona: "Centro / Urbana ↔ Aeropuerto",
      precio: "$8.000 COP",
      detalle: "Salidas o recogidas en el Aeropuerto César Gaviria Trujillo.",
      icon: "✈️",
    },
    {
      zona: "Coco ↔ Aeropuerto (Extremo a Extremo)",
      precio: "$12.000 COP",
      detalle: "Cruzando la cabecera municipal de lado a lado.",
      icon: "🛺",
    },
    {
      zona: "Comunidades / Sitios Lejanos",
      precio: "Acuerdo Directo",
      detalle: "Sabanitas, Caño Vitina, etc. (Preguntar al conductor).",
      icon: "🌿",
    },
  ];

  useEffect(() => {
    const savedPhone = localStorage.getItem("userPhone");
    if (savedPhone) {
      setIsVerified(true);
      setTelefono(savedPhone);
    }
  }, []);

  const handlePhoneValidated = (data) => {
    setTelefono(data.phone);
    if (data.name) setNombre(data.name);
    setIsVerified(true);
  };

  const obtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta geolocalización.");
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setRawCoords({ lat: latitude, lng: longitude });
        setGpsCoords(`https://maps.google.com/?q=${latitude},${longitude}`);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          );
          const data = await res.json();
          const puntoConocido =
            data.address?.neighbourhood ||
            data.address?.suburb ||
            data.address?.road ||
            data.address?.village;

          if (puntoConocido) {
            setOrigen(`📍 GPS: ${puntoConocido}`);
          } else {
            setOrigen(`📍 Ubicación GPS detectada`);
          }
        } catch {
          setOrigen(`📍 Ubicación GPS detectada`);
        } finally {
          setLoadingGps(false);
        }
      },
      () => {
        setLoadingGps(false);
        alert(
          "Asegúrate de activar los permisos de ubicación en tu navegador.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const solicitarCarrera = async (e) => {
    e.preventDefault();
    if (!origen.trim() || !destino.trim()) {
      alert("Por favor completa el origen y el destino de tu carrera.");
      return;
    }

    setSubmitting(true);
    const phoneClean = telefono.trim();
    localStorage.setItem("userPhone", phoneClean);
    if (nombre.trim()) localStorage.setItem("userName", nombre.trim());

    const notaFinal = gpsCoords
      ? `${comentarios ? comentarios + " | " : ""}Link GPS: ${gpsCoords}`
      : comentarios || "";

    const pedidoMotocarro = {
      serviceType: "ride",
      isMandado: false,
      targetDriverId: selectedDriver ? selectedDriver.driverId : null,

      originAddress: origen.trim(),
      destinationAddress: destino.trim(),
      originCoords: rawCoords || null,

      origen: origen.trim(),
      destino: destino.trim(),

      // 🟢 MANTENEMOS CAMPOS ANTERIORES PARA COMPATIBILIDAD
      customerName: nombre.trim() || "Cliente Motocarro",
      customerPhone: phoneClean,

      // 🟢 ESTRUCTURA OBJETO CUSTOMER PARA INGRESO EN BASE DE DATOS
      customer: {
        name: "Cliente General", // Mantiene anonimato público
        phone: phoneClean, // Permite vinculación interna en MongoDB
      },

      items: [
        {
          name: "Carrera Motocarro (Tarifa Oficial / Estándar)",
          price: 0,
          quantity: 1,
        },
      ],
      total: 0,
      status: "pending_driver",
      notes: notaFinal,
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
        if (createdOrder?._id) {
          localStorage.setItem("activeOrderId", createdOrder._id);
        }

        if (selectedDriver && socket) {
          socket.emit("send_direct_order_request", {
            targetDriverId: selectedDriver.driverId,
            order: createdOrder,
          });
        }

        alert(
          "🛺 ¡Carrera solicitada! Un motocarro estará en camino en breve.",
        );

        if (onOrderCreated) onOrderCreated(createdOrder);

        setOrigen("");
        setDestino("");
        setComentarios("");
        setGpsCoords(null);
        setRawCoords(null);
        setShowTarifasGuide(false);
        if (onClearSelectedDriver) onClearSelectedDriver();
      } else {
        alert(data.message || "Error al procesar la solicitud.");
      }
    } catch (error) {
      console.error("Error al conectar con la API:", error);
      alert("Error de conexión con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {!isVerified && (
        <PhoneValidationModal onValidated={handlePhoneValidated} />
      )}

      <div
        className={`bg-white rounded-3xl p-4 shadow-lg shadow-orange-500/10 border border-orange-200/80 space-y-3.5 max-w-md mx-auto transition-all ${
          !isVerified ? "pointer-events-none select-none filter blur-sm" : ""
        }`}
      >
        {/* Motocarro Directo Seleccionado */}
        {selectedDriver && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🎯</span>
              <div>
                <p className="text-xs font-bold text-orange-900">
                  Asignado a: {selectedDriver.driverName || "Motocarro"}
                </p>
                <p className="text-[10px] text-orange-700">
                  Solicitud directa prioritaria
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClearSelectedDriver}
              className="text-xs text-orange-600 font-bold px-2.5 py-1 bg-white rounded-xl border border-orange-200 cursor-pointer hover:bg-orange-100/50 transition-colors"
            >
              Quitar
            </button>
          </div>
        )}

        <form onSubmit={solicitarCarrera} className="space-y-3">
          {/* Inputs Origen y Destino con línea conectora visual */}
          <div className="bg-gray-50/90 p-3.5 rounded-2xl border border-gray-200/80 space-y-3 relative">
            {/* Línea conectora visual estilo app de transporte */}
            <div className="absolute left-[25px] top-[28px] bottom-[30px] w-0.5 border-l-2 border-dashed border-gray-300 pointer-events-none z-0" />

            {/* Origen */}
            <div className="relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs">
                  A
                </span>
                <input
                  type="text"
                  placeholder="¿Dónde te recogen? (Barrio / Referencia) *"
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl bg-white border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none font-medium text-gray-800 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={obtenerUbicacionGPS}
                  disabled={loadingGps}
                  className="px-2.5 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1 transition-colors"
                  title="Usar mi ubicación GPS"
                >
                  <span>{loadingGps ? "⌛" : "📍 GPS"}</span>
                </button>
              </div>

              {origen.includes("GPS") && (
                <p className="text-[9px] text-orange-600 font-bold mt-1 ml-8 animate-fadeIn">
                  💡 Agrega una referencia si deseas (Ej: {origen} - Frente al
                  parque)
                </p>
              )}
            </div>

            {/* Destino */}
            <div className="relative z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs">
                  B
                </span>
                <input
                  type="text"
                  placeholder="¿A dónde vas? *"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-xl bg-white border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none font-medium text-gray-800 transition-all"
                  required
                />
              </div>
            </div>

            {/* Chips Rápidos */}
            <div className="flex gap-1.5 pt-1 overflow-x-auto no-scrollbar ml-8">
              {[
                "Centro",
                "Aeropuerto",
                "Coco Viejo",
                "Batallón",
                "Sabanitas",
                "Hospital",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDestino(chip)}
                  className="text-[10px] bg-white border border-gray-200/90 hover:border-orange-400 hover:text-orange-600 text-gray-600 px-2.5 py-1 rounded-lg font-bold shrink-0 cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjeta Informativa de Pago */}
          <div className="bg-gradient-to-br from-slate-50 to-orange-50/40 border border-orange-100 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💵</span>
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    Pago Directo al Conductor
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Tarifas estandarizadas del municipio
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTarifasGuide(!showTarifasGuide)}
                className="text-[10px] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold px-2.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>{showTarifasGuide ? "✕ Cerrar" : "💡 Ver Guía"}</span>
              </button>
            </div>

            {showTarifasGuide && (
              <div className="pt-2 border-t border-orange-200/60 space-y-2 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-2 flex items-start gap-2">
                  <span className="text-xs shrink-0">👥</span>
                  <p className="text-[10px] text-amber-900 leading-tight">
                    <strong className="font-extrabold">
                      Cobro por Pasajero:
                    </strong>{" "}
                    En Inírida la tarifa base aplica por persona. Si viajan en
                    grupo, pueden acordar un total con el motocarro.
                  </p>
                </div>

                <p className="text-[10px] font-black uppercase text-orange-800 tracking-wider pt-0.5">
                  📌 Tabla Referencial (Por Persona)
                </p>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {TARIFAS_GUIA.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2 rounded-xl border border-gray-100 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-gray-50 p-1 rounded-lg">
                          {item.icon}
                        </span>
                        <div>
                          <p className="text-[11px] font-bold text-gray-800 leading-tight">
                            {item.zona}
                          </p>
                          <p className="text-[9px] text-gray-400">
                            {item.detalle}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg shrink-0">
                        {item.precio}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notas Opcionales */}
          <input
            type="text"
            placeholder="Comentario opcional (Ej: 2 personas / Llevo maletas)"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:border-orange-500 focus:bg-white outline-none font-medium text-gray-800 transition-all"
          />

          {/* Botón Principal */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold rounded-2xl text-sm shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? "Enviando Solicitud... ⏳" : "Solicitar Motocarro 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default MotocarroForm;
