import express from "express";
import {
  createOrder,
  getAvailableOrders,
  getActiveDriverOrder,
  getCustomerOrders,
  getOrderById,
  getOrderMessages,
  createMessage,
  takeOrder,
  updateOrderStatus,
  updateDriverLocation,
  rateOrder,
  cancelOrder,
  sendCounterOffer,
  respondCounterOffer,
} from "./controllers/index.js";

const router = express.Router();

/* ==========================================================================
   1. Rutas Estáticas y Específicas (DEBEN ir ANTES de /:orderId)
   ========================================================================== */

// Crear un nuevo pedido / carrera
router.post("/", createOrder);

// Obtener carreras disponibles para conductores
router.get("/available", getAvailableOrders);

// Obtener carrera activa del conductor (Soporta ambas estructuras de URL)
router.get("/driver-active/:driverId", getActiveDriverOrder);
router.get("/active/driver/:driverId", getActiveDriverOrder);

// Obtener historial de pedidos/carreras de un cliente
router.get("/customer/:customerId", getCustomerOrders);

// Aceptar / tomar carrera por el conductor
router.post("/take/:orderId", takeOrder);

/* ==========================================================================
   2. Rutas Parametrizadas por Pedido (/:orderId/...)
   ========================================================================== */

// Aceptar carrera directamente por el conductor (Alias para /take/:orderId)
router.post("/:orderId/accept", takeOrder);

// Obtener un pedido por ID (Polling / Detalles)
router.get("/:orderId", getOrderById);

// Historial y envío de mensajes del chat (HTTP REST Fallback + Polling)
router.get("/:orderId/messages", getOrderMessages);
router.post("/:orderId/messages", createMessage);

// Enviar y responder contraofertas de precio
router.post("/:orderId/counter-offer", sendCounterOffer);
router.post("/:orderId/respond-counter-offer", respondCounterOffer);

// Finalizar / Completar carrera (soporta PIN o cambio de estado)
router.post("/:orderId/complete", updateOrderStatus);

// Actualización de ubicación GPS del conductor en tiempo real
router.put("/:orderId/location", updateDriverLocation);
router.patch("/:orderId/location", updateDriverLocation);

// Cancelar carrera / pedido
router.patch("/:orderId/cancel", cancelOrder);

// Actualizar estado general de la carrera (on_the_way, completed, etc.)
router.patch("/:orderId/status", updateOrderStatus);

// Calificar el servicio
router.patch("/:orderId/rate", rateOrder);

export default router;
