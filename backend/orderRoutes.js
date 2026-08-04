import express from "express";
import {
  createOrder,
  getAvailableOrders,
  getActiveDriverOrder,
  getOrderById,
  getOrderMessages,
  takeOrder,
  sendCounterOffer,
  updateOrderStatus,
  rateOrder,
} from "./orderController.js";

const router = express.Router();

/* ==========================================================================
   1. Rutas Estáticas y Específicas
   ========================================================================== */

// Crear un nuevo pedido
router.post("/", createOrder);

// Obtener pedidos disponibles
router.get("/available", getAvailableOrders);

// Obtener la carrera activa que un repartidor tiene en curso
router.get("/driver/:driverId/active", getActiveDriverOrder);

/* ==========================================================================
   2. Rutas Parametrizadas por Pedido (/:orderId/...)
   ========================================================================== */
// Obtener un pedido por ID (Mantiene actualizado el frontend/polling)
router.get("/:orderId", getOrderById); // 👈 Agregar esta línea

// Obtener el historial de mensajes de un pedido
router.get("/:orderId/messages", getOrderMessages);

// Tomar una carrera
router.post("/:orderId/take", takeOrder);

// Enviar contraoferta al cliente (Motocarros)
router.post("/:orderId/counter-offer", sendCounterOffer);

// Actualizar estado del pedido (at_store, on_the_way, completed, cancelled)
router.patch("/:orderId/status", updateOrderStatus);

// Calificar la entrega
router.patch("/:orderId/rate", rateOrder);

export default router;
