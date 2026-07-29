import express from "express";
import {
  registerDriver,
  loginDriver,
  toggleOnlineStatus,
} from "./driverController.js";

const router = express.Router();

// 1. Registro público de domiciliarios
router.post("/register", registerDriver);

// 2. Inicio de sesión de domiciliarios
router.post("/login", loginDriver);

// 3. Cambiar disponibilidad (En línea 🟢 / Desconectado 🔴)
router.patch("/:id/online", toggleOnlineStatus);

export default router;
