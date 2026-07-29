import Store from "./Store.js";
import bcrypt from "bcrypt"; // 👈 Importante para encriptar y comparar contraseñas

// 1. OBTENER TIENDAS (Filtra por categoría y SOLO muestra las que están activas)
export const getStores = async (req, res) => {
  try {
    const { category } = req.query; // Captura el parámetro ?category= de la URL

    // 👈 Solo devolvemos tiendas activas al público general
    let filter = { status: "active" };

    if (category) {
      filter.category = category; // Si viene una categoría, filtramos por ella
    }

    const stores = await Store.find(filter);
    res.json(stores);
  } catch (error) {
    console.error("Error al obtener las tiendas:", error);
    res.status(500).json({ message: "Error al obtener los comercios." });
  }
};

// 2. CREAR TIENDA (Registro Público - Queda "pending" por defecto)
export const createStore = async (req, res) => {
  try {
    const { name, email, password, phone, category } = req.body;

    // Validación básica para evitar guardar documentos vacíos
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Nombre, correo y contraseña son obligatorios." });
    }

    // Verificar si el correo ya está registrado
    const existingStore = await Store.findOne({ email });
    if (existingStore) {
      return res
        .status(400)
        .json({ message: "Este correo electrónico ya está registrado." });
    }

    // Encriptar la contraseña (seguridad 10/10)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear la nueva tienda con estado PENDIENTE
    const newStore = new Store({
      name,
      email,
      password: hashedPassword,
      phone,
      category,
      status: "pending", // 👈 Por defecto queda bloqueada hasta que la apruebes
    });

    await newStore.save();

    // Devolvemos mensaje de éxito sin exponer la contraseña encriptada
    res.status(201).json({
      message:
        "¡Registro exitoso! Tu cuenta está en proceso de revisión y aprobación.",
    });
  } catch (error) {
    console.error("Error al crear el comercio:", error);
    res.status(500).json({ message: "Error al registrar el comercio." });
  }
};

// 3. INICIO DE SESIÓN DE LA TIENDA (Validando contraseña y estado activo)
export const loginStore = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Correo y contraseña son requeridos." });
    }

    // Buscar la tienda por correo en la BD
    const store = await Store.findOne({ email });
    if (!store) {
      return res
        .status(404)
        .json({ message: "El correo electrónico no está registrado." });
    }

    // 👈 Filtro de Seguridad: Evitar que inicien sesión si están pendientes o suspendidos
    if (store.status !== "active") {
      return res.status(403).json({
        message:
          "Tu cuenta aún está en proceso de aprobación o no se encuentra activa.",
      });
    }

    // Validar si la contraseña coincide con el hash de la BD
    const isMatch = await bcrypt.compare(password, store.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Contraseña incorrecta." });
    }

    // Login Exitoso: Devolvemos información segura de la tienda
    res.json({
      message: "¡Sesión iniciada con éxito!",
      store: {
        id: store._id,
        name: store.name,
        email: store.email,
        category: store.category,
      },
    });
  } catch (error) {
    console.error("Error en el login del comercio:", error);
    res.status(500).json({ message: "Error al procesar el inicio de sesión." });
  }
};
