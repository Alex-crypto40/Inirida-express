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

// Cambiar disponibilidad (Ruta principal /status)
router.patch("/:id/status", toggleOnlineStatus);
router.put("/:id/status", toggleOnlineStatus);

// Alias /online por compatibilidad
router.patch("/:id/online", toggleOnlineStatus);
router.put("/:id/online", toggleOnlineStatus);

export default router;
