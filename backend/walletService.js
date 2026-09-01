// backend/walletService.js
import Driver from "./Driver.js";

const FARE_COMMISSION = 500; // Tarifa fija por carrera ($500 COP)

/**
 * Descuenta la comisión de la carrera de la billetera del conductor.
 * @param {string} driverId - ID del conductor
 * @returns {Promise<number>} - Nuevo saldo del conductor
 */
export const deductCommission = async (driverId) => {
  if (!driverId) {
    throw new Error(
      "Se requiere el ID del conductor para realizar el descuento.",
    );
  }

  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new Error("Conductor no encontrado.");
  }

  // Previene saldos negativos si se prefiere
  const currentBalance = Number(driver.walletBalance || driver.balance || 0);
  const newBalance = Math.max(0, currentBalance - FARE_COMMISSION);

  // Soporta ambos nombres de campo en el modelo por compatibilidad
  if ("walletBalance" in driver) {
    driver.walletBalance = newBalance;
  } else {
    driver.balance = newBalance;
  }

  await driver.save();
  return newBalance;
};

/**
 * Acredita/Recarga saldo a la billetera del conductor.
 * @param {string} driverId - ID del conductor
 * @param {number} amount - Monto a recargar
 * @returns {Promise<number>} - Nuevo saldo del conductor
 */
export const addRecharge = async (driverId, amount) => {
  if (!driverId || !amount || amount <= 0) {
    throw new Error("Se requiere un ID de conductor y un monto válido.");
  }

  const updatedDriver = await Driver.findByIdAndUpdate(
    driverId,
    { $inc: { walletBalance: Number(amount) } },
    { new: true },
  );

  if (!updatedDriver) {
    throw new Error("Conductor no encontrado.");
  }

  return updatedDriver.walletBalance;
};
