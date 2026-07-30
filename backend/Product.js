import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "" }, // URL de la imagen/foto
    category: { type: String, default: "General", trim: true }, // Ej: "Bebidas", "Platos Fuertes"
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    isAvailable: { type: Boolean, default: true }, // 🟢 Disponible / 🔴 Agotado
  },
  { timestamps: true },
);

/* ==========================================================================
   🚀 ÍNDICE DE RENDIMIENTO (Carga ultrarrápida de catálogos)
   ========================================================================== */

// Permite consultar los productos de una tienda ordenados o filtrados por categoría en ms
productSchema.index({ storeId: 1, category: 1 });

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
