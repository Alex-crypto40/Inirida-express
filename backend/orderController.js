import mongoose from "mongoose";
import Order from "./Order.js";
import Message from "./Message.js";
import Driver from "./Driver.js";
import User from "./User.js";
import { deductCommission } from "./walletService.js";

// Helper de campos para popular conductor de forma segura (incluye todas las variantes posibles de placas y nombres)
const DRIVER_POPULATE_FIELDS =
  "name fullName phone vehicleType vehiclePlate plate plateNumber licensePlate vehicle model vehicleModel";

// Helper interno para popular dinámicamente el conductor independientemente del modelo ref o ID
const safePopulateDriver = async (orderDoc) => {
  if (!orderDoc || !orderDoc.driver) return;

  // 1. Si driver ya viene populado como objeto con datos
  if (
    typeof orderDoc.driver === "object" &&
    orderDoc.driver !== null &&
    !orderDoc.driver._id
  ) {
    return;
  }

  // 2. Si driver es un ObjectId o String
  const driverId = orderDoc.driver._id || orderDoc.driver;
  if (mongoose.Types.ObjectId.isValid(driverId)) {
    try {
      // Intentar popular normalmente según la ref del modelo
      await orderDoc.populate("driver", DRIVER_POPULATE_FIELDS);

      // Si el populate de mongoose devolvió null (por mismatch de ref o colección)
      if (!orderDoc.driver) {
        // Probar buscando manualmente en Driver y luego en User
        let foundDriver = await Driver.findById(driverId)
          .select(DRIVER_POPULATE_FIELDS)
          .lean();
        if (!foundDriver) {
          foundDriver = await User.findById(driverId)
            .select(DRIVER_POPULATE_FIELDS)
            .lean();
        }
        if (foundDriver) {
          orderDoc.driver = foundDriver;
        }
      }
    } catch (e) {
      console.warn(
        "⚠️ Advertencia al popular driver dinámicamente:",
        e.message,
      );
    }
  }
};

// ==========================================
// HELPER PARA GENERAR PIN SEGURO
// ==========================================
const generateDeliveryPin = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

