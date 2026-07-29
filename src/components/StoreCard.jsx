import React from "react";
import { useNavigate } from "react-router-dom"; // <-- Importamos el hook de navegación

function StoreCard({ store, category }) {
  const navigate = useNavigate(); // <-- Inicializamos el navegador

  const {
    _id, // <-- Extraemos el ID único de MongoDB
    name,
    image,
    isOpen,
    deliveryTime,
    priceRange,
    services,
    whatsappNumber,
  } = store;

  // LÓGICA DE WHATSAPP PARA HOTELES
  const abrirWhatsApp = (e) => {
    e.stopPropagation(); // Evita que se dispare el click de la tarjeta si tocan el botón
    const mensaje = encodeURIComponent(
      `Hola ${name}, vi su hospedaje en Inírida Express y me gustaría consultar disponibilidad para hoy.`,
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${mensaje}`, "_blank");
  };

  // Función manejadora del clic en la tarjeta
  const manejarClickTarjeta = () => {
    navigate(`/store/${_id}`); // Redirige dinámicamente usando el ID del comercio
  };

  // --- DISEÑO PARA HOTELES (Una sola columna) ---
  if (category === "hotel") {
    return (
      <div
        onClick={manejarClickTarjeta} // <-- Al hacer clic, abre el detalle
        className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row gap-3 p-3 transition-all hover:shadow-md cursor-pointer active:scale-99"
      >
        {/* Imagen del Hotel */}
        <div className="w-full sm:w-32 h-32 bg-gray-100 rounded-xl overflow-hidden relative flex-shrink-0">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl bg-orange-50 text-orange-400">
              🏨
            </div>
          )}
          <span
            className={`absolute top-2 left-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white ${isOpen ? "bg-green-500" : "bg-red-500"}`}
          >
            {isOpen ? "Abierto" : "Cerrado"}
          </span>
        </div>

        {/* Información del Hotel */}
        <div className="flex-1 flex flex-col justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{name}</h3>
            {priceRange && (
              <p className="text-xs text-orange-500 font-semibold mt-0.5">
                {priceRange}
              </p>
            )}

            {/* Servicios */}
            {services && services.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {services.map((service, index) => (
                  <span
                    key={index}
                    className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                  >
                    {service}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Botón de WhatsApp Directo */}
          <button
            onClick={abrirWhatsApp}
            className="w-full bg-green-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 hover:bg-green-600 active:scale-95 transition-all shadow-sm shadow-green-100"
          >
            💬 Consultar por WhatsApp
          </button>
        </div>
      </div>
    );
  }

  // --- DISEÑO PARA RESTAURANTES Y LICORERAS (Dos columnas) ---
  return (
    <div
      onClick={manejarClickTarjeta} // <-- Al hacer clic, abre el detalle
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md cursor-pointer active:scale-98"
    >
      {/* Imagen o Logo del Local */}
      <div className="w-full h-28 bg-gray-100 relative">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl bg-orange-50">
            {category === "licorera" ? "🍻" : "🍔"}
          </div>
        )}
        {/* Estado Abierto/Cerrado */}
        <span
          className={`absolute top-2 left-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-white ${isOpen ? "bg-green-500" : "bg-red-500"}`}
        >
          {isOpen ? "Abierto" : "Cerrado"}
        </span>
      </div>

      {/* Info del Local */}
      <div className="p-2.5 flex flex-col gap-0.5 flex-1 justify-between">
        <h3 className="text-xs font-bold text-gray-800 line-clamp-1">{name}</h3>
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium mt-1">
          <span>🛵 {deliveryTime}</span>
          <span className="text-amber-500">⭐ 4.5</span>
        </div>
      </div>
    </div>
  );
}

export default StoreCard;
