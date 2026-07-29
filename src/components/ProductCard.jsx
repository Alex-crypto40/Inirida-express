import { useContext } from "react";
import { CartContext } from "../context/CartContext";

function ProductCard({ product }) {
  // Extraemos las funciones y el estado del carrito global
  const { cart, addToCart, removeFromCart } = useContext(CartContext);

  // Buscamos si este producto específico ya existe en el carrito
  const itemEnCarrito = cart.find((item) => item._id === product._id);
  const cantidad = itemEnCarrito ? itemEnCarrito.cantidad : 0;

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100 flex flex-col justify-between transition-all hover:shadow-lg duration-200">
      <div>
        {/* Imagen con marcador de posición estético */}
        <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center text-gray-400">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}

          {/* Badge dinámico de Categoría o Tienda */}
          <span className="absolute top-2 left-2 bg-orange-100 text-orange-600 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
            {product.restaurant || product.store || "Menú"}
          </span>
        </div>

        {/* Textos Informativos */}
        <h3 className="font-bold text-gray-800 mt-3 text-base leading-snug">
          {product.name}
        </h3>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2 min-h-[32px]">
          {product.description || "Sin descripción disponible."}
        </p>
      </div>

      {/* Fila de Acción Inferior */}
      <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-50">
        {/* Precio formateado a pesos colombianos */}
        <span className="text-lg font-black text-orange-600">
          ${Number(product.price).toLocaleString("es-CO")}
        </span>

        {/* INTERFAZ DEL BOTÓN DINÁMICO */}
        {cantidad > 0 ? (
          /* Si el producto ya se agregó, mostramos el control de cantidad (- 1 +) */
          <div className="flex items-center bg-orange-50 rounded-xl p-1 border border-orange-200 shadow-sm transition-all">
            <button
              onClick={() => removeFromCart(product._id)}
              className="w-8 h-8 flex items-center justify-center bg-white text-orange-600 font-extrabold rounded-lg hover:bg-orange-500 hover:text-white active:scale-95 transition-all text-base"
            >
              -
            </button>
            <span className="px-3 text-sm font-black text-orange-700 min-w-[24px] text-center">
              {cantidad}
            </span>
            <button
              onClick={() => addToCart(product)}
              className="w-8 h-8 flex items-center justify-center bg-white text-orange-600 font-extrabold rounded-lg hover:bg-orange-500 hover:text-white active:scale-95 transition-all text-base"
            >
              +
            </button>
          </div>
        ) : (
          /* Si no está en el carrito, mostramos el botón simple de "Agregar" */
          <button
            onClick={() => addToCart(product)}
            className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-md shadow-orange-100 flex items-center gap-1"
          >
            Agregar 🛒
          </button>
        )}
      </div>
    </div>
  );
}

export default ProductCard;
