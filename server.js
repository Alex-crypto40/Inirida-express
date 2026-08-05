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

// 🔒 Configuración de CORS permitiendo orígenes explícitos
const allowedOrigins = [
  "https://inirida-express-frontend.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
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
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  },
});

// 🔑 Inyectamos 'io' en Express
app.set("io", io);

// 📍 Memoria en servidor para mantener la última ubicación de los conductores activos
const activeDriversLocations = new Map();

// 🔌 5. Lógica de comunicación en tiempo real
io.on("connection", (socket) => {
  console.log(`⚡ Usuario conectado al WebSocket: ${socket.id}`);

  // Enviar lista completa de motocarros disponibles inmediatamente al conectar
  socket.emit(
    "initial_drivers_locations",
    Array.from(activeDriversLocations.values()),
  );
  socket.emit(
    "drivers_online_list",
    Array.from(activeDriversLocations.values()),
  );

  // 🛰️ Evento: Actualización de posición GPS del conductor
  socket.on("update_driver_location", (data) => {
    const {
      driverId,
      driverName,
      phone,
      vehicleType,
      lat,
      lng,
      isAvailable,
      heading,
    } = data;

    if (!driverId || lat === undefined || lng === undefined) return;

    if (isAvailable !== false) {
      const driverInfo = {
        driverId,
        driverName: driverName || "Motocarro Express",
        phone: phone || "",
        vehicleType: vehicleType || "motocarro",
        lat: Number(lat),
        lng: Number(lng),
        heading: heading ? Number(heading) : 0,
        socketId: socket.id,
        isAvailable: true,
        updatedAt: new Date(),
      };

      activeDriversLocations.set(driverId, driverInfo);

      // Difundir la posición a todos los mapas en vivo activos
      io.emit("driver_location_changed", driverInfo);
      io.emit(
        "drivers_online_list",
        Array.from(activeDriversLocations.values()),
      );
    } else {
      // Si se desactiva o toma carrera, se remueve del mapa público
      activeDriversLocations.delete(driverId);
      io.emit("driver_disconnected_location", { driverId });
      io.emit(
        "drivers_online_list",
        Array.from(activeDriversLocations.values()),
      );
    }
  });

  // 🎯 Notificación de Solicitud Directa al Motocarro Seleccionado en el Mapa
  socket.on("send_direct_order_request", (data) => {
    const { targetDriverId, order } = data;
    const targetDriver = activeDriversLocations.get(targetDriverId);

    if (targetDriver && targetDriver.socketId) {
      io.to(targetDriver.socketId).emit("direct_order_received", order);
    } else {
      // Si el conductor se desconectó, reenviar la orden al canal general
      io.emit("order:created", order);
    }
  });

  // Unirse a la sala única del pedido
  socket.on("join_order_chat", (orderId) => {
    if (!orderId) return;
    socket.join(orderId);
    socket.join(`order_${orderId}`);
    console.log(
      `📌 Socket ${socket.id} ingresó al canal del pedido: ${orderId}`,
    );
  });

  // Salir de la sala del pedido
  socket.on("leave_order_chat", (orderId) => {
    if (!orderId) return;
    socket.leave(orderId);
    socket.leave(`order_${orderId}`);
    console.log(
      `👋 Socket ${socket.id} salió del canal del pedido: ${orderId}`,
    );
  });

  // Evento: envío de mensajes de chat
  socket.on("send_message", async (data) => {
    try {
      const { orderId, senderRole, senderName, text } = data;

      if (!orderId || !text) return;

      const newMessage = new Message({
        orderId,
        senderRole,
        senderName,
        text,
      });
      await newMessage.save();

      io.to(orderId).to(`order_${orderId}`).emit("receive_message", newMessage);
    } catch (error) {
      console.error("Error al guardar/transmitir mensaje en WebSocket:", error);
    }
  });

  // Desconexión limpia del usuario/conductor
  socket.on("disconnect", () => {
    console.log(`❌ Usuario desconectado del WebSocket: ${socket.id}`);

    // Limpiar mapa si el socket pertenecía a un conductor
    for (const [driverId, info] of activeDriversLocations.entries()) {
      if (info.socketId === socket.id) {
        activeDriversLocations.delete(driverId);
        io.emit("driver_disconnected_location", { driverId });
        io.emit(
          "drivers_online_list",
          Array.from(activeDriversLocations.values()),
        );
        break;
      }
    }
  });
});

// Rutas de la API
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/orders", orderRoutes);

// 🌐 Ruta comodín para Single Page Application
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

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor con WebSockets y GPS activo en puerto ${PORT}`);
});
