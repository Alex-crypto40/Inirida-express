import mongoose from "mongoose";

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    console.error(
      "❌ ERROR CRÍTICO: La variable MONGO_URI no está definida en las variables de entorno de Render.",
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`🍃 Conexión exitosa a MongoDB: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err.message);
    process.exit(1);
  }
};

export default connectDB;
