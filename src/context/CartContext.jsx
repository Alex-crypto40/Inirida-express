import { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  // Inicializamos el carrito buscando si ya había algo guardado en el navegador
  const [cart, setCart] = useState(() => {
    const localData = localStorage.getItem("inirida_express_cart");
    return localData ? JSON.parse(localData) : [];
  });

  // Cada vez que el carrito cambie, guardamos una copia de respaldo en LocalStorage
  useEffect(() => {
    localStorage.setItem("inirida_express_cart", JSON.stringify(cart));
  }, [cart]);

  // 1. AGREGAR AL CARRITO (Controlando duplicados)
  const addToCart = (product) => {
    setCart((prevCart) => {
      // MongoDB usa '_id'. Verificamos si el producto ya existe en el carrito
      const itemExists = prevCart.find((item) => item._id === product._id);

      if (itemExists) {
        // Si ya existe, recorremos el carrito e incrementamos su cantidad en 1
        return prevCart.map((item) =>
          item._id === product._id
            ? { ...item, cantidad: (item.cantidad || 1) + 1 }
            : item,
        );
      }
      // Si es un producto nuevo, lo agregamos con cantidad inicial de 1
      return [...prevCart, { ...product, cantidad: 1 }];
    });
  };

  // 2. REMOVER O DISMINUIR CANTIDAD
  const removeFromCart = (productId) => {
    setCart((prevCart) => {
      const item = prevCart.find((item) => item._id === productId);

      if (item && item.cantidad > 1) {
        // Si tiene más de una unidad, le restamos 1
        return prevCart.map((item) =>
          item._id === productId
            ? { ...item, cantidad: item.cantidad - 1 }
            : item,
        );
      }
      // Si solo quedaba 1 unidad, eliminamos el producto por completo del arreglo
      return prevCart.filter((item) => item._id !== productId);
    });
  };

  // 3. VACIAR TODO EL CARRITO (Para cuando se finalice el pedido)
  const clearCart = () => {
    setCart([]);
  };

  // 4. CALCULAR TOTALES DINÁMICOS
  const totalItems = cart.reduce((acc, item) => acc + (item.cantidad || 1), 0);
  const totalPrice = cart.reduce(
    (acc, item) => acc + item.price * (item.cantidad || 1),
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
