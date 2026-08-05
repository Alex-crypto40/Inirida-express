import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // 1. Tipo de Servicio
    serviceType: {
      type: String,
      enum: ["delivery", "mandado", "ride"],
      default: "delivery",
      required: true,
    },

    // 2. Relaciones
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    // 3. Datos del Cliente
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      pickupAddress: { type: String, default: "", trim: true },
      notes: { type: String, default: "", trim: true },
    },

    // 4. Módulo Especial para Carreras (RideDetails)
    rideDetails: {
      passengersCount: { type: Number, default: 1, min: 1 },
      hasLuggage: { type: Boolean, default: false },
      luggageDetails: { type: String, default: "", trim: true },
      hasPets: { type: Boolean, default: false },
      petDetails: { type: String, default: "", trim: true },
    },

    // 5. Ítems o Productos (Para tiendas)
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          default: null,
        },
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1, default: 1 },
      },
    ],

    // 6. Módulo de Mandados
    isMandado: { type: Boolean, default: false },
    mandadoDetail: { type: String, default: "", trim: true },

    // 7. Valores Monetarios
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 4000 },
    total: { type: Number, required: true, min: 0, default: 0 },

    // 8. Flujo de Estados
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

    // 9. Calificación del Servicio
    rating: { type: Number, min: 1, max: 5, default: null },
    ratingComment: { type: String, default: "", trim: true },

    // 10. Geolocalización y Contraofertas (Nuevos campos para MapView y Motocarros)
    originCoords: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    destinationCoords: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    driverLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      heading: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now },
    },
    counterOffers: [
      {
        driverId: { type: String, required: true },
        driverName: { type: String, default: "Conductor Motocarro" },
        proposedPrice: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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
