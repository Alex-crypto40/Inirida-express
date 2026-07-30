// Usa la variable de entorno en producción (Render) o la URL por defecto
const API_URL =
  import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com/api";

// --- TIENDAS Y PRODUCTOS ---

// Obtener todos los productos
export const getProducts = async () => {
  const res = await fetch(`${API_URL}/products`);
  return res.json();
};

// Obtener las tiendas filtradas dinámicamente por categoría
export const getStores = async (category) => {
  const url = category
    ? `${API_URL}/stores?category=${encodeURIComponent(category)}`
    : `${API_URL}/stores`;

  const res = await fetch(url);
  return res.json();
};

// --- DOMICILIARIOS / REPARTIDORES ---

// Iniciar sesión de domiciliario
export const loginDriver = async (credentials) => {
  const res = await fetch(`${API_URL}/drivers/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Error al iniciar sesión");
  }
  return data;
};

// Registro de domiciliario
export const registerDriver = async (driverData) => {
  const res = await fetch(`${API_URL}/drivers/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(driverData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Error al registrarse");
  }
  return data;
};