import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStores } from "../services/api.js";
import StoreCard from "../components/StoreCard";
import MotocarroForm from "../components/MotocarroForm";
import OrderStatusWidget from "../components/OrderStatusWidget";
import MapView from "../components/MapView";
import { OrderHistory } from "../components/OrderHistory";
import { UserProfileModal } from "../components/UserProfileModal";
import { NavMenu } from "../components/NavMenu";

function Home({ socket }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] =
    useState("motocarro");

  // Estado para el conductor seleccionado desde MapView
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Estado para controlar la solicitud de motocarro / pedido activa
  const [activeOrder, setActiveOrder] = useState(null);

  // Estado para desplegar/ocultar el mapa radar
  const [showMap, setShowMap] = useState(true);

  // Estado para controlar la visibilidad de la ventana modal del historial
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // Mostrar perfil del usuario
  const [mostrarPerfil, setMostrarPerfil] = useState(false);

  const navigate = useNavigate();
  const RAW_URL =
    import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com";
  const API_URL = `${RAW_URL.replace(/\/api\/?$/, "")}/api`;

  const categoriasGlobales = [
    { id: "motocarro", label: "Motocarro", icon: "🛺" },
    { id: "turismo", label: "Turismo", icon: "🌴" },
    { id: "restaurante", label: "Restaurantes", icon: "🍔" },
    { id: "licorera", label: "Licoreras", icon: "🍺" },
    { id: "hotel", label: "Hoteles", icon: "🏨" },
    { id: "mandados", label: "Mandados", icon: "🛵" },
  ];

  // 1. RECUPERAR CARRERA ACTIVA AL CARGAR / RECARGAR LA PÁGINA
  useEffect(() => {
    const fetchActiveCustomerOrder = async () => {
      const savedOrderId = localStorage.getItem("activeOrderId");
      if (!savedOrderId) return;

      try {
        const res = await fetch(`${API_URL}/orders/${savedOrderId}`);
        if (res.ok) {
          const order = await res.json();
          if (order.status === "completed" || order.status === "cancelled") {
            localStorage.removeItem("activeOrderId");
            setActiveOrder(null);
          } else {
            setActiveOrder(order);
            setShowMap(false);
          }
        } else {
          localStorage.removeItem("activeOrderId");
        }
      } catch (error) {
        console.error("Error al recuperar orden guardada:", error);
      }
    };

    fetchActiveCustomerOrder();
  }, [API_URL]);

  // 2. RECIBIR NUEVA ORDEN DESDE MOTOCARROFORM Y GUARDARLA EN LOCALSTORAGE
  const handleOrderCreated = (newOrder) => {
    if (newOrder?._id) {
      localStorage.setItem("activeOrderId", newOrder._id);
      setActiveOrder(newOrder);
      setSelectedDriver(null);
      setShowMap(false);
    }
  };

  // 3. LISTENERS WEBSOCKET & POLLING DE RESPALDO PARA ORDEN ACTIVA
  useEffect(() => {
    if (!activeOrder?._id) return;

    if (socket) {
      socket.emit("join_order", activeOrder._id);

      const handleOrderUpdate = (updatedOrder) => {
        if (
          updatedOrder._id === activeOrder._id ||
          updatedOrder.orderId === activeOrder._id
        ) {
          setActiveOrder(updatedOrder);

          if (
            updatedOrder.status === "completed" ||
            updatedOrder.status === "cancelled"
          ) {
            localStorage.removeItem("activeOrderId");
            setTimeout(() => setActiveOrder(null), 5000);
          }
        }
      };

      socket.on("order_updated", handleOrderUpdate);
      socket.on("orderUpdated", handleOrderUpdate);

      return () => {
        socket.off("order_updated", handleOrderUpdate);
        socket.off("orderUpdated", handleOrderUpdate);
      };
    }

    const checkOrderStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/orders/${activeOrder._id}`);
        if (res.ok) {
          const updatedOrder = await res.json();
          setActiveOrder(updatedOrder);

          if (
            updatedOrder.status === "completed" ||
            updatedOrder.status === "cancelled"
          ) {
            localStorage.removeItem("activeOrderId");
            setTimeout(() => setActiveOrder(null), 5000);
          }
        }
      } catch (error) {
        console.error("Error al actualizar estado de la orden:", error);
      }
    };

    const interval = setInterval(checkOrderStatus, 4000);
    return () => clearInterval(interval);
  }, [activeOrder?._id, API_URL, socket]);

  // Cancelar carrera desde la tarjeta flotante o formulario
  const handleCancelOrder = async (orderId) => {
    const idToCancel = orderId || activeOrder?._id;
    if (!idToCancel) {
      localStorage.removeItem("activeOrderId");
      setActiveOrder(null);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/orders/${idToCancel}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        alert("Carrera cancelada correctamente.");
        localStorage.removeItem("activeOrderId");
        setActiveOrder(null);
      }
    } catch (error) {
      console.error("Error al cancelar la orden:", error);
    }
  };

  // Manejador para seleccionar conductor directamente en el mapa
  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
    setShowMap(false);
  };

  // 4. CARGA DE COMERCIOS SEGÚN CATEGORÍA
  useEffect(() => {
    if (categoriaSeleccionada === "motocarro") return;

    setLoading(true);
    getStores(categoriaSeleccionada)
      .then((data) => {
        setStores(Array.isArray(data) ? data : []);
      })
      .catch((error) => console.error("Error al traer comercios:", error))
      .finally(() => setLoading(false));
  }, [categoriaSeleccionada]);

  const comerciosFiltrados = stores.filter((store) => {
    return store.name?.toLowerCase().includes(busqueda.toLowerCase());
  });

  const irAFormularioComercio = () => {
    setMenuAbierto(false);
    navigate("/register-store");
  };

  const irAFormularioRepartidor = () => {
    setMenuAbierto(false);
    navigate("/driver-login");
  };

  const cerrarSesion = () => {
    setMenuAbierto(false);
    localStorage.removeItem("token");
    localStorage.removeItem("activeOrderId");
    window.location.reload();
  };

  return (
    /* SE APLICA relative AL CONTENEDOR PRINCIPAL DE LA APP */
    <div className="relative max-w-md mx-auto bg-white min-h-screen flex flex-col shadow-2xl overflow-x-clip">
      {/* 1. HEADER MODERNO */}
      <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛵</span>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none">
              Inírida Express
            </h1>
            <p className="text-[10px] text-orange-100 font-medium mt-0.5">
              Tu ciudad a un clic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-xl text-sm transition-all active:scale-95 cursor-pointer">
            🛒
          </button>

          <button
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-xl text-white font-bold text-base transition-all active:scale-95 cursor-pointer"
            aria-label="Abrir menú"
          >
            ☰
          </button>
        </div>
      </header>

      {/* 2. MENÚ DESPLEGABLE */}
      <NavMenu
        menuAbierto={menuAbierto}
        setMenuAbierto={setMenuAbierto}
        setMostrarHistorial={setMostrarHistorial}
        setMostrarPerfil={setMostrarPerfil}
        irAFormularioComercio={irAFormularioComercio}
        irAFormularioRepartidor={irAFormularioRepartidor}
        cerrarSesion={cerrarSesion}
      />

      {/* 3. CUERPO PRINCIPAL */}
      <div className="p-4 flex flex-col gap-4 flex-1 pb-24">
        {categoriaSeleccionada !== "motocarro" && (
          <div className="relative">
            <input
              type="text"
              placeholder={`🔍 Buscar en ${categoriaSeleccionada}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full p-3 pl-4 rounded-xl bg-gray-100 border border-transparent text-sm focus:border-orange-500 focus:bg-white transition-all outline-none"
            />
          </div>
        )}

        {/* BARRA DE CATEGORÍAS */}
        <div className="w-full overflow-x-auto no-scrollbar py-1">
          <div className="flex gap-2 min-w-max px-1">
            {categoriasGlobales.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoriaSeleccionada(cat.id);
                  setBusqueda("");
                }}
                className={`py-2 px-4 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-all ${
                  categoriaSeleccionada === cat.id
                    ? "bg-orange-500 text-white shadow-md shadow-orange-200 scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 mt-1">
          <h2 className="text-sm font-extrabold text-gray-800 mb-3 flex justify-between items-center">
            <span className="capitalize">
              {categoriaSeleccionada === "restaurante"
                ? "Restaurantes Aliados"
                : categoriaSeleccionada === "licorera"
                  ? "Licoreras Disponibles"
                  : categoriaSeleccionada === "hotel"
                    ? "Hoteles y Hospedajes"
                    : categoriaSeleccionada === "motocarro"
                      ? "Servicio de Motocarro"
                      : categoriaSeleccionada === "turismo"
                        ? "Sitios de Turismo"
                        : "Servicios de Mandados"}
            </span>

            {categoriaSeleccionada === "motocarro" ? (
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold px-2.5 py-1 rounded-lg border border-orange-200 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>{showMap ? "🗺️ Ocultar Mapa" : "📡 Ver Mapa Radar"}</span>
              </button>
            ) : (
              <span className="text-[11px] bg-orange-50 text-orange-600 font-bold px-2 py-0.5 rounded-md">
                {`${comerciosFiltrados.length} opciones`}
              </span>
            )}
          </h2>

          {categoriaSeleccionada === "motocarro" ? (
            <div className="space-y-4">
              {showMap && (
                <div className="h-60 rounded-2xl overflow-hidden shadow-sm border border-gray-200 relative transition-all duration-300 animate-fadeIn">
                  <MapView
                    socket={socket}
                    onSelectDriver={handleDriverSelect}
                  />
                </div>
              )}

              <MotocarroForm
                socket={socket}
                selectedDriver={selectedDriver}
                onClearSelectedDriver={() => setSelectedDriver(null)}
                onOrderCreated={handleOrderCreated}
              />
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400 font-medium">
                Cargando opciones...
              </p>
            </div>
          ) : comerciosFiltrados.length === 0 ? (
            <div className="text-center py-14 text-gray-400 bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-200">
              <p className="text-2xl">📍</p>
              <p className="text-sm font-bold text-gray-600 mt-2">
                No hay comercios o servicios en esta categoría
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Pronto verás más opciones disponibles.
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                categoriaSeleccionada === "hotel" ||
                categoriaSeleccionada === "mandados"
                  ? "grid-cols-1"
                  : "grid-cols-2"
              }`}
            >
              {comerciosFiltrados.map((store) => (
                <StoreCard
                  key={store._id}
                  store={store}
                  category={categoriaSeleccionada}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TARJETA FLOTANTE DE SEGUIMIENTO CON SOCKETS Y MAPA */}
      <OrderStatusWidget
        activeOrder={activeOrder}
        onCancelOrder={handleCancelOrder}
        socket={socket}
      />

      {/* MODAL DE HISTORIAL DE PEDIDOS */}
      {mostrarHistorial && (
        <OrderHistory
          customerId={
            localStorage.getItem("customerPhone") ||
            activeOrder?.customerPhone ||
            "573143077813"
          }
          onClose={() => setMostrarHistorial(false)}
          API_BASE_URL={API_URL}
        />
      )}

      {/* MODAL DE PERFIL DE USUARIO */}
      {mostrarPerfil && (
        <UserProfileModal onClose={() => setMostrarPerfil(false)} />
      )}
    </div>
  );
}

export default Home;
