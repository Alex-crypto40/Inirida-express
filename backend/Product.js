import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  image: { type: String }, // URL de la foto del plato
  category: { type: String }, // "Todos", "Bebidas", etc.
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" }, // Relación con el restaurante
});

// Definimos el modelo de forma segura y con la P mayúscula
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

// Exportación moderna por defecto para que el controlador lo lea feliz
export default Product;
