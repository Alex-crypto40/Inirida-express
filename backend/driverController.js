import Driver from "./Driver.js";
import bcrypt from "bcrypt";

// 1. Registro de Domiciliarios
export const registerDriver = async (req, res) => {
  try {
    const { name, phone, email, password, vehicleType, vehiclePlate } =
      req.body;

    // --- VALIDACIÓN DE CAMPOS REQUERIDOS ---
    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ message: "El nombre completo es obligatorio." });
    }
    if (!phone || !phone.trim()) {
      return res
        .status(400)
        .json({ message: "El número de teléfono es obligatorio." });
    }
    if (!email || !email.trim()) {
      return res
        .status(400)
        .json({ message: "El correo electrónico es obligatorio." });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ message: "La contraseña es obligatoria." });
    }

    // Validar placa obligatoria para vehículos con motor
    const selectedVehicle = vehicleType || "moto";
    const plateValue = vehiclePlate ? vehiclePlate.trim().toUpperCase() : "";

    if (selectedVehicle !== "bicicleta" && !plateValue) {
      return res.status(400).json({
        message: "La placa es obligatoria para motos y motocarros.",
      });
    }

    // Verificar si ya existe un repartidor con ese correo
    const existingDriver = await Driver.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingDriver) {
      return res.status(400).json({ message: "El correo ya está registrado." });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const newDriver = new Driver({
      name: name.trim(),
      phone: phone.trim(),
      email: email.toLowerCase().trim(),
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

    const driver = await Driver.findOne({ email: email.toLowerCase().trim() });
    if (!driver) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, driver.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Contraseña incorrecta." });
    }

    // Verificar si está activo
    if (driver.status !== "active") {
      return res.status(403).json({
        message: "Tu cuenta aún no está activa. Contacta al administrador.",
      });
    }

    res.json({
      message: "Inicio de sesión exitoso.",
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        isOnline: driver.isOnline,
        rating: driver.rating,
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

    const updatedDriver = await Driver.findByIdAndUpdate(
      id,
      { isOnline },
      { new: true },
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
