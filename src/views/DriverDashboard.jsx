import React from "react";
import "./DriverDashboard.css";

const DriverDashboard = ({
  driverName,
  isOnline,
  earnings,
  trips,
  rating = 5,
  onToggleStatus,
}) => {
  return (
    <div className="pro-container">
      {/* HEADER */}
      <div className="pro-header">
        <div className="pro-user">
          <div className="avatar">
            {driverName ? driverName.charAt(0).toUpperCase() : "D"}
          </div>

          <div>
            <h3 className="driver-name">{driverName}</h3>

            <div className="status-row">
              <span className={`dot ${isOnline ? "online" : "offline"}`}></span>
              <span className="status-text">
                {isOnline ? "En línea" : "Desconectado"}
              </span>
            </div>
          </div>
        </div>

        <button
          className={`power-btn ${isOnline ? "on" : "off"}`}
          onClick={onToggleStatus}
        >
          {isOnline ? "OFF" : "ON"}
        </button>
      </div>

      {/* MÉTRICAS */}
      <div className="pro-metrics">
        <div className="pro-card">
          <p>Ganancias</p>
          <h2>${earnings || 0}</h2>
        </div>

        <div className="pro-card">
          <p>Viajes</p>
          <h2>{trips || 0}</h2>
        </div>

        <div className="pro-card">
          <p>Rating</p>
          <h2>⭐ {rating}</h2>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="pro-actions">
        <button className="action-btn">Historial</button>
        <button className="action-btn">Mapa</button>
      </div>

      {/* BOTÓN PRINCIPAL */}
      <button
        className={`go-btn ${isOnline ? "active" : ""}`}
        onClick={onToggleStatus}
      >
        {isOnline ? "FINALIZAR JORNADA" : "COMENZAR JORNADA"}
      </button>
    </div>
  );
};

export default DriverDashboard;
