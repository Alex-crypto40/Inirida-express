import { useContext, useState } from "react";
import { Link } from "react-router-dom"; // Añadido para el enrutamiento sin recargar
import { CartContext } from "../context/CartContext";

function Navbar() {
  // Extraemos las funciones dinámicas y los totales que creamos en el Contexto
  const { cart, addToCart, removeFromCart, clearCart, totalItems, totalPrice } =
    useContext(CartContext);

  // Estado local para abrir o cerrar la cortina lateral del carrito
  const [isCartOpen, setIsCartOpen] = useState(false);

  // FUNCIÓN PARA GENERAR EL MENSAJE Y ENVIARLO A WHATSAPP
  const enviarPedidoWhatsApp = () => {
    if (cart.length === 0) return;

    let mensaje = "🛵 *¡Nuevo Pedido - Inírida Express!* 🛵\n";
    mensaje += "=========================\n\n";

    // Recorremos los productos agregados para tabularlos de manera limpia
    cart.forEach((item) => {
      const subtotal = item.price * item.cantidad;
      mensaje += `*${item.cantidad}x* ${item.name}\n`;
      mensaje += `   └ _Precio:_ $${subtotal.toLocaleString("es-CO")}\n`;
    });

    mensaje += "\n=========================\n";
    mensaje += `💰 *Total a Pagar:* $${totalPrice.toLocaleString("es-CO")}\n\n`;
    mensaje += "📍 *Dirección de Entrega:* _____________\n";
    mensaje += "💵 *Método de Pago:* Efectivo (Contra entrega)\n\n";
    mensaje += "¡Muchas gracias! Quedo atento a la confirmación.";

    // Codificamos el texto para que los espacios y símbolos sean válidos en una URL
    const mensajeCodificado = encodeURIComponent(mensaje);

    // Si manejas un número fijo para los domicilios lo puedes colocar aquí entre las comillas
    const numeroWhatsApp = "";

    // Abre el chat de WhatsApp en una pestaña nueva con el texto listo
    window.open(
      `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`,
      "_blank",
    );
  };

  return (
    <>
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR (FIJA) */}
      <header className="bg-orange-500 text-white shadow-md sticky top-0 z-40 max-w-md mx-auto w-full rounded-b-xl">
        {/* Fila del Título y el Carrito */}
        <div className="p-4 flex justify-between items-center w-full">
          {/* Convertimos el título en un enlace para regresar al Home de forma interactiva */}
          <Link
            to="/"
            className="text-xl font-black tracking-wide select-none hover:opacity-90"
          >
            Inírida Express 🛵
          </Link>

          {/* Botón interactivo que abre el carrito */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative bg-orange-600 hover:bg-orange-700 active:scale-95 px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-sm shadow-sm transition-all"
          >
            <span>🛒</span>
            {totalItems > 0 && (
              <span className="bg-white text-orange-600 text-xs font-black px-2 py-0.5 rounded-full animate-bounce">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* 2. BARRA SECUNDARIA DE CONVOCATORIAS (Estilo Rappi Aliados) */}
        <div className="bg-orange-600/50 border-t border-orange-400/20 px-4 py-2 flex justify-between text-[11px] font-bold tracking-wide">
          <Link to="/login" className="hover:underline flex items-center gap-1">
            <span>💼 ¿Quieres vender con nosotros?</span>
          </Link>
          <Link
            to="/driver-login"
            className="hover:underline flex items-center gap-1 text-orange-100"
          >
            🛺 ¡Trabaja con nosotros!
          </Link>
        </div>
      </header>

      {/* 3. CORTINA LATERAL DEL CARRITO (MODAL SIDEBAR) */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end transition-all max-w-md mx-auto w-full">
          {/* Fondo oscuro traslúcido. Si el usuario hace clic afuera del carrito, este se cierra */}
          <div className="flex-1" onClick={() => setIsCartOpen(false)}></div>

          {/* Contenedor del panel */}
          <div className="w-4/5 bg-white h-full shadow-2xl flex flex-col justify-between">
            {/* Cabecera del Panel */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="font-black text-gray-800 text-base">Mi Pedido</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Listado Dinámico de Productos seleccionados */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-3xl">🛒</p>
                  <p className="text-xs font-medium mt-2">
                    Tu carrito está vacío.
                  </p>
                  <p className="text-[11px] text-gray-300">
                    ¡Agrega delicias del menú!
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-gray-800 truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-orange-600 font-semibold mt-0.5">
                        ${(item.price * item.cantidad).toLocaleString("es-CO")}
                      </p>
                    </div>

                    {/* Botonera de control rápido de cantidades dentro del carrito */}
                    <div className="flex items-center bg-white rounded-lg border shadow-sm">
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="px-2 py-1 text-xs text-orange-600 font-black hover:bg-orange-50 rounded-l-lg"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-bold text-gray-700">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="px-2 py-1 text-xs text-orange-600 font-black hover:bg-orange-50 rounded-r-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sección Inferior: Desglose de Precios y Botón de Disparo */}
            {cart.length > 0 && (
              <div className="p-4 border-t bg-gray-50 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">
                    Subtotal a pagar:
                  </span>
                  <span className="text-lg font-black text-gray-800">
                    ${totalPrice.toLocaleString("es-CO")}
                  </span>
                </div>

                {/* El botón verde que conecta la web con WhatsApp */}
                <button
                  onClick={enviarPedidoWhatsApp}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                >
                  Confirmar Pedido por WhatsApp 💬
                </button>

                <button
                  onClick={clearCart}
                  className="w-full text-center text-[11px] text-gray-400 hover:text-red-500 transition-all font-medium"
                >
                  Vaciar Todo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;
