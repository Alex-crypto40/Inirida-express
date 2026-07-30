import express from "express";
import {
  registerDriver,
  loginDriver,
  toggleOnlineStatus,
  getDriverProfile,
} from "./driverController.js";

const router = express.Router();

/* ==========================================================================
   1. Autenticación y Registro
   ========================================================================== */

// Registro público de nuevos domiciliarios
router.post("/register", registerDriver);

// Inicio de sesión
router.post("/login", loginDriver);

/* ==========================================================================
   2. Gestión de Estado y Perfil
   ========================================================================== */

// Obtener perfil del repartidor
router.get("/:id", getDriverProfile);

// Cambiar disponibilidad (En línea 🟢 / Desconectado 🔴)
router.patch("/:id/online", toggleOnlineStatus);

export default router;
