import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    image: { type: String }, // URL de la foto de portada del negocio o logo

    // 1. CREDENCIALES DE ACCESO Y SEGURIDAD (Nuevos campos para autenticación)
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended"], // Controla el acceso del aliado
      default: "pending", // Por defecto, requiere tu aprobación manual
    },

    // 2. EL CAMPO CLAVE: Controla qué tipo de negocio es
    category: {
      type: String,
      required: true,
      // Ajustado a minúsculas para mantener consistencia con tu enum original
      enum: [
        "restaurante",
        "licorera",
        "hotel",
        "mandados",
        "supermercado",
        "transporte",
        "turismo",
      ],
      default: "restaurante",
    },

    // 3. CAMPOS PARA HOTELES Y CONTACTO
    whatsappNumber: { type: String }, // Número con código de país (ej: "57310XXXXXXX")
    priceRange: { type: String }, // Ej: "$50.000 - $120.000 COP"
    services: [{ type: String }], // Ej: ["Wi-Fi", "Aire Acondicionado", "TV"]

    // 4. CAMPOS GENERALES
    deliveryTime: { type: String, default: "20-40 min" }, // Tiempo estimado
    isOpen: { type: Boolean, default: true }, //🟢 Abierto o 🔴 Cerrado
    rating: { type: Number, default: 4.5 },
  },
  { timestamps: true },
);

const Store = mongoose.models.Store || mongoose.model("Store", storeSchema);

export default Store;
