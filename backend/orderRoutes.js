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

// 1. Crear un pedido (Cliente confirma carrito)
router.post("/", createOrder);

// 2. Obtener pedidos disponibles para domiciliarios (status === 'pending_driver')
router.get("/available", getAvailableOrders);

// 3. sala de mensaje por pedido
router.get("/:orderId/messages", getOrderMessages);

// 3. Tomar una carrera (Primer domiciliario que da clic)
router.post("/:orderId/take", takeOrder);

// 4. Actualizar estado del pedido (at_store, on_the_way, completed)
router.patch("/:orderId/status", updateOrderStatus);

// 5. Calificar la entrega (1 a 5 estrellas)
router.post("/:orderId/rate", rateOrder);

// 6. Obtener la carrera activa que el repartidor tiene en curso
router.get("/driver/:driverId/active", getActiveDriverOrder);

export default router;
