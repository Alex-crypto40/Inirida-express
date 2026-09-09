import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Clock,
  Star,
  MapPin,
  X,
  ChevronRight,
  Utensils,
  Send,
} from "lucide-react";

// Importa tu widget de estado y chat si deseas renderizarlos directo o navegas a ellos
import OrderStatusWidget from "../components/OrderStatusWidget";
import OrderChatModal from "../components/OrderChatModal";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.246:5000/api";

function StoreDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estados de Checkout y Pedido Creado
  const [step, setStep] = useState(1); // 1: Resumen, 2: Datos del Cliente
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [clientData, setClientData] = useState({
    name: "",
    address: "",
    phone: "",
    paymentMethod: "Efectivo",
    notes: "",
  });

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      try {
        setLoading(true);

        const resProd = await fetch(`${API_URL}/products?storeId=${id}`);
        if (!resProd.ok) throw new Error("Error al obtener catálogo");
        const dataProd = await resProd.json();
        setProducts(dataProd);

        try {
          const resStore = await fetch(`${API_URL}/stores/${id}`);
          if (resStore.ok) {
            const dataStore = await resStore.json();
            setStoreInfo(dataStore);
          }
        } catch {
          setStoreInfo(null);
        }
      } catch (err) {
        console.error("Error:", err);
        setError("No se pudo cargar el menú del comercio.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchStoreAndProducts();
  }, [id]);

  const addToCart = (product) => {
    const prodId = product._id || product.id;
    setCart((prev) => {
      const currentQty = prev[prodId]?.quantity || 0;
      return {
        ...prev,
        [prodId]: {
          product,
          quantity: currentQty + 1,
        },
      };
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const currentQty = prev[productId]?.quantity || 0;
      if (currentQty <= 1) {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      }
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: currentQty - 1,
        },
      };
    });
  };

  const deleteFromCart = (productId) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const cartItems = Object.values(cart);
  const totalItemsCount = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );
  const subtotalPrice = cartItems.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );
  const deliveryFee = 4000; // Tarifa estándar de domicilio en Inírida
  const totalPrice = subtotalPrice + deliveryFee;

  const categories = [
    "Todos",
    ...Array.from(new Set(products.map((p) => p.category || "General"))),
  ];

  const filteredProducts =
    selectedCategory === "Todos"
      ? products
      : products.filter((p) => (p.category || "General") === selectedCategory);

  // CREAR PEDIDO EN EL BACKEND REAL
  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    setSubmittingOrder(true);

    try {
      const formattedItems = cartItems.map(({ product, quantity }) => ({
        product: product._id || product.id,
        name: product.name,
        price: product.price,
        quantity,
      }));

      const payload = {
        serviceType: "delivery",
        store: id,
        customerName: clientData.name,
        customerPhone: clientData.phone,
        originAddress:
          storeInfo?.address || storeInfo?.name || "Comercio Aliado",
        destinationAddress: clientData.address,
        items: formattedItems,
        subtotal: subtotalPrice,
        deliveryFee,
        total: totalPrice,
        notes: `Pago: ${clientData.paymentMethod}. ${clientData.notes ? `Nota: ${clientData.notes}` : ""}`,
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al registrar la orden.");
      }

      // Orden creada exitosamente en MongoDB
      setActiveOrder(data.order);
      setCart({});
      setIsCartOpen(false);
      setStep(1);
    } catch (err) {
      console.error("❌ Error al crear pedido:", err);
      alert(
        err.message || "No se pudo procesar el pedido. Intenta nuevamente.",
      );
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative pb-28">
      {/* 1. Header Compacto */}
      <div className="relative h-32 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 overflow-hidden shadow-inner">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <button
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-md p-2 rounded-full shadow-md hover:bg-white text-gray-800 transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Tarjeta Principal de la Tienda */}
      <div className="px-4 -mt-10 relative z-10 mb-5">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative">
          <div className="flex justify-between items-start pt-2">
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                {storeInfo?.name || storeInfo?.nombre || "Pollo rico"}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {storeInfo?.category || "restaurante"}
              </p>
            </div>

            <span className="bg-emerald-50 text-emerald-600 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">
              Abierto
            </span>
          </div>

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600 font-medium">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-gray-900">4.8</span>
              <span className="text-gray-400">(120+)</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span>20-35 min</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>Inírida</span>
            </div>
          </div>
        </div>
      </div>

      {/* WIDGET DE PEDIDO ACTIVO (SI YA EXISTE UN PEDIDO) */}
      {activeOrder && (
        <div className="px-4 mb-5">
          <OrderStatusWidget
            order={activeOrder}
            onOpenChat={() => setIsChatOpen(true)}
          />
        </div>
      )}

      {/* 3. Filtro de Categorías */}
      {!loading && products.length > 0 && (
        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Lista de Productos */}
      <div className="px-4 space-y-3">
        {loading && (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-bold text-gray-400">
              Cargando el menú delicioso...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-4 rounded-2xl font-semibold text-center border border-red-200">
            ⚠️ {error}
          </div>
        )}

        {!loading &&
          !error &&
          filteredProducts.map((product) => {
            const prodId = product._id || product.id;
            const itemInCart = cart[prodId];
            const qty = itemInCart ? itemInCart.quantity : 0;
            const imageUrl = product.image || product.imageUrl || product.foto;

            return (
              <div
                key={prodId}
                className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex gap-3.5 items-center hover:border-orange-200 transition"
              >
                <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-300">
                      <Utensils className="w-6 h-6" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-gray-900 truncate">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 leading-snug">
                      {product.description}
                    </p>
                  )}
                  <p className="text-sm font-black text-orange-600 mt-1.5">
                    ${Number(product.price).toLocaleString("es-CO")}
                  </p>
                </div>

                <div className="shrink-0">
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-orange-50 text-orange-600 border border-orange-200 font-extrabold text-xs px-3.5 py-2 rounded-xl hover:bg-orange-500 hover:text-white transition active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 p-1 rounded-xl">
                      <button
                        onClick={() => removeFromCart(prodId)}
                        className="w-7 h-7 bg-white text-orange-600 rounded-lg flex items-center justify-center shadow-xs font-bold active:scale-90 transition cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black text-orange-600 px-1">
                        {qty}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="w-7 h-7 bg-orange-500 text-white rounded-lg flex items-center justify-center shadow-xs font-bold active:scale-90 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* 5. Barra Flotante de Carrito */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-4 z-40">
          <button
            onClick={() => {
              setStep(1);
              setIsCartOpen(true);
            }}
            className="w-full bg-orange-500 text-white p-4 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-between hover:bg-orange-600 active:scale-[0.99] transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="bg-orange-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs">
                {totalItemsCount}
              </div>
              <span className="text-xs font-extrabold tracking-wide uppercase">
                Ver Tu Pedido
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black">
                ${totalPrice.toLocaleString("es-CO")}
              </span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* 6. MODAL/DRAWER DEL CARRITO DE 2 PASOS */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center max-w-md mx-auto">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <h2 className="text-base font-black text-gray-800">
                  {step === 1 ? "Resumen de tu Pedido" : "Datos de Entrega"}
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PASO 1: RESUMEN DE PRODUCTOS */}
            {step === 1 && (
              <>
                <div className="p-4 overflow-y-auto space-y-3 flex-1">
                  {cartItems.map(({ product, quantity }) => {
                    const prodId = product._id || product.id;
                    return (
                      <div
                        key={prodId}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl border border-gray-100"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <h4 className="text-xs font-bold text-gray-800 truncate">
                            {product.name}
                          </h4>
                          <p className="text-[11px] font-bold text-orange-600 mt-0.5">
                            $
                            {(product.price * quantity).toLocaleString("es-CO")}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-white border border-gray-200 p-1 rounded-xl">
                            <button
                              onClick={() => removeFromCart(prodId)}
                              className="w-6 h-6 text-gray-600 flex items-center justify-center font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold px-1">
                              {quantity}
                            </span>
                            <button
                              onClick={() => addToCart(product)}
                              className="w-6 h-6 text-orange-500 flex items-center justify-center font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => deleteFromCart(prodId)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3 rounded-b-3xl">
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-bold text-gray-800">
                        ${subtotalPrice.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Domicilio:</span>
                      <span className="font-bold text-gray-800">
                        ${deliveryFee.toLocaleString("es-CO")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total a pagar:</span>
                      <span className="text-lg font-black text-orange-600">
                        ${totalPrice.toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep(2)}
                    className="w-full bg-orange-500 text-white font-extrabold py-3.5 rounded-xl shadow-md hover:bg-orange-600 transition active:scale-[0.98] cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <span>Continuar a Entrega</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* PASO 2: FORMULARIO Y REGISTRO DE ORDEN EN BD */}
            {step === 2 && (
              <form
                onSubmit={handleConfirmOrder}
                className="flex flex-col flex-1 min-h-0 overflow-hidden"
              >
                {/* Contenedor escroleable con max-h controlado */}
                <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Tu Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={clientData.name}
                      onChange={(e) =>
                        setClientData({ ...clientData, name: e.target.value })
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Dirección de Entrega / Barrio{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Barrio Centro, Calle 10 # 5-20"
                      value={clientData.address}
                      onChange={(e) =>
                        setClientData({
                          ...clientData,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Teléfono de Contacto{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      title="Ingresa un número de teléfono válido de 10 dígitos"
                      placeholder="Ej. 3123456789"
                      value={clientData.phone}
                      onChange={(e) =>
                        setClientData({ ...clientData, phone: e.target.value })
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Método de Pago <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={clientData.paymentMethod}
                      onChange={(e) =>
                        setClientData({
                          ...clientData,
                          paymentMethod: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800 font-medium cursor-pointer"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Nequi">Nequi</option>
                      <option value="Daviplata">Daviplata</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Notas Adicionales{" "}
                      <span className="text-gray-400 font-normal">
                        (Opcional)
                      </span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ej. Cambio de $50.000, sin cebolla..."
                      value={clientData.notes}
                      onChange={(e) =>
                        setClientData({ ...clientData, notes: e.target.value })
                      }
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-gray-800 resize-none"
                    />
                  </div>
                </div>

                {/* Footer Fijo con el Botón de Acción */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2 rounded-b-3xl shrink-0">
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-orange-500 font-bold hover:underline cursor-pointer"
                    >
                      ⬅️ Volver
                    </button>
                    <span className="font-bold text-gray-800 text-sm">
                      Total: ${totalPrice.toLocaleString("es-CO")}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-extrabold py-3.5 rounded-xl shadow-md transition active:scale-[0.98] cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {submittingOrder ? (
                      <span>Registrando Pedido...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirmar y Enviar Pedido</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CHAT EN VIVO */}
      {isChatOpen && activeOrder && (
        <OrderChatModal
          orderId={activeOrder._id}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}

export default StoreDetail;
