import Product from "./Product.js";

// 1. OBTENER PRODUCTOS (Filtrados por Comercio y/o Categoría)
export const getProducts = async (req, res) => {
  try {
    const { storeId, category } = req.query;

    const filter = {};
    if (storeId) filter.storeId = storeId;
    if (category && category !== "Todos") filter.category = category;

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({
      message: "Error interno al obtener los productos del catálogo.",
    });
  }
};

// 2. CREAR UN NUEVO PRODUCTO
export const createProduct = async (req, res) => {
  try {
    const { name, price, description, image, category, storeId } = req.body;

    if (!name || price === undefined || !storeId) {
      return res.status(400).json({
        message: "El nombre, el precio y el ID del comercio son obligatorios.",
      });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        message: "El precio debe ser un número válido mayor o igual a 0.",
      });
    }

    const newProduct = new Product({
      name: name.trim(),
      price: numericPrice,
      description: description ? description.trim() : "",
      image: image || "",
      category: category ? category.trim() : "General",
      storeId,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      message: "¡Producto creado con éxito!",
      product: savedProduct,
    });
  } catch (error) {
    console.error("Error al guardar el producto:", error);
    res.status(500).json({ message: "Error interno al guardar el producto." });
  }
};

// 3. ACTUALIZAR PRODUCTO (Soporta PUT y PATCH para cambio de precio o disponibilidad)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.price !== undefined) {
      updateData.price = Number(updateData.price);
      if (isNaN(updateData.price) || updateData.price < 0) {
        return res.status(400).json({ message: "Precio inválido." });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    res.json({
      message: "Producto actualizado correctamente.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ message: "Error al actualizar el producto." });
  }
};

// 4. ELIMINAR PRODUCTO
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    res.json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ message: "Error al eliminar el producto." });
  }
};
