import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // ID del pedido al que pertenece la conversación 📦
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // Tipo de remitente: cliente, comercio o repartidor 👤
    senderRole: {
      type: String,
      enum: ["client", "store", "driver"],
      required: true,
    },

    // Nombre legible de la persona que envía el mensaje ✏️
    senderName: {
      type: String,
      required: true,
      trim: true,
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
