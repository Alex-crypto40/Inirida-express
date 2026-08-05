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
  updateDriverLocation,
  rateOrder,
  cancelOrder,
} from "./orderController.js";

const router = express.Router();

/* ==========================================================================
   1. Rutas Estáticas y Específicas (Deben ir ANTES de las rutas con /:orderId)
   ========================================================================== */

// Crear un nuevo pedido / carrera
router.post("/", createOrder);

// Obtener pedidos disponibles para conductores
router.get("/available", getAvailableOrders);

// Obtener la carrera activa que un repartidor tiene en curso
router.get("/driver/:driverId/active", getActiveDriverOrder);

/* ==========================================================================
   2. Rutas Parametrizadas por Pedido (/:orderId/...)
   ========================================================================== */

// Obtener un pedido por ID (Mantiene actualizado el frontend/polling)
router.get("/:orderId", getOrderById);

// Obtener el historial de mensajes del chat de un pedido
router.get("/:orderId/messages", getOrderMessages);

// Tomar una carrera o domicilio
router.post("/:orderId/take", takeOrder);

// Enviar contraoferta al cliente (Motocarros / Domiciliarios)
router.post("/:orderId/counter-offer", sendCounterOffer);

// Actualizar ubicación GPS en tiempo real del mototaxista (Soporta PUT y PATCH)
router.put("/:orderId/location", updateDriverLocation);
router.patch("/:orderId/location", updateDriverLocation);

// Cancelar carrera / pedido (Resuelve la cancelación explícita)
router.patch("/:orderId/cancel", cancelOrder);

// Actualizar estado del pedido (at_store, on_the_way, completed, cancelled)
router.patch("/:orderId/status", updateOrderStatus);

// Calificar la entrega / carrera
router.patch("/:orderId/rate", rateOrder);

export default router;