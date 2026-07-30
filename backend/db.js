import mongoose from "mongoose";

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ ERROR CRÍTICO: La variable MONGO_URI no está definida.");
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log("🍃 Conexión exitosa a MongoDB");
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err.message);
    process.exit(1);
  }
};

// ⚡ Llama a la función de conexión inmediatamente al importar el archivo
connectDB();

export default connectDB;
