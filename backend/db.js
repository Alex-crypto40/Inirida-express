import mongoose from "mongoose";

const mongoURI =
  process.env.MONGO_URI || "mongodb://localhost:27016/inirida-express"; // Usa tu variable o string real

mongoose
  .connect(mongoURI)
  .then(() => console.log("🍃 Conexión exitosa a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err));
