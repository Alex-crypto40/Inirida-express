import express from "express";
// Importamos las funciones correctas del controlador
import { getStores, createStore, loginStore } from "./storeController.js";

const router = express.Router();

// 1. Obtener comercios (con filtros)
router.get("/", getStores);

// 2. Registro público de comercios (Cambiado registerStore por createStore)
router.post("/register", createStore);

// 3. Inicio de sesión del comercio
router.post("/login", loginStore);

export default router;
