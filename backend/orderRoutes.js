import express from "express";
import {
  createOrder,
  getAvailableOrders,
  getActiveDriverOrder,
  getOrderMessages,
  takeOrder,
  updateOrderStatus,
  rateOrder,
} from "./orderController.js";

const router = express.Router();

/* ==========================================================================
   1. Rutas Estáticas y Específicas (Deben ir primero)
   ========================================================================== */

// Crear un nuevo pedido (Desde el cliente al confirmar carrito)
router.post("/", createOrder);

// Obtener pedidos disponibles para repartidores (status === 'pending_driver')
router.get("/available", getAvailableOrders);

// Obtener la carrera activa que un repartidor tiene en curso
router.get("/driver/:driverId/active", getActiveDriverOrder);

/* ==========================================================================
   2. Rutas Parametrizadas por Pedido (/:orderId/...)
   ========================================================================== */

// Obtener el historial de mensajes de un pedido específico
router.get("/:orderId/messages", getOrderMessages);

// Tomar una carrera (Asignación atómica al primer domiciliario que la acepte)
router.post("/:orderId/take", takeOrder);

// Actualizar estado del pedido (at_store, on_the_way, completed, cancelled)
router.patch("/:orderId/status", updateOrderStatus);

// Calificar la entrega (1 a 5 estrellas + comentario)
router.patch("/:orderId/rate", rateOrder);

export default router;
