import { useState } from "react";

function MotocarroForm({ onOrderCreated }) {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [zona, setZona] = useState("urbana");
  const [oferta, setOferta] = useState(4000);
  const [comentarios, setComentarios] = useState("");

  // Matriz de zonas y tarifas sugeridas
  const zonasTarifas = {
    urbana: {
      nombre: "Centro / Zonas Urbanas",
      base: 4000,
      min: 4000,
      max: 5000,
    },
    coco: { nombre: "Centro ↔ Coco Viejo", base: 7000, min: 5000, max: 10000 },
    aeropuerto: {
      nombre: "Coco / Centro ↔ Aeropuerto",
      base: 13000,
      min: 10000,
      max: 16000,
    },
  };

  const handleZonaChange = (e) => {
    const nuevaZona = e.target.value;
    setZona(nuevaZona);
    setOferta(zonasTarifas[nuevaZona].base); // Asigna el valor base automáticamente
  };

  const solicitarCarrera = async (e) => {
    e.preventDefault();
    if (!origen.trim() || !destino.trim()) {
      alert("Por favor ingresa el punto de recogida y el destino.");
      return;
    }

    // Adaptador por si clienteNombre/clienteTelefono no existen en el scope local
    const clienteNombre = "Cliente Motocarro";
    const clienteTelefono = "0000000000";

    // Estructuramos el objeto adaptado al esquema de la colección `orders`
    const pedidoMotocarro = {
      isMandado: true,

      // Usa el ID real de la tienda virtual para mandados o el del req.body
      store: null,

      customer: {
        name: clienteNombre,
        phone: clienteTelefono,
        address: origen,
        notes: `Destino: ${destino}. Notas: ${comentarios || "Sin notas"}`,
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
      status: "pending",
      notes: comentarios || "",
    };

    try {
      // 1. Enviamos la petición POST al backend
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

        // Notificamos al componente Padre (Home) para mostrar la tarjeta flotante
        if (onOrderCreated) {
          onOrderCreated(data);
        }

        // Limpiar campos
        setOrigen("");
        setDestino("");
        setComentarios("");
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
            placeholder="Ej: Llevo dos maletas / Somos 3 personas"
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
