// Usa la variable de entorno en producción (Render) o la IP local por defecto en desarrollo
const API_URL =
  import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com/api";

// Obtener todos los productos
export const getProducts = async () => {
  const res = await fetch(`${API_URL}/products`);
  return res.json();
};

// Obtener las tiendas filtradas dinámicamente por categoría
export const getStores = async (category) => {
  const url = category
    ? `${API_URL}/stores?category=${category}`
    : `${API_URL}/stores`;

  const res = await fetch(url);
  return res.json();
};
