import express from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./productController.js";

const router = express.Router();

// Consultar lista de productos (Soporta query string ?storeId=xxx&category=xxx)
router.get("/", getProducts);

// Crear un producto
router.post("/", createProduct);

// Actualizar un producto existente
router.put("/:id", updateProduct);

// Eliminar un producto
router.delete("/:id", deleteProduct);

export default router;
