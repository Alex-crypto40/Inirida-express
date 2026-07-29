import Product from "./Product.js"; // Asegúrate de que la ruta a tu modelo sea correcta (.js incluido)

// 1. OBTENER PRODUCTOS (Filtrados por Comercio)
export const getProducts = async (req, res) => {
  try {
    const { storeId } = req.query;

    // Si el frontend envía un storeId, filtramos por esa tienda.
    // Si no lo envía, por seguridad o por si acaso, traemos todos.
    const filter = storeId ? { storeId } : {};

    const products = await Product.find(filter);

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener los productos",
      error: error.message,
    });
  }
};

// 2. CREAR UN NUEVO PRODUCTO (Desde el Panel de Administración)
export const createProduct = async (req, res) => {
  try {
    const { name, price, description, image, category, storeId } = req.body;

    // Validación básica para asegurar que no se guarde basura
    if (!name || !price || !storeId) {
      return res.status(400).json({
        message: "El nombre, el precio y el ID del comercio son obligatorios.",
      });
    }

    const newProduct = new Product({
      name,
      price: Number(price), // Nos aseguramos de guardarlo como número
      description,
      image,
      category: category || "Todos",
      storeId,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      message: "¡Producto creado con éxito!",
      product: savedProduct,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al guardar el producto",
      error: error.message,
    });
  }
};
