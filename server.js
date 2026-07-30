// 1. Cargamos e inicializamos las variables de entorno
import "dotenv/config";

import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// 2. Definición de __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3. Importaciones locales
import "./backend/db.js";
import storeRoutes from "./backend/storeRoutes.js";
import productRoutes from "./backend/productRoutes.js";
import driverRoutes from "./backend/driverRoutes.js";
import orderRoutes from "./backend/orderRoutes.js";
import Message from "./backend/Message.js";

const app = express();

// 🔒 Configuración de CORS dinámica según el entorno
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ["*"];

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Servir archivos estáticos del build de React (Vite)
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// 🛠️ 4. Creación del servidor HTTP wrapper para WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// 🔑 CLAVE: Inyectamos 'io' en Express para usarlo desde req.app.get("io") en orderController.js
app.set("io", io);

// 🔌 5. Lógica de comunicación en tiempo real
io.on("connection", (socket) => {
  console.log(`⚡ Usuario conectado al WebSocket: ${socket.id}`);

  // Unirse a la sala única del pedido (sirve tanto para Chat como para cambios de estado)
  socket.on("join_order_chat", (orderId) => {
    socket.join(orderId);
    socket.join(`order_${orderId}`); // Soporte para la nomenclatura de eventos de orden
    console.log(
      `📌 Socket ${socket.id} ingresó al canal del pedido: ${orderId}`,
    );
  });

  // Salir de la sala del pedido
  socket.on("leave_order_chat", (orderId) => {
    socket.leave(orderId);
    socket.leave(`order_${orderId}`);
    console.log(
      `👋 Socket ${socket.id} salió del canal del pedido: ${orderId}`,
    );
  });

  // Evento cuando se envía un mensaje dentro del chat
  socket.on("send_message", async (data) => {
    try {
      const { orderId, senderRole, senderName, text } = data;

      if (!orderId || !text) return;

      // Guardar el mensaje en MongoDB
      const newMessage = new Message({
        orderId,
        senderRole,
        senderName,
        text,
      });
      await newMessage.save();

      // Emitir el mensaje a TODOS los participantes de ese pedido
      io.to(orderId).emit("receive_message", newMessage);
    } catch (error) {
      console.error("Error al guardar/transmitir mensaje en WebSocket:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Usuario desconectado del WebSocket: ${socket.id}`);
  });
});

// Rutas de la API
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/orders", orderRoutes);

// 🌐 Ruta comodín (Catch-all) para Single Page Application (React Router)
app.get(/(.*)/, (req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      message: "API Inírida Express activa. Frontend no compilado en dist/",
    });
  }
});

// Puerto
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 Servidor e infraestructura de WebSockets corriendo en puerto ${PORT}`,
  );
});
