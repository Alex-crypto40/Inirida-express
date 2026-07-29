// Cambiamos localhost por tu IP para que el celular tenga acceso al backend
const API_URL = "http://192.168.1.245:5000/api";

// Obtener todos los productos
export const getProducts = async () => {
  const res = await fetch(`${API_URL}/products`);
  return res.json();
};

// Obtener las tiendas filtradas dinámicamente por categoría
export const getStores = async (category) => {
  // Si pasas categoría, la URL queda: http://192.168.1.246:5000/api/stores?category=hotel
  const url = category
    ? `${API_URL}/stores?category=${category}`
    : `${API_URL}/stores`;

  const res = await fetch(url);
  return res.json();
};
