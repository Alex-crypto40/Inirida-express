import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // ID del pedido al que pertenece la conversación 📦
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // ID único del remitente (Opcional) 🆔
    senderId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Tipo de remitente: cliente, comercio, repartidor o sistema 👤
    senderRole: {
      type: String,
      enum: ["client", "user", "customer", "store", "driver", "system"],
      required: true,
      default: "user",
    },

    // Nombre legible de la persona que envía el mensaje ✏️
    senderName: {
      type: String,
      required: true,
      trim: true,
      default: "Usuario",
    },

    // 🔒 Campo de control auditado: Teléfono de quien envía el mensaje
    senderPhone: {
      type: String,
      trim: true,
      default: "",
    },

    // Contenido del mensaje 💬
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // Registra fecha y hora exacta del envío
  },
);

/* ==========================================================================
   🚀 ÍNDICE DE RENDIMIENTO PARA EL CHAT
   ========================================================================== */
messageSchema.index({ orderId: 1, createdAt: 1 });

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
