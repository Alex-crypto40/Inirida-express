import Store from "./Store.js";
import bcrypt from "bcrypt";

// 1. OBTENER TIENDAS (Filtra por categoría y SOLO muestra las activas)
export const getStores = async (req, res) => {
  try {
    const { category } = req.query;

    let filter = { status: "active" };

    if (category) {
      filter.category = category.toLowerCase().trim();
    }

    // Excluimos la contraseña en las consultas públicas
    const stores = await Store.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(stores);
  } catch (error) {
    console.error("Error al obtener las tiendas:", error);
    res.status(500).json({ message: "Error al obtener los comercios." });
  }
};

// 2. OBTENER UNA TIENDA POR ID (Para cargar su perfil/menú en el frontend)
export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await Store.findById(id).select("-password");

    if (!store) {
      return res.status(404).json({ message: "Comercio no encontrado." });
    }

    res.json(store);
  } catch (error) {
    console.error("Error al obtener la tienda por ID:", error);
    res
      .status(500)
      .json({ message: "Error al consultar la información de la tienda." });
  }
};

// 3. CREAR TIENDA (Registro Público -> Estado "pending")
export const createStore = async (req, res) => {
  try {
    const { name, email, password, phone, category, image, whatsappNumber } =
      req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Nombre, correo y contraseña son obligatorios.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verificar si el correo ya está registrado
    const existingStore = await Store.findOne({ email: cleanEmail });
    if (existingStore) {
      return res.status(400).json({
        message: "Este correo electrónico ya está registrado.",
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStore = new Store({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : "",
      whatsappNumber: whatsappNumber ? whatsappNumber.trim() : "",
      category: category ? category.toLowerCase().trim() : "restaurante",
      image: image || "",
      status: "pending",
    });

    await newStore.save();

    res.status(201).json({
      message:
        "¡Registro exitoso! Tu cuenta está en proceso de revisión y aprobación.",
    });
  } catch (error) {
    console.error("Error al crear el comercio:", error);
    res.status(500).json({ message: "Error al registrar el comercio." });
  }
};

// 4. INICIO DE SESIÓN DE LA TIENDA
export const loginStore = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Correo y contraseña son requeridos.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const store = await Store.findOne({ email: cleanEmail });
    if (!store) {
      return res.status(404).json({
        message: "El correo electrónico no está registrado.",
      });
    }

    if (store.status !== "active") {
      return res.status(403).json({
        message:
          "Tu cuenta aún está en proceso de aprobación o no se encuentra activa.",
      });
    }

    const isMatch = await bcrypt.compare(password, store.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Contraseña incorrecta." });
    }

    res.json({
      message: "¡Sesión iniciada con éxito!",
      store: {
        id: store._id,
        name: store.name,
        email: store.email,
        category: store.category,
        image: store.image,
        isOpen: store.isOpen,
      },
    });
  } catch (error) {
    console.error("Error en el login del comercio:", error);
    res.status(500).json({ message: "Error al procesar el inicio de sesión." });
  }
};
