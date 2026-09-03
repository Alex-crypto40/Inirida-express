import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStores } from "../services/api.js";
import StoreCard from "../components/StoreCard";
import MotocarroForm from "../components/MotocarroForm";
import OrderStatusWidget from "../components/OrderStatusWidget";
import MapView from "../components/MapView";
import { OrderHistory } from "../components/OrderHistory";
import { UserProfileModal } from "../components/UserProfileModal";
import Navbar from "../components/Navbar";

function Home({ socket }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
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
    { id: "restaurante", label: "Comida", icon: "🍔" },
    { id: "licorera", label: "Licores", icon: "🍺" },
    { id: "turismo", label: "Turismo", icon: "🌴" },
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
    navigate("/register-store");
  };

  const irAFormularioRepartidor = () => {
    navigate("/driver-login");
  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("activeOrderId");
    window.location.reload();
  };

  return (
    <div className="relative max-w-md mx-auto bg-slate-50 min-h-screen flex flex-col shadow-2xl overflow-x-hidden antialiased font-sans">
      {/* 1. NAVBAR INTEGRADO */}
      <Navbar
        activeTab={categoriaSeleccionada}
        setMostrarHistorial={setMostrarHistorial}
        setMostrarPerfil={setMostrarPerfil}
        irAFormularioComercio={irAFormularioComercio}
        irAFormularioRepartidor={irAFormularioRepartidor}
        cerrarSesion={cerrarSesion}
      />

      {/* BANNER BIENVENIDA Y ESTADO EN VIVO (HERO UX) */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-orange-600">
            Hola 👋
          </p>
          <h1 className="text-lg font-black text-slate-800 tracking-tight">
            ¿Qué necesitas hoy?
          </h1>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-extrabold text-emerald-700 tracking-tight">
            Inírida • En línea
          </span>
        </div>
      </div>

      {/* 2. CUERPO PRINCIPAL */}
      <div className="p-4 pt-2 flex flex-col gap-4 flex-1 pb-8">
        {/* BARRA DE BÚSQUEDA (SÓLO COMERCIOS) */}
        {categoriaSeleccionada !== "motocarro" && (
          <div className="relative transition-all duration-200">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </div>
            <input
              type="text"
              placeholder={`Buscar en ${categoriaSeleccionada}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full py-3 pl-10 pr-9 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* BARRA DE CATEGORÍAS TIPO PILL SLIDER */}
        <div className="w-full -mx-4 px-4 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex gap-2 min-w-max">
            {categoriasGlobales.map((cat) => {
              const isSelected = categoriaSeleccionada === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoriaSeleccionada(cat.id);
                    setBusqueda("");
                  }}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80 shadow-2xs"
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL Y SECCIONES */}
        <div className="flex-1 mt-1">
          {/* HEADER DE SECCIÓN */}
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              {categoriaSeleccionada === "restaurante"
                ? "Restaurantes Aliados"
                : categoriaSeleccionada === "licorera"
                  ? "Licoreras Disponibles"
                  : categoriaSeleccionada === "hotel"
                    ? "Hoteles y Hospedajes"
                    : categoriaSeleccionada === "motocarro"
                      ? "Solicitar Motocarro"
                      : categoriaSeleccionada === "turismo"
                        ? "Turismo y Experiencias"
                        : "Servicios de Mandados"}
            </h2>

            {categoriaSeleccionada === "motocarro" ? (
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 active:scale-95 px-2.5 py-1 rounded-lg border border-orange-200/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>
                  {showMap ? "🙈 Ocultar Radar" : "📡 Ver Mapa Radar"}
                </span>
              </button>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                {`${comerciosFiltrados.length} ${comerciosFiltrados.length === 1 ? "opción" : "opciones"}`}
              </span>
            )}
          </div>

          {/* VISTA SEGÚN CATEGORÍA */}
          {categoriaSeleccionada === "motocarro" ? (
            <div className="space-y-3.5">
              {showMap && (
                <div className="h-56 rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 relative transition-all duration-300 animate-fadeIn bg-slate-200">
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
            /* SKELETON LOADING PRO */
            <div className="grid grid-cols-2 gap-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-36 bg-slate-200/60 rounded-2xl animate-pulse border border-slate-100"
                ></div>
              ))}
            </div>
          ) : comerciosFiltrados.length === 0 ? (
            /* EMPTY STATE MEJORADO */
            <div className="text-center py-12 px-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-xl mb-2">
                📍
              </div>
              <p className="text-xs font-bold text-slate-800">
                Sin resultados disponibles
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                No encontramos opciones activas en esta categoría.
              </p>
            </div>
          ) : (
            /* TARJETAS DE COMERCIO */
            <div
              className={`grid gap-3 ${
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

      {/* PIE DE PÁGINA (FOOTER PRO CLEAN & NATIVO) */}
      <footer className="mt-6 mx-4 mb-24 bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-4 text-center">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-center gap-1">
            <span>Inírida Express</span>
            <span className="text-orange-500">•</span>
            <span className="text-slate-400 font-normal capitalize">
              Guainía
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Conectando el transporte, turismo y comercio local.
          </p>
        </div>

        {/* OPCIONES DE ALIANZA Y TRABAJO */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={irAFormularioComercio}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/80 hover:border-orange-200 text-slate-700 hover:text-orange-600 transition-all active:scale-98 text-left flex flex-col gap-1 cursor-pointer group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">
              💼
            </span>
            <div>
              <p className="text-[11px] font-bold leading-tight">Vende aquí</p>
              <p className="text-[9px] text-slate-400 font-medium">
                Registra tu negocio
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={irAFormularioRepartidor}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/80 hover:border-orange-200 text-slate-700 hover:text-orange-600 transition-all active:scale-98 text-left flex flex-col gap-1 cursor-pointer group"
          >
            <span className="text-base group-hover:scale-110 transition-transform">
              🛺
            </span>
            <div>
              <p className="text-[11px] font-bold leading-tight">
                Trabaja aquí
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                Sé conductor o aliado
              </p>
            </div>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100">
          © {new Date().getFullYear()} Inírida Express • Tu ciudad a un clic
        </p>
      </footer>

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
