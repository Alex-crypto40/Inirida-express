import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function AdminStore() {
  const { storeId } = useParams(); // Captura el ID de la tienda directamente de la URL
  const navigate = useNavigate();

  // Estados para el formulario del producto
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("Comida");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const newProduct = {
      name,
      price: Number(price),
      description,
      image,
      category,
      storeId, // Vinculado automáticamente al ID de la URL
    };

    try {
      // Reemplaza con tu IP actual 192.168.1.245 si pruebas en el celular
      const response = await fetch("http://192.168.1.245:5000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProduct),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ ¡Producto guardado con éxito!");
        // Limpiamos el formulario para agregar otro
        setName("");
        setPrice("");
        setDescription("");
        setImage("");
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      setMessage("❌ Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"
        >
          ⬅️ Volver
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          Panel de Administración
        </h1>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Agregar Nuevo Producto
        </h2>

        {message && (
          <div
            className={`p-3 rounded-xl mb-4 text-sm font-medium ${message.includes("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Nombre del Plato / Producto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Hamburguesa Especial"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Precio *
              </label>
              <input
                type="number"
                required
                placeholder="Ej: 18000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Comida">Comida</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Postres">Postres</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Descripción corta
            </label>
            <textarea
              placeholder="Ej: Carne artesanal de 150g, queso fundido y papas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 h-20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              URL de la Foto
            </label>
            <input
              type="text"
              placeholder="https://enlace-de-la-imagen.jpg"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white font-bold p-4 rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all disabled:bg-gray-400"
          >
            {loading ? "Guardando..." : "🚀 Publicar Producto"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminStore;
