import express from "express";

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

    // Mensaje claro que el cliente enviará a tu WhatsApp
    const clientName = name ? ` (${name})` : "";
    const rawMessage = `Hola Inírida Express 🛵, quiero activar mi cuenta para hacer pedidos desde la app. Mi número es: +57${cleanPhone}${clientName}`;
    const encodedMessage = encodeURIComponent(rawMessage);

    // URL directa de WhatsApp
    const whatsappUrl = `https://wa.me/57${BUSINESS_PHONE}?text=${encodedMessage}`;

    return res.json({
      success: true,
      whatsappUrl,
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
