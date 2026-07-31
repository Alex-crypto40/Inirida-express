import { useState } from "react";

export default function FormularioMotocarro({ onSubmit, cargando }) {
  const [paso, setPaso] = useState(1);

  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    cedula: "",
    placa: "",
    modelo: "",
    experiencia: "",
    zona: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const siguientePaso = () => {
    if (!formData.nombre || !formData.telefono || !formData.cedula) {
      alert("Completa todos los campos personales");
      return;
    }
    setPaso(2);
  };

  const pasoAnterior = () => {
    setPaso(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.placa || !formData.modelo || !formData.zona) {
      alert("Completa los datos del vehículo");
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-5 rounded-2xl shadow-lg">
      {/* PROGRESO */}
      <div className="flex items-center justify-between mb-6">
        <div
          className={`flex-1 h-1 rounded-full ${paso >= 1 ? "bg-orange-500" : "bg-gray-200"}`}
        />
        <div
          className={`flex-1 h-1 rounded-full mx-2 ${paso >= 2 ? "bg-orange-500" : "bg-gray-200"}`}
        />
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-4">
        {paso === 1 ? "Datos Personales" : "Datos del Motocarro"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ================= PASO 1 ================= */}
        {paso === 1 && (
          <>
            <input
              type="text"
              name="nombre"
              placeholder="Nombre completo"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl"
            />

            <input
              type="text"
              name="telefono"
              placeholder="Teléfono"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl"
            />

            <input
              type="text"
              name="cedula"
              placeholder="Cédula"
              value={formData.cedula}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl"
            />

            <button
              type="button"
              onClick={siguientePaso}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold"
            >
              Continuar →
            </button>
          </>
        )}

        {/* ================= PASO 2 ================= */}
        {paso === 2 && (
          <>
            <input
              type="text"
              name="placa"
              placeholder="Placa del motocarro"
              value={formData.placa}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl"
            />

            <input
              type="text"
              name="modelo"
              placeholder="Modelo"
              value={formData.modelo}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl"
            />

            <input
              type="text"
              name="experiencia"
              placeholder="Años de experiencia"
              value={formData.experiencia}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl"
            />

            <input
              type="text"
              name="zona"
              placeholder="Zona donde trabajas"
              value={formData.zona}
              onChange={handleChange}
              className="w-full p-3 border rounded-xl"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={pasoAnterior}
                className="flex-1 bg-gray-200 py-3 rounded-xl font-bold"
              >
                ← Atrás
              </button>

              <button
                type="submit"
                disabled={cargando}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold"
              >
                {cargando ? "Enviando..." : "Finalizar"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
