import mongoose from "mongoose";
import Order from "../Order.js";
import Driver from "../Driver.js";
import User from "../User.js";
import { deductCommission } from "../walletService.js";

// Helper de campos para popular conductor de forma segura
const DRIVER_POPULATE_FIELDS =
  "name fullName phone vehicleType vehiclePlate plate plateNumber licensePlate vehicle model vehicleModel";

// Helper interno para popular dinámicamente el conductor
const safePopulateDriver = async (orderDoc) => {
  if (!orderDoc || !orderDoc.driver) return;

  if (
    typeof orderDoc.driver === "object" &&
    orderDoc.driver !== null &&
    !orderDoc.driver._id
  ) {
    return;
  }

  const driverId = orderDoc.driver._id || orderDoc.driver;
  if (mongoose.Types.ObjectId.isValid(driverId)) {
    try {
      await orderDoc.populate("driver", DRIVER_POPULATE_FIELDS);

      if (!orderDoc.driver) {
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
// 1. TOMAR UNA CARRERA / PEDIDO (DIRECTO A EN CAMINO)
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

    // 3. Poblados seguros obligatorios
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

    // 4. Notificar vía Sockets
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
// 2. ACTUALIZAR ESTADO DEL PEDIDO
// ==========================================
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    let status = req.body.status || "completed";
    const { pin } = req.body;

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
        io.emit("order_cancelled", { orderId: order._id });
      }

      return res.json({
        message: "Carrera/Solicitud cancelada exitosamente ❌",
        order: order.toObject(),
      });
    }

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

    // Descuento de comisión en billetera al completar la carrera
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
      newBalance,
    });
  } catch (error) {
    console.error("Error al actualizar estado del servicio:", error);
    res.status(500).json({ message: "Error al actualizar la solicitud." });
  }
};

// ==========================================
// 3. ENVIAR CONTRAOFERTA AL CLIENTE
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
// 4. CANCELACIÓN EXPLÍCITA
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
      io.emit("order_cancelled", { orderId: order._id });
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
// OBTENER LA CARRERA ACTIVA DE UN DOMICILIARIO
// ==========================================
export const getActiveDriverOrder = async (req, res) => {
  try {
    const driverId = req.params.driverId || req.user?._id;

    if (!driverId || driverId === "undefined" || driverId === "null") {
      return res.status(200).json(null);
    }

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
// ACTUALIZAR UBICACIÓN GPS EN VIVO DEL CONDUCTOR
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
