import Order from "./Order.js";
import Message from "./Message.js";

// Helper para generar PIN seguro de 4 dígitos
const generateDeliveryPin = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

// 1. Crear un nuevo pedido / carrera
export const createOrder = async (req, res) => {
  try {
    const {
      serviceType, // "delivery", "mandado", "ride"
      store,
      customer,
      rideDetails, // 👈 Pasajeros, maletas, mascotas
      items,
      isMandado,
      mandadoDetail,
      subtotal,
      deliveryFee,
      total,
    } = req.body;

    // Generar PIN de confirmación para el cliente
    const deliveryPin = generateDeliveryPin();

    const newOrder = new Order({
      serviceType: serviceType || "delivery",
      store: store || null,
      customer: customer || req.user?._id, // Preferir id del token autenticado
      rideDetails: serviceType === "ride" ? rideDetails : undefined, // Guardar solo si es tipo carrera
      items: items || [],
      isMandado: isMandado || false,
      mandadoDetail: mandadoDetail || "",
      subtotal: subtotal || 0,
      deliveryFee: deliveryFee || 4000,
      total: total || 0,
      deliveryPin,
      status: "pending_driver",
    });

    await newOrder.save();

    // Poblar datos de la tienda si aplica
    const populatedOrder = await Order.findById(newOrder._id).populate(
      "store",
      "name address phone",
    );

    // 🔴 Socket.io: Notificar a todos los repartidores sobre la nueva solicitud
    const io = req.app.get("io");
    if (io) {
      io.emit("order:created", populatedOrder);
    }

    res.status(201).json({
      message: "Solicitud creada exitosamente 🚀",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Error al crear pedido/carrera:", error);
    res
      .status(500)
      .json({ message: "Error interno al procesar la solicitud." });
  }
};

// 2. Obtener pedidos y carreras disponibles para domiciliarios
export const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending_driver" })
      .populate("store", "name address phone")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Error al obtener pedidos disponibles:", error);
    res
      .status(500)
      .json({ message: "Error al cargar la lista de solicitudes." });
  }
};

// 3. Obtener el historial de chat de un pedido
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

// 4. Tomar una carrera (Primer domiciliario que da clic se la queda)
export const takeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?._id || req.body.driverId;

    if (!driverId) {
      return res.status(401).json({ message: "Repartidor no autenticado." });
    }

    // Prevenir que un repartidor tome múltiples carreras activas
    const activeOrder = await Order.findOne({
      driver: driverId,
      status: { $in: ["assigned", "at_store", "on_the_way"] },
    });

    if (activeOrder) {
      return res.status(400).json({
        message:
          "Ya tienes una carrera activa. Complétala antes de tomar otra.",
      });
    }

    // Asignación atómica (evita condiciones de carrera entre conductores)
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: "pending_driver" },
      { driver: driverId, status: "assigned" },
      { new: true },
    ).populate("store", "name address phone");

    if (!order) {
      return res.status(409).json({
        message:
          "¡Lástima! Esta solicitud ya fue aceptada por otro domiciliario 🛵💨",
      });
    }

    // 🔴 Socket.io: Remover el pedido del pool global y avisar al cliente
    const io = req.app.get("io");
    if (io) {
      io.emit("order:taken", { orderId: order._id, driverId });
      io.to(`order_${order._id}`).emit("order:status_updated", order);
    }

    res.json({
      message: "¡Felicidades! Has tomado la solicitud.",
      order,
    });
  } catch (error) {
    console.error("Error al tomar servicio:", error);
    res.status(500).json({ message: "Error al procesar la asignación." });
  }
};

// 5. Actualizar estado del pedido (at_store, on_the_way, completed, cancelled)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, pin } = req.body;
    const driverId = req.user?._id || req.body.driverId;

    const validStatuses = ["at_store", "on_the_way", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Estado de servicio no válido." });
    }

    const order = await Order.findOne({ _id: orderId, driver: driverId });

    if (!order) {
      return res.status(404).json({
        message: "Solicitud no encontrada o no asignada a este repartidor.",
      });
    }

    // Validar PIN de entrega si el estado pasa a completado
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

    // 🔴 Socket.io: Emitir cambio de estado a las salas asociadas
    const io = req.app.get("io");
    if (io) {
      io.to(`order_${order._id}`).emit("order:status_updated", {
        orderId: order._id,
        status: order.status,
      });
    }

    res.json({
      message:
        status === "completed"
          ? "¡Servicio verificado y completado con éxito mediante PIN! 🏁"
          : `Estado actualizado a: ${status}`,
      order,
    });
  } catch (error) {
    console.error("Error al actualizar estado del servicio:", error);
    res.status(500).json({ message: "Error al actualizar la solicitud." });
  }
};

// 6. Calificar el servicio
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
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    order.rating = rating;
    order.ratingComment = ratingComment || "";
    await order.save();

    res.json({ message: "¡Gracias por tu calificación! ⭐", order });
  } catch (error) {
    console.error("Error al calificar servicio:", error);
    res
      .status(500)
      .json({ message: "Error interno al guardar la calificación." });
  }
};

// 7. Obtener la carrera activa de un domiciliario
export const getActiveDriverOrder = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.user?._id;

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
