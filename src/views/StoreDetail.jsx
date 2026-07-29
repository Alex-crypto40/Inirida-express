import { useParams, useNavigate } from "react-router-dom";

function StoreDetail() {
  // Extraemos el "id" de la URL automáticamente gracias a react-router-dom
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="p-4 flex flex-col gap-5 max-w-md mx-auto bg-white min-h-screen">
      {/* Botón flotante para regresar al Home */}
      <button
        onClick={() => navigate("/")}
        className="self-start text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-250 transition-all"
      >
        ⬅️ Volver a comercios
      </button>

      <div className="bg-orange-50 p-6 rounded-2xl text-center border border-orange-100 mt-4">
        <span className="text-4xl">🏪</span>
        <h2 className="text-xl font-black text-gray-800 mt-2">
          Detalle del Comercio
        </h2>
        <p className="text-xs text-gray-400 mt-1 font-mono bg-white p-2 rounded-lg border border-gray-100 break-words">
          ID del comercio en MongoDB: {id}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          ¡Navegación exitosa! En este espacio pintaremos el menú si es
          restaurante/licorera, o la ficha de servicios si es un hotel.
        </p>
      </div>
    </div>
  );
}

export default StoreDetail;
