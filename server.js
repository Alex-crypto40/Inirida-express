// 1. Cargamos e inicializamos las variables de entorno de golpe antes que todo lo demás
import "dotenv/config";

import express from "express";
import cors from "cors";
import http from "http"; // 👈 Importamos el módulo HTTP nativo de Node.js
import { Server } from "socket.io"; // 👈 Importamos Socket.io

// 2. Importaciones locales
import "./backend/db.js";
import storeRoutes from "./backend/storeRoutes.js";
import productRoutes from "./backend/productRoutes.js";
import driverRoutes from "./backend/driverRoutes.js";
import orderRoutes from "./backend/orderRoutes.js";
import Message from "./backend/Message.js"; // 👈 Importamos el modelo para guardar los mensajes

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 🛠️ 3. Creación del servidor HTTP wrapper para WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permite conexiones desde cualquier IP/Frontend en red local o producción
    methods: ["GET", "POST"],
  },
});

// 🔌 4. Lógica de comunicación en tiempo real (Chat Triangular por Pedido)
io.on("connection", (socket) => {
  console.log(`⚡ Usuario conectado al WebSocket: ${socket.id}`);

  // El cliente, comercio o domiciliario se unen a la sala única del pedido
  socket.on("join_order_chat", (orderId) => {
    socket.join(orderId);
    console.log(
      `📌 Socket ${socket.id} ingresó al chat del pedido: ${orderId}`,
    );
  });

  // Evento cuando se envía un mensaje dentro del chat
  socket.on("send_message", async (data) => {
    try {
      const { orderId, senderRole, senderName, text } = data;

      // Guardar el mensaje en MongoDB para no perder el historial
      const newMessage = new Message({
        orderId,
        senderRole,
        senderName,
        text,
      });
      await newMessage.save();

      // Emitir el mensaje a TODOS los participantes de ese pedido específico
      io.to(orderId).emit("receive_message", newMessage);
    } catch (error) {
      console.error("Error al guardar/transmitir mensaje en WebSocket:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Usuario desconectado del WebSocket: ${socket.id}`);
  });
});

// Ruta raíz de prueba para verificar que el servidor vive
app.get("/", (req, res) => {
  res.send("API y WebSockets de Inírida Express funcionando correctamente 🚀");
});

// Rutas de la API
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/orders", orderRoutes);

// Puerto
const PORT = process.env.PORT || 5000;

// 🚀 Mantenemos server.listen para habilitar WebSockets y Express
server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 Servidor e infraestructura de WebSockets corriendo en puerto ${PORT}`,
  );
});
