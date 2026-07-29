import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    // 1. Relación con el Comercio
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    // PIN de confirmación para la entrega 🔐
    deliveryPin: {
      type: String,
      required: true,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(),
    },

    // 2. Relación con el Repartidor que "toma" la carrera (al inicio es null)
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },

    // 3. Datos del Cliente (Sin necesidad de que esté registrado en la app)
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      notes: { type: String, default: "" }, // Ej: "Pagaré con billete de $50.000"
    },

    // 4. Ítems o Productos del pedido
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, default: 1 },
      },
    ],

    // 5. Para el módulo de "Mandados" (si aplica)
    isMandado: {
      type: Boolean,
      default: false,
    },
    mandadoDetail: {
      type: String,
      default: "", // Descripción abierta del mandado
    },

    // 6. Valores Monetarios
    subtotal: { type: Number, required: true, default: 0 },
    deliveryFee: { type: Number, required: true, default: 4000 }, // Domicilio estándar en Inírida
    total: { type: Number, required: true, default: 0 },

    // 7. Flujo de Estados en Tiempo Real
    status: {
      type: String,
      enum: [
        "created", // Pedido recibido
        "pending_driver", // Disponible para que CUALQUIER repartidor activo lo tome 🛵
        "assigned", // Un repartidor presionó "Tomar Pedido"
        "at_store", // Repartidor llegó a recoger el producto/mandado
        "on_the_way", // Repartidor va en camino a la dirección
        "completed", // Pedido entregado y cobrado con éxito 🏁
        "cancelled", // Pedido cancelado
      ],
      default: "pending_driver",
    },

    // 🔐 PIN de confirmación de entrega
    deliveryPin: {
      type: String,
      required: true,
      default: () => Math.floor(1000 + Math.random() * 9000).toString(),
    },

    // 8. Calificación del Servicio (Estrellas de 1 a 5)
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    ratingComment: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // Registra fecha y hora exacta del pedido
  },
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
