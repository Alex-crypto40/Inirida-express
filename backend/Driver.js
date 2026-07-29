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
          // Si el vehículo no es bicicleta, la placa no puede estar vacía
          if (this.vehicleType !== "bicicleta") {
            return value && value.trim().length > 0;
          }
          return true;
        },
        message:
          "La placa del vehículo es obligatoria para motos y motocarros.",
      },
      default: function () {
        return this.vehicleType === "bicicleta" ? "N/A" : "";
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
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    completedDeliveries: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Driver = mongoose.model("Driver", driverSchema);

export default Driver;
