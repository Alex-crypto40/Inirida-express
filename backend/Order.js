import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // 1. Tipo de Servicio
    serviceType: {
      type: String,
      enum: ["delivery", "mandado", "ride"], // Pedido de tienda, Mandado especial o Carrera de pasajeros
      default: "delivery",
      required: true,
    },

    // 2. Relación con el Comercio (Opcional)
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },

    // 3. Relación con el Repartidor / Conductor
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    // 4. Datos del Cliente
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true }, // Punto de entrega o destino final
      pickupAddress: { type: String, default: "", trim: true }, // Punto de origen (crucial para carreras/mandados)
      notes: { type: String, default: "", trim: true }, // Observaciones generales
    },

    // 5. Módulo Especial para Carreras de Pasajeros (RideDetails) 🛵🚘
    rideDetails: {
      passengersCount: {
        type: Number,
        default: 1,
        min: 1,
      },
      hasLuggage: {
        type: Boolean,
        default: false,
      },
      luggageDetails: {
        type: String,
        default: "", // Ej: "2 maletas medianas"
        trim: true,
      },
      hasPets: {
        type: Boolean,
        default: false,
      },
      petDetails: {
        type: String,
        default: "", // Ej: "2 gatos en guacal"
        trim: true,
      },
    },

    // 6. Ítems o Productos del pedido (Para tiendas)
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1, default: 1 },
      },
    ],

    // 7. Módulo de Mandados
    isMandado: {
      type: Boolean,
      default: false,
    },
    mandadoDetail: {
      type: String,
      default: "",
      trim: true,
    },

    // 8. Valores Monetarios
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 4000 },
    total: { type: Number, required: true, min: 0, default: 0 },

    // 9. Flujo de Estados en Tiempo Real
    status: {
      type: String,
      enum: [
        "created",
        "pending_driver",
        "assigned",
        "at_store",
        "on_the_way",
        "completed",
        "cancelled",
      ],
      default: "pending_driver",
    },

    // 🔐 PIN de confirmación de entrega (4 dígitos)
    deliveryPin: {
      type: String,
      required: true,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(),
    },

    // 10. Calificación del Servicio
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    ratingComment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

/* ==========================================================================
   🚀 ÍNDICES PARA PRODUCCIÓN
   ========================================================================== */

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ driver: 1, status: 1 });
orderSchema.index({ store: 1, createdAt: -1 });
orderSchema.index({ serviceType: 1, status: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;
