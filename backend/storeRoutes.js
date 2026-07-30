import express from "express";
import {
  getStores,
  getStoreById,
  createStore,
  loginStore,
} from "./storeController.js";

const router = express.Router();

// 1. Obtener comercios activos (Permite query: ?category=restaurante)
router.get("/", getStores);

// 2. Registro público de comercios (Pasa a estado 'pending')
router.post("/register", createStore);

// 3. Inicio de sesión del comercio
router.post("/login", loginStore);

// 4. Obtener detalle de un comercio por ID
router.get("/:id", getStoreById);

export default router;
