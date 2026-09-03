import mongoose from "mongoose";
import Order from "../Order.js";
import Driver from "../Driver.js";
import User from "../User.js";

const DRIVER_POPULATE_FIELDS =
  "name fullName phone vehicleType vehiclePlate plate plateNumber licensePlate vehicle model vehicleModel";

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
// OBTENER LOS DETALLES DE UN PEDIDO POR ID
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
