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
      rideDetails, // Pasajeros, maletas, mascotas
      items,
      isMandado,
      mandadoDetail,
      subtotal,
      deliveryFee,
      total,
      originCoords, // { lat: Number, lng: Number }
      destinationCoords, // { lat: Number, lng: Number }
      notes,
    } = req.body;

    const deliveryPin = generateDeliveryPin();

    const newOrder = new Order({
      serviceType: serviceType || "delivery",
      store: store || null,
      customer: customer || req.user?._id,
      rideDetails: serviceType === "ride" ? rideDetails : undefined,
      items: items || [],
      isMandado: isMandado || false,
      mandadoDetail: mandadoDetail || "",
      subtotal: subtotal || 0,
      deliveryFee: deliveryFee || 4000,
      total: total || 0,
      deliveryPin,
      status: "pending_driver",
      counterOffers: [],
      notes: notes || "",
      // Campos de Geolocalización para MapView.jsx
      originCoords: originCoords || null,
      destinationCoords: destinationCoords || null,
    });

    await newOrder.save();

    const populatedOrder = await Order.findById(newOrder._id).populate(
      "store",
      "name address phone",
    );

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

// 4. Tomar una carrera
export const takeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?._id || req.body.driverId;

    if (!driverId) {
      return res.status(401).json({ message: "Repartidor no autenticado." });
    }

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

    let order = await Order.findOneAndUpdate(
      { _id: orderId, status: "pending_driver" },
      { driver: driverId, status: "assigned" },
      { returnDocument: "after" },
    )
      .populate("store", "name address phone")
      .populate("driver", "name phone vehicleType vehiclePlate");

    if (!order) {
      return res.status(409).json({
        message:
          "¡Lástima! Esta solicitud ya fue aceptada por otro domiciliario 🛵💨",
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("order:taken", { orderId: order._id, driverId });
      io.to(`order_${order._id}`).emit("order:status_updated", order);
      io.to(`order_${order._id}`).emit("orderUpdated", order);
      io.emit("order_status_updated", order);
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
    // 🟢 Si el body no especifica status, asumimos "completed" por venir del endpoint /complete
    const status = req.body.status || "completed";
    const { pin } = req.body;
    const driverId = req.user?._id || req.body.driverId;

    const validStatuses = ["at_store", "on_the_way", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Estado de servicio no válido." });
    }

    const order = await Order.findById(orderId).populate(
      "driver",
      "name phone vehicleType vehiclePlate",
    );

    if (!order) {
      return res.status(404).json({
        message: "Solicitud no encontrada.",
      });
    }

    if (status === "cancelled") {
      order.status = "cancelled";
      await order.save();

      const io = req.app.get("io");
      if (io) {
        io.to(`order_${order._id}`).emit("order:status_updated", order);
        io.to(`order_${order._id}`).emit("orderUpdated", order);
        io.emit("order_status_updated", order);
        io.emit("order:cancelled", { orderId: order._id });
      }

      return res.json({
        message: "Carrera/Solicitud cancelada exitosamente ❌",
        order,
      });
    }

    if (order.driver && order.driver._id.toString() !== driverId?.toString()) {
      return res.status(403).json({
        message: "No tienes permiso para actualizar esta solicitud.",
      });
    }

    // 🟢 Detección ampliada para eximir del PIN a cualquier tipo de carrera
    const isRide =
      order.serviceType === "ride" ||
      order.serviceType === "carrerita" ||
      order.serviceType === "pasajero" ||
      order.serviceType === "motocarro";

    if (status === "completed" && !isRide) {
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

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${order._id}`).emit("order:status_updated", order);
      io.to(`order_${order._id}`).emit("orderUpdated", order);
      io.emit("order_status_updated", order);
    }

    res.json({
      message:
        status === "completed"
          ? isRide
            ? "¡Carrera completada con éxito! 🏁"
            : "¡Servicio verificado y completado con éxito mediante PIN! 🏁"
          : `Estado actualizado a: ${status}`,
      order,
    });
  } catch (error) {
    console.error("Error al actualizar estado del servicio:", error);
    res.status(500).json({ message: "Error al actualizar la solicitud." });
  }
};

// 6. Enviar Contraoferta al Cliente
export const sendCounterOffer = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId, driverName, proposedPrice } = req.body;

    if (!proposedPrice || proposedPrice <= 0) {
      return res.status(400).json({ message: "Precio de propuesta inválido." });
    }

    const newOffer = {
      driverId,
      driverName: driverName || "Conductor Motocarro",
      proposedPrice: Number(proposedPrice),
      createdAt: new Date(),
    };

    const order = await Order.findByIdAndUpdate(
      orderId,
      { $push: { counterOffers: newOffer } },
      { new: true },
    )
      .populate("store", "name address phone")
      .populate("driver", "name phone vehicleType vehiclePlate");

    if (!order) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${orderId}`).emit("counter_offer_received", {
        orderId,
        offer: newOffer,
        order,
      });
      io.to(`order_${orderId}`).emit("orderUpdated", order);
      io.emit("order_status_updated", order);
    }

    res.json({
      message: "Contraoferta enviada con éxito al cliente 📲",
      order,
    });
  } catch (error) {
    console.error("Error al enviar contraoferta:", error);
    res.status(500).json({ message: "Error al procesar la propuesta." });
  }
};

