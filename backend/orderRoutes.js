import express from "express";
import {
  createOrder,
  getAvailableOrders,
  getActiveDriverOrder,
  getOrderById,
  getOrderMessages,
  takeOrder,
  sendCounterOffer,
  respondCounterOffer,
  updateOrderStatus,
  updateDriverLocation,
  rateOrder,
  cancelOrder,
  // IMPORTANTE: Asegúrate de tener exportada esta función en tu orderController.js
  // completeOrder
} from "./orderController.js";

const router = express.Router();

/* ==========================================================================
   1. Rutas Estáticas y Específicas (Deben ir ANTES de las rutas con /:orderId)
   ========================================================================== */

// Crear un nuevo pedido / carrera
router.post("/", createOrder);

// Obtener pedidos disponibles para conductores
router.get("/available", getAvailableOrders);

// CORRECCIÓN: Ajustado para que coincida con el fetch del frontend: /orders/active/driver/${driverId}
router.get("/active/driver/:driverId", getActiveDriverOrder);

/* ==========================================================================
   2. Rutas Parametrizadas por Pedido (/:orderId/...)
   ========================================================================== */

// Obtener un pedido por ID (Mantiene actualizado el frontend/polling)
router.get("/:orderId", getOrderById);

// Obtener el historial de mensajes del chat de un pedido
router.get("/:orderId/messages", getOrderMessages);

// CORRECCIÓN: Ajustado a /accept para evitar el error 404 (Frontend hace POST a /accept)
router.post("/:orderId/accept", takeOrder);

// NUEVO: El frontend hace POST a /complete para verificar el PIN y finalizar.
// Asigna esto a tu controlador de finalización (ej: completeOrder o updateOrderStatus)
router.post("/:orderId/complete", updateOrderStatus);

// 🤝 CONTRAOFERTAS
router.post("/:orderId/counter-offer", sendCounterOffer);
// 👈 2. Nueva ruta para que el cliente Acepte o Rechace la propuesta
router.post("/:orderId/respond-counter", respondCounterOffer);
router.patch("/:orderId/respond-counter", respondCounterOffer);

// Enviar contraoferta al cliente (Motocarros / Domiciliarios)
router.post("/:orderId/counter-offer", sendCounterOffer);

// Actualizar ubicación GPS en tiempo real del mototaxista (Soporta PUT y PATCH)
router.put("/:orderId/location", updateDriverLocation);
router.patch("/:orderId/location", updateDriverLocation);

// Cancelar carrera / pedido (Resuelve la cancelación explícita)
router.patch("/:orderId/cancel", cancelOrder);

// Actualizar estado general del pedido (at_store, on_the_way, etc.)
router.patch("/:orderId/status", updateOrderStatus);

// Calificar la entrega / carrera
router.patch("/:orderId/rate", rateOrder);

export default router;
