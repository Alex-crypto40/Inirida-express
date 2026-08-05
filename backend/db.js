import mongoose from "mongoose";

const mongoURI = process.env.MONGO_URI;

const connectDB = async () => {
  if (!mongoURI) {
    console.error("❌ ERROR CRÍTICO: La variable MONGO_URI no está definida.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`🍃 Conexión exitosa a MongoDB: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("❌ Error conectando a MongoDB:", err.message);
    process.exit(1);
  }
};

export default connectDB;
