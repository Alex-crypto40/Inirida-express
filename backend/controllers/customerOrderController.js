import mongoose from "mongoose";
import Order from "../Order.js";
import Message from "../Message.js";
import Driver from "../Driver.js";
import User from "../User.js";

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
      customerName,
      customerPhone,
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

    // 1. Extraer teléfono y nombre garantizando detección por múltiples vías
    const rawPhone =
      (typeof customer === "object" && customer !== null
        ? customer.phone
        : null) ||
      customerPhone ||
      req.body.phone ||
      "";

    const rawName =
      (typeof customer === "object" && customer !== null
        ? customer.name
        : null) ||
      customerName ||
      req.body.name ||
      "Cliente Inírida";

    let resolvedCustomer = customer || req.user?._id;

    // 2. Si se detecta un número de teléfono válido, guardar/actualizar obligatoriamente en la colección 'users'
    if (rawPhone && String(rawPhone).trim().length > 0) {
      const cleanPhone = String(rawPhone).trim();
      const cleanName = String(rawName).trim();

      try {
        // Upsert: Busca por teléfono. Si existe lo actualiza, si no existe lo crea en MongoDB.
        const userDoc = await User.findOneAndUpdate(
          { phone: cleanPhone },
          {
            $set: {
              phone: cleanPhone,
              role: "customer",
              isActive: true,
              lastActive: new Date(),
            },
            $setOnInsert: {
              name:
                cleanName !== "Cliente General" ? cleanName : "Cliente Inírida",
              createdAt: new Date(),
            },
          },
          { upsert: true, new: true, runValidators: false },
        );

        if (userDoc) {
          console.log(
            `✅ Usuario registrado/actualizado en DB (ID: ${userDoc._id}, Tel: ${cleanPhone})`,
          );
          // Asignar el ObjectId de MongoDB para vincular formalmente la orden
          resolvedCustomer = userDoc._id;
        }
      } catch (dbError) {
        console.warn(
          "⚠️ No se pudo realizar el upsert de User en DB, usando datos recibidos:",
          dbError.message,
        );
      }
    } else if (!resolvedCustomer) {
      // Fallback si no hay ningún dato de cliente
      resolvedCustomer = {
        name: "Cliente General",
        phone: "",
        address: originAddress || "",
      };
    }

    const deliveryPin = generateDeliveryPin();

    // 3. Instanciación de la Orden
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

    // 4. Poblado Seguro
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

    // 5. Emisión por WebSockets
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
    const { senderRole, senderType, senderName, senderPhone, text } = req.body; // <-- Extraemos senderPhone

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ message: "El mensaje no puede estar vacío." });
    }

    const newMessage = new Message({
      orderId,
      senderRole: senderRole || senderType || "client",
      senderName: senderName || "Usuario",
      senderPhone: senderPhone || "", // <-- Se guarda el número en MongoDB
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
// CALIFICAR EL SERVICIO
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
// RESPONDER A UNA CONTRAOFERTA (CLIENTE)
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
      order.status = "on_the_way";

      if (order.counterOffers && order.counterOffers.length > 0) {
        order.counterOffers = order.counterOffers.map((offer) => {
          if (offer.driverId?.toString() === driverId?.toString()) {
            return { ...offer.toObject(), status: "accepted" };
          }
          return { ...offer.toObject(), status: "rejected" };
        });
      }

      await order.save();

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
// OBTENER HISTORIAL DE PEDIDOS DE UN CLIENTE
// ==========================================
export const getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId || customerId === "undefined" || customerId === "null") {
      return res.status(200).json([]);
    }

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
