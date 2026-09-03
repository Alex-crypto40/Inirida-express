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
import connectDB from "./backend/db.js";
import storeRoutes from "./backend/storeRoutes.js";
import productRoutes from "./backend/productRoutes.js";
import driverRoutes from "./backend/driverRoutes.js";
import orderRoutes from "./backend/orderRoutes.js";
import Message from "./backend/Message.js";
import authRoutes from "./backend/authRoutes.js";

const app = express();

// 🔒 Configuración de CORS permitiendo orígenes explícitos y dinámicos
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
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith(".onrender.com")
    ) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middlewares Globales
app.use(cors(corsOptions));
app.use(express.json());

// 🛠️ 4. Creación del servidor HTTP wrapper para WebSockets
const server = http.createServer(app);

// Configuración de Socket.io adaptada a redes inestables
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 90000,
  pingInterval: 25000,
  connectTimeout: 45000,
});

// 🔑 Inyectamos 'io' en Express
app.set("io", io);

// 📍 Memoria en servidor para mantener la última ubicación de los conductores activos
const activeDriversLocations = new Map();

// 🔌 5. Lógica de comunicación en tiempo real
io.on("connection", (socket) => {
  console.log(`⚡ Usuario conectado al WebSocket: ${socket.id}`);

  // Registro explícito del conductor para reconexión instantánea
  socket.on("register_driver", (driverId) => {
    if (!driverId) return;
    const existing = activeDriversLocations.get(driverId);
    if (existing) {
      existing.socketId = socket.id;
      existing.updatedAt = new Date();
      activeDriversLocations.set(driverId, existing);
    }
  });

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
      vehiclePlate,
      plate,
      lat,
      lng,
      isAvailable,
      heading,
      speed,
    } = data;

    if (!driverId || lat === undefined || lng === undefined) return;

    if (isAvailable !== false) {
      const driverInfo = {
        driverId,
        driverName: driverName || "Motocarro Express",
        phone: phone || "",
        vehicleType: vehicleType || "motocarro",
        vehiclePlate: vehiclePlate || plate || "",
        lat: Number(lat),
        lng: Number(lng),
        heading: heading ? Number(heading) : 0,
        speed: speed ? Number(speed) : 0,
        socketId: socket.id,
        isAvailable: true,
        updatedAt: new Date(),
      };

      activeDriversLocations.set(driverId, driverInfo);

      io.emit("driver_location_changed", driverInfo);
      io.emit("driver_location_updated", driverInfo);
      io.emit(
        "drivers_online_list",
        Array.from(activeDriversLocations.values()),
      );
    } else {
      activeDriversLocations.delete(driverId);
      io.emit("driver_disconnected_location", { driverId });
      io.emit(
        "drivers_online_list",
        Array.from(activeDriversLocations.values()),
      );
    }
  });

  // 🎯 Notificación de Solicitud Directa al Motocarro Seleccionado
  socket.on("send_direct_order_request", (data) => {
    const { targetDriverId, order } = data;
    const targetDriver = activeDriversLocations.get(targetDriverId);

    if (targetDriver && targetDriver.socketId) {
      io.to(targetDriver.socketId).emit("direct_order_received", order);
    } else {
      io.emit("order:created", order);
    }
  });

  // 🔄 Transmisión de cambios de estado globales de órdenes
  socket.on("update_order_status_global", (updatedOrder) => {
    if (!updatedOrder) return;
    io.emit("order_status_updated", updatedOrder);
    io.emit("orderUpdated", updatedOrder);
    if (updatedOrder._id) {
      io.to(`order_${updatedOrder._id}`).emit(
        "order:status_updated",
        updatedOrder,
      );
    }
  });

  // 🟢 Unirse a la sala única del pedido
  const joinOrderRoomHandler = (orderId) => {
    if (!orderId) return;
    const cleanId = String(orderId).replace(/^order_/, "");

    if (!socket.rooms.has(cleanId)) {
      socket.join(cleanId);
      socket.join(`order_${cleanId}`);
      console.log(
        `📌 Socket ${socket.id} ingresó al canal del pedido: ${cleanId}`,
      );
    }
  };

  socket.on("join_order", joinOrderRoomHandler);
  socket.on("join", joinOrderRoomHandler);

  // 🟢 Salir de la sala del pedido
  const leaveOrderRoomHandler = (orderId) => {
    if (!orderId) return;
    const cleanId = String(orderId).replace(/^order_/, "");
    socket.leave(cleanId);
    socket.leave(`order_${cleanId}`);
    console.log(
      `👋 Socket ${socket.id} salió del canal del pedido: ${cleanId}`,
    );
  };

  socket.on("leave_order", leaveOrderRoomHandler);
  socket.on("leave_order_chat", leaveOrderRoomHandler);

  // 🟢 Evento: envío de mensajes de chat
  const handleSendMessage = async (data) => {
    try {
      const {
        orderId,
        text,
        senderRole,
        senderName,
        senderType,
        senderId,
        senderPhone,
      } = data;

      if (!orderId || !text) return;

      const cleanOrderId = String(orderId).replace(/^order_/, "");
      const role = senderRole || senderType || "user";
      const name = senderName || (role === "driver" ? "Conductor" : "Cliente");

      const newMessage = new Message({
        orderId: cleanOrderId,
        senderRole: role,
        senderName: name,
        senderPhone: senderPhone || "",
        senderId,
        text,
      });
      await newMessage.save();

      io.to(cleanOrderId)
        .to(`order_${cleanOrderId}`)
        .emit("receive_message", newMessage);

      io.to(cleanOrderId)
        .to(`order_${cleanOrderId}`)
        .emit("newMessage", newMessage);

      io.to(cleanOrderId)
        .to(`order_${cleanOrderId}`)
        .emit("new_chat_message", newMessage);
    } catch (error) {
      console.error("Error al guardar/transmitir mensaje en WebSocket:", error);
    }
  };

  socket.on("send_message", handleSendMessage);
  socket.on("send_chat_message", handleSendMessage);

  // Desconexión con tolerancia a redes móviles
  socket.on("disconnect", () => {
    console.log(`❌ Usuario desconectado del WebSocket: ${socket.id}`);

    setTimeout(() => {
      for (const [driverId, info] of activeDriversLocations.entries()) {
        if (info.socketId === socket.id) {
          const timeDiff = new Date() - new Date(info.updatedAt);
          if (timeDiff >= 15000) {
            activeDriversLocations.delete(driverId);
            io.emit("driver_disconnected_location", { driverId });
            io.emit(
              "drivers_online_list",
              Array.from(activeDriversLocations.values()),
            );
          }
          break;
        }
      }
    }, 15000);
  });
});

/* ==========================================================================
   6. Rutas de la API (DEBEN IR ANTES DE LOS ARCHIVOS ESTÁTICOS)
   ========================================================================== */
app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/products", productRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/orders", orderRoutes);

/* ==========================================================================
   7. Servir Frontend y SPA Fallback
   ========================================================================== */
const distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.get(/^(?!\/socket\.io\/).*/, (req, res) => {
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

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor con WebSockets y GPS activo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Fallo crítico al iniciar el servidor:", error);
  }
};

startServer();
