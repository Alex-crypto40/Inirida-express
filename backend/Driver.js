import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre completo es obligatorio"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "El teléfono es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El correo electrónico es obligatorio"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
      select: false, // Evita devolver el hash de la contraseña en las consultas por defecto
    },
    vehicleType: {
      type: String,
      enum: ["moto", "motocarro", "bicicleta"],
      default: "moto",
      required: true,
    },
    vehiclePlate: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (value) {
          // Si this no está definido o el vehículo no es bicicleta, exige la placa
          const type = this ? this.vehicleType : null;
          if (type && type !== "bicicleta") {
            return Boolean(value && value.trim().length > 0);
          }
          return true;
        },
        message:
          "La placa del vehículo es obligatoria para motos y motocarros.",
      },
      default: function () {
        return this && this.vehicleType === "bicicleta" ? "N/A" : "";
      },
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "suspended"],
      default: "pending",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
    },
    // NUEVO CAMPO: Billetera virtual del conductor
    walletBalance: {
      type: Number,
      default: 30000,
      min: [0, "El saldo no puede ser negativo"],
    },
  },
  {
    timestamps: true,
  },
);

// Índice para búsquedas rápidas de conductores activos y en línea
driverSchema.index({ status: 1, isOnline: 1 });

const Driver = mongoose.model("Driver", driverSchema);

export default Driver;
