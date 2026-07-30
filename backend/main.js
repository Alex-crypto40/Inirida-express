// --- CONFIGURACIÓN E INICIALIZACIÓN DE ESTADO ---
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000/api/products"
    : "/api/products";

let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito_inirida")) || [];

// --- ELEMENTOS DEL DOM ---
const contenedorProductos =
  document.getElementById("contenedor-productos") ||
  document.querySelector(".grid");
const contadorCarrito = document.getElementById("contador-carrito");

// --- 1. FUNCIÓN PRINCIPAL: TRAER DATOS DEL BACKEND ---
async function cargarProductosDesdeBD() {
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) throw new Error("Error al conectar con el servidor");

    productos = await respuesta.json();

    renderizarProductos(productos);
    actualizarInterfazCarrito();
  } catch (error) {
    console.error("❌ Error cargando el menú:", error);
    if (contenedorProductos) {
      contenedorProductos.innerHTML = `
        <div class="col-span-full text-center py-10">
          <p class="text-red-500 font-semibold text-lg">No se pudo cargar el menú en este momento.</p>
          <p class="text-gray-500 text-sm">Verifica tu conexión a internet o el estado de los servidores.</p>
        </div>
      `;
    }
  }
}

// --- 2. FUNCIÓN PARA PINTAR LAS TARJETAS EN EL HTML ---
function renderizarProductos(listaProductos) {
  if (!contenedorProductos) return;

  if (!Array.isArray(listaProductos) || listaProductos.length === 0) {
    contenedorProductos.innerHTML = `<p class="text-center col-span-full text-gray-500">No hay productos disponibles en el menú.</p>`;
    return;
  }

  contenedorProductos.innerHTML = listaProductos
    .map((producto) => {
      const idProducto = producto._id;
      const precioFormateado = Number(producto.price || 0).toLocaleString(
        "es-CO",
      );

      return `
      <div class="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 flex flex-col">
        <div class="h-48 bg-gray-200 flex items-center justify-center text-gray-400 font-medium relative">
          <span class="text-xs uppercase bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-semibold absolute top-3 left-3">
            ${producto.category || "General"}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-800 mb-1">${producto.name}</h3>
            <p class="text-gray-500 text-sm mb-4 line-clamp-2">${producto.description || "Sin descripción disponible."}</p>
          </div>
          <div class="flex items-center justify-between mt-auto">
            <span class="text-xl font-black text-orange-600">$${precioFormateado}</span>
            <button 
              onclick="agregarAlCarrito('${idProducto}')"
              class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl transition-colors duration-200 flex items-center gap-2 shadow-sm"
            >
              <span>Agregar</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 100-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// --- 3. GESTIÓN DEL CARRITO ---
window.agregarAlCarrito = function (id) {
  const productoSeleccionado = productos.find((p) => p._id === id);
  if (!productoSeleccionado) return;

  const itemEnCarrito = carrito.find((item) => item._id === id);

  if (itemEnCarrito) {
    itemEnCarrito.cantidad += 1;
  } else {
    carrito.push({
      ...productoSeleccionado,
      cantidad: 1,
    });
  }

  actualizarInterfazCarrito();
};

function actualizarInterfazCarrito() {
  localStorage.setItem("carrito_inirida", JSON.stringify(carrito));

  if (contadorCarrito) {
    const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    contadorCarrito.textContent = totalItems;
  }
}

// --- 4. DISPARO INICIAL ---
document.addEventListener("DOMContentLoaded", cargarProductosDesdeBD);
