import Order from "./Order.js";
import Message from "./Message.js";

// 1. Crear un nuevo pedido (Desde el frontend cuando el cliente confirma)
export const createOrder = async (req, res) => {
  try {
    const {
      store,
      customer,
      items,
      isMandado,
      mandadoDetail,
      subtotal,
      deliveryFee,
      total,
    } = req.body;

    const newOrder = new Order({
      store,
      customer,
      items,
      isMandado: isMandado || false,
      mandadoDetail: mandadoDetail || "",
      subtotal,
      deliveryFee: deliveryFee || 4000,
      total,
      status: "pending_driver", // Nace libre para cualquier repartidor
    });

    await newOrder.save();

    res.status(201).json({
      message: "Pedido creado exitosamente 🚀",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error al crear pedido:", error);
    res.status(500).json({ message: "Error interno al procesar el pedido." });
  }
};

// 2. Obtener pedidos disponibles para los domiciliarios (status === 'pending_driver')
export const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending_driver" })
      .populate("store", "name address phone") // Muestra datos del comercio
      .sort({ createdAt: -1 }); // Los más recientes primero

    res.json(orders);
  } catch (error) {
    console.error("Error al obtener pedidos disponibles:", error);
    res.status(500).json({ message: "Error al cargar la lista de pedidos." });
  }
};

// Obtener el historial de chat de un pedido específico
export const getOrderMessages = async (req, res) => {
  try {
    const { orderId } = req.params;
    const messages = await Message.find({ orderId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    res.status(500).json({ message: "Error al cargar el historial del chat." });
  }
};

// 3. Tomar una carrera (Primer domiciliario que da clic se la queda ⚡)
export const takeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;

    // Se busca la orden ÚNICAMENTE si sigue en 'pending_driver'
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: "pending_driver" },
      {
        driver: driverId,
        status: "assigned",
      },
      { new: true },
    );

    if (!order) {
      return res.status(409).json({
        message:
          "¡Lástima! Este pedido ya fue aceptado por otro domiciliario 🛵💨",
      });
    }

    res.json({
      message: "¡Felicidades! Has tomado la carrera.",
      order,
    });
  } catch (error) {
    console.error("Error al tomar pedido:", error);
    res
      .status(500)
      .json({ message: "Error al procesar la asignación del pedido." });
  }
};
// 4. Actualizar estado del pedido por el domiciliario (at_store, on_the_way, completed)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    // 1. Recibimos también el campo "pin" desde el frontend
    const { status, driverId, pin } = req.body;

    // Validar que el estado sea válido
    const validStatuses = ["at_store", "on_the_way", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Estado de pedido no válido." });
    }

    // Verificar que la orden pertenezca al repartidor que intenta cambiar el estado
    const order = await Order.findOne({ _id: orderId, driver: driverId });

    if (!order) {
      return res.status(404).json({
        message: "Pedido no encontrado o no asignado a este repartidor.",
      });
    }

    // 🔒 2. VALIDACIÓN DEL PIN DE ENTREGA
    if (status === "completed") {
      if (!pin) {
        return res.status(400).json({
          message:
            "Debes ingresar el PIN de entrega proporcionado por el cliente.",
        });
      }

      if (order.deliveryPin !== pin.toString().trim()) {
        return res.status(400).json({
          message:
            "❌ PIN incorrecto. Pídele al cliente el código que aparece en su pantalla.",
        });
      }
    }

    order.status = status;
    await order.save();

    res.json({
      message:
        status === "completed"
          ? "¡Entrega verificada con éxito mediante PIN! 🏁"
          : `Estado de la orden actualizado a: ${status}`,
      order,
    });
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error);
    res.status(500).json({ message: "Error al actualizar el pedido." });
  }
};

// 5. Calificar el servicio del domicilio (De 1 a 5 estrellas)
export const rateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, ratingComment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Por favor asigna una calificación entre 1 y 5 estrellas.",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Pedido no encontrado." });
    }

    order.rating = rating;
    order.ratingComment = ratingComment || "";
    await order.save();

    res.json({ message: "¡Gracias por tu calificación! ⭐", order });
  } catch (error) {
    console.error("Error al calificar pedido:", error);
    res
      .status(500)
      .json({ message: "Error interno al guardar la calificación." });
  }
};
// 6. Obtener la carrera activa de un domiciliario en curso
export const getActiveDriverOrder = async (req, res) => {
  try {
    const { driverId } = req.params;

    const activeOrder = await Order.findOne({
      driver: driverId,
      status: { $in: ["assigned", "at_store", "on_the_way"] },
    }).populate("store", "name address phone");

    res.json({ activeOrder: activeOrder || null });
  } catch (error) {
    console.error("Error al obtener la carrera activa:", error);
    res.status(500).json({ message: "Error al consultar la carrera activa." });
  }
};
