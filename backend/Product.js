import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "" },
    category: { type: String, default: "General", trim: true },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/* ==========================================================================
   🚀 ÍNDICE DE RENDIMIENTO
   ========================================================================== */
productSchema.index({ storeId: 1, category: 1 });

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;