// 7. Cancelación explícita
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: "cancelled" },
      { new: true },
    )
      .populate("store", "name address phone")
      .populate("driver", "name phone vehicleType vehiclePlate");

    if (!order) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${order._id}`).emit("order:status_updated", order);
      io.to(`order_${order._id}`).emit("orderUpdated", order);
      io.emit("order_status_updated", order);
      io.emit("order:cancelled", { orderId: order._id });
    }

    res.json({
      message: "Carrera/Solicitud cancelada correctamente ❌",
      order,
    });
  } catch (error) {
    console.error("Error al cancelar la orden:", error);
    res
      .status(500)
      .json({ message: "Error interno al cancelar la solicitud." });
  }
};

// 8. Calificar el servicio
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

// 9. Obtener la carrera activa de un domiciliario
export const getActiveDriverOrder = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.user?._id;

    const activeOrder = await Order.findOne({
      driver: driverId,
      status: {
        $in: [
          "assigned",
          "accepted",
          "en_camino",
          "in_progress",
          "at_store",
          "on_the_way",
        ],
      },
    })
      .populate("store", "name address phone")
      .populate("driver", "name phone vehicleType vehiclePlate");

    // 🟢 CORRECCIÓN: Responder directamente el objeto de la orden (o null) sin envolverlo en { activeOrder }
    res.json(activeOrder || null);
  } catch (error) {
    console.error("Error al obtener la carrera activa:", error);
    res.status(500).json({ message: "Error al consultar la carrera activa." });
  }
};

// 10. Obtener los detalles / estado de un pedido por ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("store", "name address phone")
      .populate("driver", "name phone vehicleType vehiclePlate");

    if (!order) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    res.json(order);
  } catch (error) {
    console.error("Error al obtener la orden por ID:", error);
    res.status(500).json({ message: "Error interno al consultar la orden." });
  }
};

// 11. Actualizar la ubicación GPS en vivo del mototaxista
export const updateDriverLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { lat, lng, heading } = req.body;

    if (lat === undefined || lng === undefined) {
      return res
        .status(400)
        .json({ message: "Coordenadas lat y lng requeridas." });
    }

    const driverLocation = {
      lat: Number(lat),
      lng: Number(lng),
      heading: heading ? Number(heading) : 0,
      updatedAt: new Date(),
    };

    const order = await Order.findByIdAndUpdate(
      orderId,
      { driverLocation },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada." });
    }

    const io = req.app.get("io");
    if (io) {
      const locationPayload = {
        orderId: order._id,
        driverLocation,
      };
      io.to(`order_${order._id}`).emit(
        "driver_location_updated",
        locationPayload,
      );
      io.to(`order_${order._id}`).emit("location_updated", locationPayload);
      io.emit("driver_location_updated", locationPayload);
    }

    res.json({
      message: "Ubicación actualizada correctamente.",
      driverLocation,
    });
  } catch (error) {
    console.error("Error al actualizar la ubicación del motocarro:", error);
    res.status(500).json({ message: "Error al actualizar la ubicación GPS." });
  }
};
// 12. Responder a una Contraoferta (Cliente Acepta o Rechaza)
export const respondCounterOffer = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, driverId, proposedPrice } = req.body; // action: "accept" o "reject"

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    if (action === "accept") {
      // Actualizar el costo de envío, total, asignar conductor y cambiar estado
      order.deliveryFee = Number(proposedPrice);
      order.total = (order.subtotal || 0) + Number(proposedPrice);
      order.driver = driverId;
      order.status = "assigned";

      // Marcar la contraoferta como aceptada en el historial
      if (order.counterOffers && order.counterOffers.length > 0) {
        order.counterOffers = order.counterOffers.map((offer) => {
          if (offer.driverId?.toString() === driverId?.toString()) {
            return { ...offer.toObject(), status: "accepted" };
          }
          return { ...offer.toObject(), status: "rejected" };
        });
      }

      await order.save();

      const populatedOrder = await Order.findById(order._id)
        .populate("store", "name address phone")
        .populate("driver", "name phone vehicleType vehiclePlate");

      const io = req.app.get("io");
      if (io) {
        io.to(`order_${orderId}`).emit("counter_offer_accepted", {
          orderId,
          order: populatedOrder,
        });
        io.to(`order_${orderId}`).emit("order:status_updated", populatedOrder);
        io.to(`order_${orderId}`).emit("orderUpdated", populatedOrder);
        io.emit("order_status_updated", populatedOrder);
        io.emit("order:taken", { orderId: order._id, driverId });
      }

      return res.json({
        message: "¡Contraoferta aceptada! El servicio ha sido asignado. 🚕",
        order: populatedOrder,
      });
    } else if (action === "reject") {
      // Marcar como rechazada
      if (order.counterOffers && order.counterOffers.length > 0) {
        order.counterOffers = order.counterOffers.map((offer) => {
          if (offer.driverId?.toString() === driverId?.toString()) {
            return { ...offer.toObject(), status: "rejected" };
          }
          return offer;
        });
      }

      await order.save();

      const io = req.app.get("io");
      if (io) {
        io.to(`order_${orderId}`).emit("counter_offer_rejected", {
          orderId,
          driverId,
        });
      }

      return res.json({ message: "Contraoferta rechazada.", order });
    } else {
      return res.status(400).json({ message: "Acción no válida." });
    }
  } catch (error) {
    console.error("Error al responder la contraoferta:", error);
    res
      .status(500)
      .json({ message: "Error interno al procesar la respuesta." });
  }
};