// ==========================================
// 1. CREAR UN NUEVO PEDIDO / CARRERA
// ==========================================
export const createOrder = async (req, res) => {
  try {
    const {
      serviceType, // "delivery", "mandado", "ride", "carrerita", "motocarro"
      store,
      customer,
      originAddress,
      destinationAddress,
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

    // 1. Resolver los datos del cliente con soporte para usuario registrado u objeto invitado
    const resolvedCustomer = customer ||
      req.user?._id || {
        name: "Cliente General",
        phone: "",
        address: originAddress || "",
      };

    const deliveryPin = generateDeliveryPin();

    // 2. Instanciación de la Orden
    const newOrder = new Order({
      serviceType: serviceType || "ride",
      store: store || null,
      customer: resolvedCustomer,
      originAddress: originAddress || "",
      destinationAddress: destinationAddress || "",
      rideDetails: rideDetails || {},
      items: items || [],
      isMandado: isMandado || false,
      mandadoDetail: mandadoDetail || "",
      subtotal: subtotal || 0,
      deliveryFee: deliveryFee || 4000,
      total: total || deliveryFee || 4000,
      deliveryPin,
      status: "pending_driver",
      counterOffers: [],
      notes: notes || "",
      originCoords: originCoords || null,
      destinationCoords: destinationCoords || null,
    });

    await newOrder.save();

    // 3. Poblado Seguro
    if (newOrder.store && mongoose.Types.ObjectId.isValid(newOrder.store)) {
      await newOrder.populate("store", "name address phone originCoords");
    }

    if (
      newOrder.customer &&
      mongoose.Types.ObjectId.isValid(newOrder.customer)
    ) {
      await newOrder.populate(
        "customer",
        "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
      );
    }

    const populatedOrder = newOrder.toObject();

    // 4. Emisión por WebSockets
    const io = req.app.get("io");
    if (io) {
      io.emit("order:created", populatedOrder);
      io.emit("order_created", populatedOrder);
    }

    return res.status(201).json({
      message: "Solicitud creada exitosamente 🚀",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("❌ Error crítico al crear pedido/carrera:", error);
    return res.status(500).json({
      message: "Error interno al procesar la solicitud.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. OBTENER PEDIDOS Y CARRERAS DISPONIBLES
// ==========================================
export const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: {
        $in: [
          "pending_driver",
          "pending",
          "PENDING_DRIVER",
          "PENDING",
          "searching",
          "SEARCHING",
        ],
      },
    })
      .populate("store", "name address phone originCoords")
      .sort({ createdAt: -1 });

    // Popular cliente únicamente cuando 'customer' sea un ObjectId de Mongoose
    const populatedOrders = await Promise.all(
      orders.map(async (doc) => {
        if (doc.customer && mongoose.Types.ObjectId.isValid(doc.customer)) {
          try {
            await doc.populate(
              "customer",
              "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
            );
          } catch (e) {
            console.warn("⚠️ No se pudo popular customer ObjectId:", e.message);
          }
        }
        await safePopulateDriver(doc);
        return doc.toObject();
      }),
    );

    res.json(populatedOrders);
  } catch (error) {
    console.error("Error al obtener pedidos disponibles:", error);

    try {
      const rawOrders = await Order.find({
        status: {
          $in: [
            "pending_driver",
            "pending",
            "PENDING_DRIVER",
            "PENDING",
            "searching",
            "SEARCHING",
          ],
        },
      }).sort({ createdAt: -1 });
      return res.json(rawOrders);
    } catch (fallbackError) {
      res
        .status(500)
        .json({ message: "Error al cargar la lista de solicitudes." });
    }
  }
};

// ==========================================
// 3. OBTENER EL HISTORIAL DE CHAT DE UN PEDIDO
// ==========================================
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

// ==========================================
// 3b. CREAR/ENVIAR MENSAJE VÍA REST
// ==========================================
export const createMessage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { senderRole, senderType, senderName, text } = req.body;

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ message: "El mensaje no puede estar vacío." });
    }

    const newMessage = new Message({
      orderId,
      senderRole: senderRole || senderType || "client",
      senderName: senderName || "Usuario",
      text: text.trim(),
      createdAt: new Date(),
    });

    await newMessage.save();

    const io = req.app.get("io");
    if (io) {
      // Emitir eventos manteniendo compatibilidad con ambos esquemas de salas
      io.to(orderId).emit("receive_message", newMessage);
      io.to(`order_${orderId}`).emit("receive_message", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error al guardar mensaje vía HTTP:", error);
    res.status(500).json({ message: "Error al enviar el mensaje." });
  }
};

