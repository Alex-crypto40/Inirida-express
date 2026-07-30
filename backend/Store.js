import mongoose from "mongoose";

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" }, // URL de foto de portada/logo

    // 1. CREDENCIALES Y ACCESO
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
      enum: ["pending", "active", "suspended"],
      default: "pending",
    },

    // 2. CATEGORÍA DEL COMERCIO
    category: {
      type: String,
      required: true,
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

    // 3. DATOS DE CONTACTO Y SERVICIOS
    phone: { type: String, trim: true, default: "" },
    whatsappNumber: { type: String, trim: true, default: "" }, // Ej: "57310XXXXXXX"
    priceRange: { type: String, default: "" }, // Ej: "$50.000 - $120.000 COP"
    services: [{ type: String }], // Ej: ["Wi-Fi", "Aire Acondicionado"]

    // 4. ESTADO DE OPERACIÓN
    deliveryTime: { type: String, default: "20-40 min" },
    isOpen: { type: Boolean, default: true },
    rating: { type: Number, default: 4.5, min: 1, max: 5 },
  },
  { timestamps: true },
);

/* ==========================================================================
   🚀 ÍNDICES DE RENDIMIENTO EN PRODUCCIÓN
   ========================================================================== */

// 1. Permite filtrar tiendas activas por categoría ultrarrápidamente
storeSchema.index({ status: 1, category: 1 });

const Store = mongoose.models.Store || mongoose.model("Store", storeSchema);

export default Store;
