import express from "express";
import User from "./User.js"; // Importamos el modelo User por si deseas guardar/actualizar el registro

const router = express.Router();

// NÚMERO DEL NEGOCIO QUE RECIBIRÁ LA NOTIFICACIÓN DE ACTIVACIÓN
const BUSINESS_PHONE = process.env.BUSINESS_PHONE || "3143077813";

// POST /api/auth/send-pin
router.post("/send-pin", async (req, res) => {
  try {
    const { phone, name } = req.body;
    const cleanPhone = phone ? phone.trim().replace(/\D/g, "") : "";

    if (!cleanPhone || cleanPhone.length < 10) {
      return res
        .status(400)
        .json({ success: false, message: "Número de celular inválido." });
    }

    // 1. Opcional: Buscar o registrar el usuario en MongoDB si utilizas el modelo User
    let user = null;
    try {
      user = await User.findOneAndUpdate(
        { phone: cleanPhone },
        { phone: cleanPhone, name: name || "Cliente" },
        { upsert: true, new: true },
      );
    } catch (dbError) {
      console.warn(
        "⚠️ No se pudo persistir en BD User (opcional):",
        dbError.message,
      );
    }

    // 2. Construir mensaje de WhatsApp
    const clientName = name ? ` (${name})` : "";
    const rawMessage = `Hola Inírida Express 🛵, quiero activar mi cuenta para hacer pedidos desde la app. Mi número es: +57${cleanPhone}${clientName}`;
    const encodedMessage = encodeURIComponent(rawMessage);

    // 3. URL directa de WhatsApp
    const whatsappUrl = `https://wa.me/57${BUSINESS_PHONE}?text=${encodedMessage}`;

    // 4. Retornar el teléfono estructurado y el usuario para que el frontend lo guarde
    return res.json({
      success: true,
      whatsappUrl,
      phone: cleanPhone,
      user: user || { phone: cleanPhone, name: name || "Cliente" },
      message: "Redirigiendo a WhatsApp...",
    });
  } catch (error) {
    console.error("Error en send-pin:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error interno del servidor." });
  }
});

export default router;
