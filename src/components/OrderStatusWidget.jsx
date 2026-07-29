import { useState } from "react";
import OrderChatModal from "./OrderChatModal";

export default function OrderStatusWidget({ activeOrder, onCancelOrder }) {
  const [showChat, setShowChat] = useState(false);

  if (!activeOrder) return null;

  // Extraer datos del conductor si ya fue aceptado
  const driver = activeOrder.driverId;
  const isAccepted =
    activeOrder.status === "accepted" || activeOrder.status === "in_progress";
  const isCompleted = activeOrder.status === "completed";

  return (
    <>
      {/* Tarjeta Flotante en la esquina inferior derecha */}
      <div
        className="card shadow-lg border-primary position-fixed bottom-0 end-0 m-3 p-3"
        style={{
          zIndex: 1050,
          maxWidth: "350px",
          width: "90%",
          borderRadius: "15px",
        }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="m-0 fw-bold text-primary">
            <i className="bi bi-geo-alt-fill me-1"></i> Estado de tu Carrera
          </h6>
          <span
            className={`badge ${
              activeOrder.status === "pending"
                ? "bg-warning text-dark"
                : isAccepted
                  ? "bg-success"
                  : "bg-secondary"
            }`}
          >
            {activeOrder.status === "pending" && "Buscando conductor..."}
            {isAccepted && "Conductor en camino"}
            {isCompleted && "Carrera finalizada"}
          </span>
        </div>

        {/* Estado 1: Buscando Conductor */}
        {activeOrder.status === "pending" && (
          <div className="text-center my-3">
            <div
              className="spinner-border text-warning spinner-border-sm me-2"
              role="status"
            ></div>
            <small className="text-muted">
              Buscando un motocarro cercano...
            </small>
            <button
              className="btn btn-outline-danger btn-sm w-100 mt-3"
              onClick={() => onCancelOrder(activeOrder._id)}
            >
              Cancelar Carrera
            </button>
          </div>
        )}

        {/* Estado 2: Carrera Aceptada / En camino */}
        {isAccepted && (
          <div className="mt-2">
            <div className="bg-light p-2 rounded mb-2">
              <p className="mb-1 small">
                <strong>Conductor:</strong> {driver?.name || "Asignado"}
              </p>
              <p className="mb-1 small">
                <strong>Vehículo:</strong> {driver?.vehicleType || "Motocarro"}
              </p>
              <p className="mb-0 small">
                <strong>Placa:</strong>{" "}
                <span className="badge bg-dark">
                  {driver?.plateNumber || "N/A"}
                </span>
              </p>
            </div>

            <button
              className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={() => setShowChat(true)}
            >
              <i className="bi bi-chat-dots-fill"></i> Abrir Chat con Conductor
            </button>
          </div>
        )}

        {/* Estado 3: Finalizada */}
        {isCompleted && (
          <div className="text-center my-2">
            <p className="small text-success mb-2">¡Llegaste a tu destino!</p>
          </div>
        )}
      </div>

      {/* Modal de Chat con el Conductor */}
      {showChat && (
        <OrderChatModal
          orderId={activeOrder._id}
          currentUserRole="client"
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}
