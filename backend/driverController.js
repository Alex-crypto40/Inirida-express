import Driver from "./Driver.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "secreto_desarrollo_cambiar_en_prod";

// Generar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
};

// 1. Registro de Domiciliarios
export const registerDriver = async (req, res) => {
  try {
    const { name, phone, email, password, vehicleType, vehiclePlate } =
      req.body;

    // Validación de campos requeridos
    if (
      !name?.trim() ||
      !phone?.trim() ||
      !email?.trim() ||
      !password?.trim()
    ) {
      return res
        .status(400)
        .json({ message: "Todos los campos marcados son obligatorios." });
    }

    const selectedVehicle = vehicleType || "moto";
    const plateValue = vehiclePlate ? vehiclePlate.trim().toUpperCase() : "";

    if (selectedVehicle !== "bicicleta" && !plateValue) {
      return res.status(400).json({
        message: "La placa es obligatoria para motos y motocarros.",
      });
    }

    const existingDriver = await Driver.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingDriver) {
      return res.status(400).json({ message: "El correo ya está registrado." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newDriver = new Driver({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password: hashedPassword,
      vehicleType: selectedVehicle,
      vehiclePlate:
        selectedVehicle === "bicicleta" && !plateValue ? "N/A" : plateValue,
      status: "pending",
    });

    await newDriver.save();

    res.status(201).json({
      message: "Registro exitoso. Tu cuenta está pendiente de aprobación.",
      driver: {
        id: newDriver._id,
        name: newDriver.name,
        email: newDriver.email,
        status: newDriver.status,
      },
    });
  } catch (error) {
    console.error("Error al registrar repartidor:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// 2. Login de Domiciliarios
export const loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Correo y contraseña son requeridos." });
    }

    // Incluimos explícitamente la contraseña que fue excluida en el modelo
    const driver = await Driver.findOne({
      email: email.toLowerCase().trim(),
    }).select("+password");

    if (!driver) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const isPasswordValid = await bcrypt.compare(password, driver.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Contraseña incorrecta." });
    }

    if (driver.status !== "active") {
      return res.status(403).json({
        message: "Tu cuenta aún no está activa. Contacta al administrador.",
      });
    }

    const token = generateToken(driver._id);

    res.json({
      message: "Inicio de sesión exitoso.",
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        vehiclePlate: driver.vehiclePlate, // 👈 Incluido para sincronización con frontend
        isOnline: driver.isOnline,
        rating: driver.rating,
        completedDeliveries: driver.completedDeliveries || 0,
      },
    });
  } catch (error) {
    console.error("Error en login de repartidor:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// 3. Cambiar disponibilidad (En línea / Desconectado)
export const toggleOnlineStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isOnline } = req.body;

    if (typeof isOnline !== "boolean") {
      return res
        .status(400)
        .json({ message: "El valor de disponibilidad debe ser booleano." });
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { isOnline },
      { new: true, runValidators: true },
    );

    if (!updatedDriver) {
      return res.status(404).json({ message: "Repartidor no encontrado." });
    }

    res.json({
      message: `Estado actualizado a ${isOnline ? "En línea 🟢" : "Desconectado 🔴"}`,
      isOnline: updatedDriver.isOnline,
    });
  } catch (error) {
    console.error("Error al cambiar disponibilidad:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// 4. Obtener perfil del repartidor
export const getDriverProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findById(id).select("-password");

    if (!driver) {
      return res.status(404).json({ message: "Repartidor no encontrado." });
    }

    res.json(driver);
  } catch (error) {
    console.error("Error al obtener perfil del repartidor:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};