// ==========================================
// 4. TOMAR UNA CARRERA / PEDIDO (DIRECTO A EN CAMINO)
// ==========================================
export const takeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user?._id || req.body.driverId || req.body.driver;

    if (!driverId) {
      return res.status(401).json({ message: "Repartidor no autenticado." });
    }

    if (
      typeof driverId === "string" &&
      !mongoose.Types.ObjectId.isValid(driverId)
    ) {
      console.warn(`⚠️ driverId recibido no es ObjectId válido: ${driverId}`);
    }

    // 1. Validar si el conductor ya posee 2 o más carreras activas
    const activeOrdersCount = await Order.countDocuments({
      driver: driverId,
      _id: { $ne: orderId },
      status: {
        $in: [
          "assigned",
          "at_store",
          "on_the_way",
          "in_progress",
          "accepted",
          "en_camino",
        ],
      },
    });

    if (activeOrdersCount >= 2) {
      return res.status(400).json({
        message: "Ya tienes el límite máximo de 2 carreras activas.",
      });
    }
    // 2. Asignar la orden y pasar DIRECTO a 'on_the_way' (En camino)
    let order = await Order.findOneAndUpdate(
      {
        _id: orderId,
        status: {
          $in: [
            "pending_driver",
            "pending",
            "searching",
            "PENDING_DRIVER",
            "PENDING",
          ],
        },
      },
      { driver: driverId, status: "on_the_way" },
      { new: true },
    );

    if (!order) {
      return res.status(409).json({
        message:
          "¡Lástima! Esta solicitud ya fue aceptada por otro domiciliario 🛵💨",
      });
    }

    // 3. Poblados seguros obligatorios para devolver la info completa del conductor al cliente inmediatamente
    let populatedOrder = order;
    try {
      if (order.store && mongoose.Types.ObjectId.isValid(order.store)) {
        await order.populate("store", "name address phone originCoords");
      }
      if (order.customer && mongoose.Types.ObjectId.isValid(order.customer)) {
        await order.populate(
          "customer",
          "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
        );
      }
      await safePopulateDriver(order);
      populatedOrder = order.toObject();
    } catch (popError) {
      console.warn(
        "⚠️ Error secundario al popular datos en takeOrder:",
        popError.message,
      );
      populatedOrder = order.toObject();
    }

    // 4. Notificar vía Sockets a todas las salas relevantes
    const io = req.app.get("io");
    if (io) {
      io.emit("order:taken", {
        orderId: order._id,
        driverId,
        order: populatedOrder,
      });
      io.to(`order_${order._id}`).emit("order:status_updated", populatedOrder);
      io.to(`order_${order._id}`).emit("orderUpdated", populatedOrder);
      io.emit("order_status_updated", populatedOrder);
    }

    return res.json({
      message: "¡Felicidades! Has tomado la solicitud.",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("❌ Error grave al tomar servicio:", error);
    return res.status(500).json({
      message: "Error al procesar la asignación.",
      error: error.message,
    });
  }
};

// ==========================================
// 5. ACTUALIZAR ESTADO DEL PEDIDO
// ==========================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    let status = req.body.status || "completed";
    const { pin } = req.body;

    // Normalizar variantes de estados comunes
    if (
      status === "finalizada" ||
      status === "finished" ||
      status === "delivered"
    ) {
      status = "completed";
    }

    const validStatuses = [
      "created",
      "pending_driver",
      "assigned",
      "at_store",
      "on_the_way",
      "en_camino",
      "in_progress",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Estado no válido: ${status}` });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Solicitud no encontrada.",
      });
    }

    // Poblados seguros condicionales
    if (order.store && mongoose.Types.ObjectId.isValid(order.store)) {
      await order.populate("store", "name address phone originCoords");
    }
    if (order.customer && mongoose.Types.ObjectId.isValid(order.customer)) {
      await order.populate(
        "customer",
        "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
      );
    }
    await safePopulateDriver(order);

    if (status === "cancelled") {
      order.status = "cancelled";
      await order.save();

      const io = req.app.get("io");
      if (io) {
        io.to(`order_${order._id}`).emit(
          "order:status_updated",
          order.toObject(),
        );
        io.to(`order_${order._id}`).emit("orderUpdated", order.toObject());
        io.emit("order_status_updated", order.toObject());
        io.emit("order:cancelled", { orderId: order._id });
      }

      return res.json({
        message: "Carrera/Solicitud cancelada exitosamente ❌",
        order: order.toObject(),
      });
    }

    // Eximir del PIN a carreras de tipo transporte / motocarro / pasajeros
    const isRide =
      order.serviceType === "ride" ||
      order.serviceType === "carrerita" ||
      order.serviceType === "pasajero" ||
      order.serviceType === "motocarro" ||
      !order.deliveryPin;

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

    // ---------------------------------------------------------------------------
    // DESCUENTO DE $500 DE LA BILLETERA AL COMPLETAR LA CARRERA
    // ---------------------------------------------------------------------------
    let newBalance = null;
    if (status === "completed" && order.driver) {
      try {
        const driverId = order.driver._id || order.driver;
        newBalance = await deductCommission(driverId);
      } catch (walletErr) {
        console.error("⚠️ Error aplicando descuento de billetera:", walletErr);
      }
    }

    const populatedResult = order.toObject();

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${order._id}`).emit("order:status_updated", populatedResult);
      io.to(`order_${order._id}`).emit("orderUpdated", populatedResult);
      io.emit("order_status_updated", populatedResult);
    }

    res.json({
      message:
        status === "completed"
          ? isRide
            ? "¡Carrera completada con éxito! 🏁"
            : "¡Servicio verificado y completado con éxito mediante PIN! 🏁"
          : `Estado actualizado a: ${status}`,
      order: populatedResult,
      newBalance, // <--- Retorna el nuevo saldo actualizado al frontend
    });
  } catch (error) {
    console.error("Error al actualizar estado del servicio:", error);
    res.status(500).json({ message: "Error al actualizar la solicitud." });
  }
};

