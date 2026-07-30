import { useState } from "react";

function MotocarroForm({ onOrderCreated }) {
  // 1. Datos básicos del cliente
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [zona, setZona] = useState("urbana");
  const [oferta, setOferta] = useState(4000);
  const [comentarios, setComentarios] = useState("");

  // 2. Nuevos estados para detalles de la carrera (pasajeros, equipaje, mascotas)
  const [passengersCount, setPassengersCount] = useState(1);
  const [hasLuggage, setHasLuggage] = useState(false);
  const [hasPets, setHasPets] = useState(false);

  // Matriz de zonas y tarifas sugeridas
  const zonasTarifas = {
    urbana: {
      nombre: "Centro / Zonas Urbanas",
      base: 4000,
      min: 4000,
      max: 6000,
    },
    coco: { nombre: "Centro ↔ Coco Viejo", base: 6000, min: 5000, max: 10000 },
    aeropuerto: {
      nombre: "Coco / Centro ↔ Aeropuerto",
      base: 15000,
      min: 12000,
      max: 20000,
    },
  };

  const handleZonaChange = (e) => {
    const nuevaZona = e.target.value;
    setZona(nuevaZona);
    setOferta(zonasTarifas[nuevaZona].base);
  };

  const solicitarCarrera = async (e) => {
    e.preventDefault();
    if (!origen.trim() || !destino.trim() || !telefono.trim()) {
      alert(
        "Por favor completa los campos obligatorios (Teléfono, Origen y Destino).",
      );
      return;
    }

    // Estructuramos el objeto adaptado al backend
    const pedidoMotocarro = {
      serviceType: "ride", // 👈 Identificador para carreras de motocarro
      isMandado: false,
      store: null,

      // Objeto de detalles del viaje para la tarjeta del conductor
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
          name: `Carrera Motocarro (${zonasTarifas[zona]?.nombre || "Zona General"})`,
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
      const API_BASE =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pedidoMotocarro),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Carrera guardada en BD:", data);

        alert(
          `🛺 ¡Carrera solicitada con éxito! Buscando motocarro por $${oferta.toLocaleString()} COP...`,
        );

        if (onOrderCreated) {
          onOrderCreated(data.order || data);
        }

        // Limpiar formulario
        setNombre("");
        setTelefono("");
        setOrigen("");
        setDestino("");
        setComentarios("");
        setPassengersCount(1);
        setHasLuggage(false);
        setHasPets(false);
      } else {
        alert("Hubo un error al crear la solicitud en el servidor.");
      }
    } catch (error) {
      console.error("Error al conectar con la API:", error);
      alert("No se pudo conectar con el servidor backend.");
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <span className="text-2xl p-2 bg-orange-100 rounded-xl">🛺</span>
        <div>
          <h3 className="font-extrabold text-sm text-gray-800">
            Pedir una Carrera
          </h3>
          <p className="text-[11px] text-gray-400">
            Pide tu motocarro rápido y seguro
          </p>
        </div>
      </div>

      <form onSubmit={solicitarCarrera} className="space-y-3">
        {/* Nombre y Teléfono */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              👤 Tu Nombre
            </label>
            <input
              type="text"
              placeholder="Opcional"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              📱 Celular
            </label>
            <input
              type="tel"
              placeholder="Ej: 310..."
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none"
              required
            />
          </div>
        </div>

        {/* Origen y Destino */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            📍 ¿Dónde te recogen?
          </label>
          <input
            type="text"
            placeholder="Ej: Barrio El Recreo, cerca a la cancha"
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            🏁 ¿A dónde vas?
          </label>
          <input
            type="text"
            placeholder="Ej: Aeropuerto / Comercio / Coco Viejo"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none"
            required
          />
        </div>

        {/* Seleccionables de Pasajeros, Maletas y Mascotas */}
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-3">
          <label className="block text-xs font-bold text-gray-700">
            👥 Opciones del Viaje
          </label>

          {/* Cantidad de Pasajeros */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600 font-medium">Pasajeros:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPassengersCount(num)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    passengersCount === num
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Checkbox de Maletas y Mascotas */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
            <label
              className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                hasLuggage
                  ? "bg-orange-100 border-orange-400 text-orange-900"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              <input
                type="checkbox"
                checked={hasLuggage}
                onChange={(e) => setHasLuggage(e.target.checked)}
                className="hidden"
              />
              🧳 {hasLuggage ? "Con Carga/Maleta" : "Sin Carga"}
            </label>

            <label
              className={`flex items-center justify-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                hasPets
                  ? "bg-orange-100 border-orange-400 text-orange-900"
                  : "bg-white border-gray-200 text-gray-500"
              }`}
            >
              <input
                type="checkbox"
                checked={hasPets}
                onChange={(e) => setHasPets(e.target.checked)}
                className="hidden"
              />
              🐱 {hasPets ? "Con Mascota" : "Sin Mascota"}
            </label>
          </div>
        </div>

        {/* Selección de Trayecto / Zona */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            🗺️ Tipo de Trayecto
          </label>
          <select
            value={zona}
            onChange={handleZonaChange}
            className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 font-semibold text-gray-700 outline-none cursor-pointer"
          >
            <option value="urbana">Urbana / Centro ($4.000 COP)</option>
            <option value="coco">Centro ↔ Coco Viejo ($6.000 COP)</option>
            <option value="aeropuerto">
              Trayecto Aeropuerto ($15.000 COP)
            </option>
          </select>
        </div>

        {/* Oferta de Tarifa */}
        <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-orange-900">
              Tu oferta para el motocarro:
            </span>
            <span className="font-black text-orange-600 text-sm">
              ${Number(oferta).toLocaleString()} COP
            </span>
          </div>

          <input
            type="range"
            min={zonasTarifas[zona].min}
            max={zonasTarifas[zona].max}
            step="1000"
            value={oferta}
            onChange={(e) => setOferta(Number(e.target.value))}
            className="w-full accent-orange-500 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-orange-700/70 font-medium">
            <span>Sugerido: ${zonasTarifas[zona].min.toLocaleString()}</span>
            <span>Máx: ${zonasTarifas[zona].max.toLocaleString()}</span>
          </div>
        </div>

        {/* Notas Adicionales */}
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">
            📝 Detalles extras (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: Frente al árbol grande / Llamar al llegar"
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-orange-500 outline-none"
          />
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-200 transition-all cursor-pointer active:scale-98"
        >
          🛺 Solicitar Motocarro Ahora
        </button>
      </form>
    </div>
  );
}

export default MotocarroForm;
