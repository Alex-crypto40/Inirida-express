import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  UserRound,
  Sparkles,
} from "lucide-react";

import { CartContext } from "../context/CartContext";
import { NavMenu } from "./NavMenu";

function Navbar({
  activeTab,
  setMostrarHistorial,
  setMostrarPerfil,
  irAFormularioComercio,
  irAFormularioRepartidor,
  cerrarSesion,
}) {
  const { cart, addToCart, removeFromCart, clearCart, totalItems, totalPrice } =
    useContext(CartContext);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // ============================================================
  // CATEGORÍAS COMERCIALES
  // ============================================================
  // El carrito solamente aparece en categorías donde realmente
  // existe una experiencia de compra.
  const ecommerceCategories = [
    "restaurantes",
    "licoreras",
    "supermercados",
    "tiendas",
  ];

  const showCartButton = ecommerceCategories.includes(activeTab?.toLowerCase());

  // ============================================================
  // PEDIDO POR WHATSAPP
  // ============================================================
  // Se conserva completamente la lógica original.
  const enviarPedidoWhatsApp = () => {
    if (cart.length === 0) return;

    let mensaje = "🛵 *¡Nuevo Pedido - Inírida Express!* 🛵\n";
    mensaje += "=========================\n\n";

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

    const mensajeCodificado = encodeURIComponent(mensaje);

    // Mantener el número configurado actualmente.
    const numeroWhatsApp = "";

    window.open(
      `https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`,
      "_blank",
    );
  };

  return (
    <>
      {/* ========================================================
          NAVBAR PRINCIPAL
          ======================================================== */}
      <header
        className="
          sticky top-0 z-40
          w-full max-w-md mx-auto
          text-white
          bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600
          shadow-lg shadow-orange-900/10
          relative
        "
      >
        {/* ======================================================
            FILA PRINCIPAL
            ====================================================== */}
        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          {/* ====================================================
              IDENTIDAD DE MARCA
              ==================================================== */}
          <Link
            to="/"
            className="
              min-w-0
              flex items-center gap-2.5
              select-none
              group
              transition-all duration-200
              active:scale-[0.98]
            "
            aria-label="Ir al inicio de Inírida Express"
          >
            {/* LOGO / ICONO */}
            <div
              className="
                w-10 h-10
                shrink-0
                rounded-xl
                bg-white/15
                border border-white/20
                backdrop-blur-sm
                flex items-center justify-center
                shadow-sm
                group-hover:bg-white/20
                transition-all
              "
            >
              <span className="text-xl leading-none">🛵</span>
            </div>

            {/* NOMBRE + SLOGAN */}
            <div className="min-w-0 flex flex-col justify-center">
              <span
                className="
                  text-[18px]
                  font-black
                  tracking-tight
                  leading-none
                  truncate
                "
              >
                Inírida Express
              </span>

              <span
                className="
                  text-[10px]
                  text-orange-50
                  font-semibold
                  tracking-wide
                  mt-1
                  opacity-90
                  truncate
                "
              >
                Tu ciudad, más fácil
              </span>
            </div>
          </Link>

          {/* ====================================================
              ACCIONES DE LA CABECERA
              ==================================================== */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* ==================================================
                CARRITO
                ================================================== */}
            {showCartButton && (
              <button
                onClick={() => setIsCartOpen(true)}
                aria-label={`Abrir carrito${
                  totalItems > 0 ? `, ${totalItems} productos` : ""
                }`}
                className="
                  relative
                  h-10
                  min-w-10
                  px-2.5
                  rounded-xl
                  bg-white/15
                  hover:bg-white/25
                  border border-white/15
                  backdrop-blur-sm
                  flex items-center justify-center gap-1.5
                  shadow-sm
                  transition-all duration-200
                  active:scale-95
                  cursor-pointer
                "
              >
                <ShoppingCart className="w-[18px] h-[18px]" />

                {/* CONTADOR */}
                {totalItems > 0 && (
                  <span
                    className="
                      absolute
                      -top-1.5
                      -right-1.5
                      min-w-[19px]
                      h-[19px]
                      px-1
                      rounded-full
                      bg-white
                      text-orange-600
                      border-2
                      border-orange-500
                      flex items-center justify-center
                      text-[9px]
                      font-black
                      shadow-sm
                    "
                  >
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </button>
            )}

            {/* ==================================================
                MENÚ
                ================================================== */}
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuAbierto}
              className={`
                h-10 w-10
                rounded-xl
                border border-white/15
                backdrop-blur-sm
                flex items-center justify-center
                shadow-sm
                transition-all duration-200
                active:scale-95
                cursor-pointer
                ${
                  menuAbierto
                    ? "bg-white text-orange-600"
                    : "bg-white/15 hover:bg-white/25 text-white"
                }
              `}
            >
              {menuAbierto ? (
                <X className="w-[19px] h-[19px]" />
              ) : (
                <Menu className="w-[20px] h-[20px]" />
              )}
            </button>
          </div>
        </div>

        {/* ======================================================
            RESUMEN DEL USUARIO
            ====================================================== */}
        <div className="px-3 pb-2.5">
          <div
            className="
              rounded-xl
              bg-orange-700/35
              border border-white/10
              px-3
              py-2
              flex items-center justify-between
              gap-2
              backdrop-blur-sm
            "
          >
            {/* ESTADO + SALUDO */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="
                  w-7 h-7
                  shrink-0
                  rounded-lg
                  bg-white/15
                  border border-white/10
                  flex items-center justify-center
                "
              >
                <UserRound className="w-3.5 h-3.5 text-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.8)]" />

                  <p className="text-[10px] font-bold text-white truncate">
                    Hola, Cliente 👋
                  </p>
                </div>

                <p className="text-[8px] text-orange-100/90 mt-0.5 truncate">
                  Disfruta de nuestros servicios
                </p>
              </div>
            </div>

            {/* ACCESO AL PERFIL */}
            <button
              type="button"
              onClick={() => {
                setMenuAbierto(false);
                setMostrarPerfil(true);
              }}
              className="
                shrink-0
                px-2.5
                py-1.5
                rounded-lg
                bg-white/15
                hover:bg-white/25
                border border-white/10
                text-[9px]
                font-bold
                transition-all
                active:scale-95
                cursor-pointer
              "
            >
              Ver perfil
            </button>
          </div>
        </div>

        {/* ======================================================
            MENÚ DESPLEGABLE
            ====================================================== */}
        <NavMenu
          menuAbierto={menuAbierto}
          setMenuAbierto={setMenuAbierto}
          setMostrarHistorial={setMostrarHistorial}
          setMostrarPerfil={setMostrarPerfil}
          irAFormularioComercio={irAFormularioComercio}
          irAFormularioRepartidor={irAFormularioRepartidor}
          cerrarSesion={cerrarSesion}
        />
      </header>

      {/* ========================================================
          DRAWER / CARRITO
          ======================================================== */}
      {isCartOpen && (
        <div
          className="
            fixed inset-0
            z-50
            bg-black/50
            backdrop-blur-[2px]
            flex justify-end
          "
        >
          {/* ====================================================
              CAPA PARA CERRAR
              ==================================================== */}
          <div
            className="flex-1 min-w-0"
            onClick={() => setIsCartOpen(false)}
            aria-hidden="true"
          />

          {/* ====================================================
              PANEL DEL CARRITO
              ==================================================== */}
          <div
            className="
              w-[88%] max-w-sm
              bg-white
              h-full
              shadow-2xl
              flex flex-col
              animate-in
              slide-in-from-right
              duration-300
            "
          >
            {/* ==================================================
                HEADER DEL CARRITO
                ================================================== */}
            <div
              className="
                px-4 py-3.5
                border-b border-gray-100
                flex items-center justify-between
                bg-gradient-to-r from-orange-50 to-white
              "
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="
                    w-9 h-9
                    rounded-xl
                    bg-orange-100
                    text-orange-600
                    flex items-center justify-center
                  "
                >
                  <ShoppingCart className="w-4.5 h-4.5" />
                </div>

                <div>
                  <h2 className="font-black text-gray-800 text-sm leading-none">
                    Mi pedido
                  </h2>

                  <p className="text-[10px] text-gray-400 mt-1">
                    {totalItems > 0
                      ? `${totalItems} ${
                          totalItems === 1 ? "producto" : "productos"
                        }`
                      : "Tu carrito está vacío"}
                  </p>
                </div>
              </div>

              {/* CERRAR */}
              <button
                onClick={() => setIsCartOpen(false)}
                aria-label="Cerrar carrito"
                className="
                  w-8 h-8
                  rounded-full
                  bg-gray-100
                  hover:bg-gray-200
                  text-gray-500
                  flex items-center justify-center
                  transition-all
                  active:scale-95
                  cursor-pointer
                "
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ==================================================
                CONTENIDO DEL CARRITO
                ================================================== */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {cart.length === 0 ? (
                /* ================================================
                   CARRITO VACÍO
                   ================================================ */
                <div
                  className="
                    h-full
                    min-h-[300px]
                    flex flex-col
                    items-center justify-center
                    text-center
                    text-gray-400
                    px-6
                  "
                >
                  <div
                    className="
                      w-16 h-16
                      rounded-2xl
                      bg-orange-50
                      border border-orange-100
                      flex items-center justify-center
                      mb-3
                    "
                  >
                    <ShoppingCart className="w-7 h-7 text-orange-300" />
                  </div>

                  <p className="text-sm font-bold text-gray-600">
                    Tu carrito está vacío
                  </p>

                  <p className="text-[11px] text-gray-400 mt-1 max-w-[220px]">
                    Explora nuestros comercios y agrega tus productos favoritos.
                  </p>
                </div>
              ) : (
                /* ================================================
                   PRODUCTOS
                   ================================================ */
                cart.map((item) => (
                  <div
                    key={item._id}
                    className="
                      p-3
                      rounded-2xl
                      bg-gray-50
                      border border-gray-100
                      hover:border-orange-100
                      transition-all
                    "
                  >
                    <div className="flex items-center gap-3">
                      {/* INFORMACIÓN */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className="
                            font-bold
                            text-xs
                            text-gray-800
                            truncate
                          "
                        >
                          {item.name}
                        </h4>

                        <p className="text-[11px] text-orange-600 font-bold mt-1">
                          $
                          {(item.price * item.cantidad).toLocaleString("es-CO")}
                        </p>
                      </div>

                      {/* CONTROL DE CANTIDAD */}
                      <div
                        className="
                          flex items-center
                          bg-white
                          rounded-xl
                          border border-gray-200
                          shadow-sm
                          overflow-hidden
                        "
                      >
                        <button
                          onClick={() => removeFromCart(item._id)}
                          aria-label={`Reducir cantidad de ${item.name}`}
                          className="
                            w-8 h-8
                            flex items-center justify-center
                            text-orange-600
                            hover:bg-orange-50
                            transition-colors
                            cursor-pointer
                          "
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <span
                          className="
                            min-w-7
                            text-center
                            text-xs
                            font-black
                            text-gray-700
                          "
                        >
                          {item.cantidad}
                        </span>

                        <button
                          onClick={() => addToCart(item)}
                          aria-label={`Aumentar cantidad de ${item.name}`}
                          className="
                            w-8 h-8
                            flex items-center justify-center
                            text-orange-600
                            hover:bg-orange-50
                            transition-colors
                            cursor-pointer
                          "
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ==================================================
                RESUMEN / ACCIONES
                ================================================== */}
            {cart.length > 0 && (
              <div
                className="
                  p-4
                  border-t border-gray-100
                  bg-gray-50
                  space-y-3
                  shrink-0
                "
              >
                {/* TOTAL */}
                <div
                  className="
                    flex justify-between
                    items-end
                    px-1
                  "
                >
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium block">
                      Total del pedido
                    </span>

                    <span className="text-[9px] text-gray-400">
                      Antes de confirmar
                    </span>
                  </div>

                  <span className="text-xl font-black text-gray-800">
                    ${totalPrice.toLocaleString("es-CO")}
                  </span>
                </div>

                {/* CONFIRMAR */}
                <button
                  onClick={enviarPedidoWhatsApp}
                  className="
                    w-full
                    bg-green-500
                    hover:bg-green-600
                    text-white
                    font-bold
                    py-3
                    rounded-xl
                    shadow-md
                    shadow-green-500/20
                    active:scale-[0.98]
                    transition-all
                    text-xs
                    flex items-center justify-center gap-2
                    cursor-pointer
                  "
                >
                  <span className="text-base leading-none">💬</span>
                  <span>Confirmar pedido por WhatsApp</span>
                </button>

                {/* VACIAR */}
                <button
                  onClick={clearCart}
                  className="
                    w-full
                    py-1
                    text-center
                    text-[10px]
                    text-gray-400
                    hover:text-red-500
                    transition-all
                    font-medium
                    flex items-center justify-center gap-1.5
                    cursor-pointer
                  "
                >
                  <Trash2 className="w-3 h-3" />
                  Vaciar carrito
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