// ==========================================
// 6. ENVIAR CONTRAOFERTA AL CLIENTE
// ==========================================
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
    );

    if (!order) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    // Poblados seguros
    if (order.store && mongoose.Types.ObjectId.isValid(order.store)) {
      await order.populate("store", "name address phone originCoords");
    }
    if (order.customer && mongoose.Types.ObjectId.isValid(order.customer)) {
      await order.populate(
        "customer",
        "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
      );
    }
    await safePopulateDriver(order);

    const populatedResult = order.toObject();

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${orderId}`).emit("counter_offer_received", {
        orderId,
        offer: newOffer,
        order: populatedResult,
      });
      io.to(`order_${orderId}`).emit("orderUpdated", populatedResult);
      io.emit("order_status_updated", populatedResult);
    }

    res.json({
      message: "Contraoferta enviada con éxito al cliente 📲",
      order: populatedResult,
    });
  } catch (error) {
    console.error("Error al enviar contraoferta:", error);
    res.status(500).json({ message: "Error al procesar la propuesta." });
  }
};

// ==========================================
// 7. CANCELACIÓN EXPLÍCITA
// ==========================================
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: "cancelled" },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    // Poblados seguros
    if (order.store && mongoose.Types.ObjectId.isValid(order.store)) {
      await order.populate("store", "name address phone originCoords");
    }
    if (order.customer && mongoose.Types.ObjectId.isValid(order.customer)) {
      await order.populate(
        "customer",
        "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
      );
    }
    await safePopulateDriver(order);

    const populatedResult = order.toObject();

    const io = req.app.get("io");
    if (io) {
      io.to(`order_${order._id}`).emit("order:status_updated", populatedResult);
      io.to(`order_${order._id}`).emit("orderUpdated", populatedResult);
      io.emit("order_status_updated", populatedResult);
      io.emit("order:cancelled", { orderId: order._id });
    }

    res.json({
      message: "Carrera/Solicitud cancelada correctamente ❌",
      order: populatedResult,
    });
  } catch (error) {
    console.error("Error al cancelar la orden:", error);
    res
      .status(500)
      .json({ message: "Error interno al cancelar la solicitud." });
  }
};

// ==========================================
// 8. CALIFICAR EL SERVICIO
// ==========================================
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

    res.json({
      message: "¡Gracias por tu calificación! ⭐",
      order: order.toObject(),
    });
  } catch (error) {
    console.error("Error al calificar servicio:", error);
    res
      .status(500)
      .json({ message: "Error interno al guardar la calificación." });
  }
};

// ==========================================
// 9. OBTENER LA CARRERA ACTIVA DE UN DOMICILIARIO
// ==========================================
export const getActiveDriverOrder = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.user?._id;

    if (!driverId || driverId === "undefined" || driverId === "null") {
      return res.status(200).json(null);
    }

    // Búsqueda flexible por ObjectId o por String exacto
    const activeOrder = await Order.findOne({
      $or: [
        { driver: driverId },
        ...(mongoose.Types.ObjectId.isValid(driverId)
          ? [{ driver: new mongoose.Types.ObjectId(driverId) }]
          : []),
      ],
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
    }).populate("store", "name address phone originCoords");

    if (!activeOrder) {
      return res.status(200).json(null);
    }

    await safePopulateDriver(activeOrder);

    let populatedOrder = activeOrder.toObject();
    if (
      activeOrder.customer &&
      mongoose.Types.ObjectId.isValid(activeOrder.customer)
    ) {
      await activeOrder.populate(
        "customer",
        "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
      );
      populatedOrder = activeOrder.toObject();
    }

    return res.status(200).json(populatedOrder);
  } catch (error) {
    console.error("❌ Error al obtener la carrera activa:", error);
    return res.status(200).json(null);
  }
};

// ==========================================
// 10. OBTENER LOS DETALLES DE UN PEDIDO POR ID
// ==========================================
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "ID de orden no válido." });
    }

    const order = await Order.findById(orderId).populate(
      "store",
      "name address phone originCoords",
    );

    if (!order) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    await safePopulateDriver(order);

    let populatedOrder = order.toObject();
    if (order.customer && mongoose.Types.ObjectId.isValid(order.customer)) {
      await order.populate(
        "customer",
        "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
      );
      populatedOrder = order.toObject();
    }

    res.json(populatedOrder);
  } catch (error) {
    console.error("Error al obtener la orden por ID:", error);
    res.status(500).json({
      message: "Error interno al consultar la orden.",
      error: error.message,
    });
  }
};

// ==========================================
// 11. ACTUALIZAR UBICACIÓN GPS EN VIVO DEL CONDUCTOR
// ==========================================
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

// ==========================================
// 12. RESPONDER A UNA CONTRAOFERTA
// ==========================================
export const respondCounterOffer = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, driverId, proposedPrice } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    if (action === "accept") {
      order.deliveryFee = Number(proposedPrice);
      order.total = (order.subtotal || 0) + Number(proposedPrice);
      order.driver = driverId;
      order.status = "on_the_way"; // Pasa directo a en camino

      if (order.counterOffers && order.counterOffers.length > 0) {
        order.counterOffers = order.counterOffers.map((offer) => {
          if (offer.driverId?.toString() === driverId?.toString()) {
            return { ...offer.toObject(), status: "accepted" };
          }
          return { ...offer.toObject(), status: "rejected" };
        });
      }

      await order.save();

      // Poblados seguros (Aseguramos popular conductor tras asignar driverId)
      if (order.store && mongoose.Types.ObjectId.isValid(order.store)) {
        await order.populate("store", "name address phone originCoords");
      }
      if (order.customer && mongoose.Types.ObjectId.isValid(order.customer)) {
        await order.populate(
          "customer",
          "name phone address pickupAddress notes destinationCoords originAddress destinationAddress",
        );
      }
      await safePopulateDriver(order);

      const populatedResult = order.toObject();

      const io = req.app.get("io");
      if (io) {
        io.to(`order_${orderId}`).emit("counter_offer_accepted", {
          orderId,
          order: populatedResult,
        });
        io.to(`order_${orderId}`).emit("order:status_updated", populatedResult);
        io.to(`order_${orderId}`).emit("orderUpdated", populatedResult);
        io.emit("order_status_updated", populatedResult);
        io.emit("order:taken", {
          orderId: order._id,
          driverId,
          order: populatedResult,
        });
      }

      return res.json({
        message: "¡Contraoferta aceptada! El servicio ha sido asignado. 🚕",
        order: populatedResult,
      });
    } else if (action === "reject") {
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

      return res.json({
        message: "Contraoferta rechazada.",
        order: order.toObject(),
      });
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

// ==========================================
// 13. OBTENER HISTORIAL DE PEDIDOS DE UN CLIENTE
// ==========================================
export const getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId || customerId === "undefined" || customerId === "null") {
      return res.status(200).json([]);
    }

    // Búsqueda por ObjectId (si es válido) o por campo de teléfono/string en la orden
    const query = mongoose.Types.ObjectId.isValid(customerId)
      ? { $or: [{ customer: customerId }, { "customer.phone": customerId }] }
      : { "customer.phone": customerId };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("driver", "name phone vehicleType vehiclePlate avatar photo")
      .populate("store", "name address phone")
      .lean();

    return res.status(200).json(orders || []);
  } catch (error) {
    console.error("❌ Error al obtener historial del cliente:", error);
    return res.status(500).json({
      success: false,
      message: "Error al recuperar el historial de pedidos.",
    });
  }
};
