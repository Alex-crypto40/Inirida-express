import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Creador de icono HTML tipo Radar/Pulso
const createRadarIcon = (isSelected) => {
  const dotColorClass = isSelected ? "bg-emerald-500" : "bg-orange-500";
  const ringColorClass = isSelected ? "bg-emerald-400" : "bg-orange-400";

  return L.divIcon({
    className: "custom-radar-marker",
    html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        <span class="${ringColorClass}" style="
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          opacity: 0.75;
          animation: radarPulse 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></span>
        <span class="${dotColorClass}" style="
          position: relative;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Componente auxiliar para centrar suavemente el mapa
function RecenterMap({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView(location, map.getZoom());
    }
  }, [location, map]);
  return null;
}

export default function MapView({
  socket,
  userLocation,
  onSelectDriver,
  selectedDriverId,
}) {
  const [drivers, setDrivers] = useState({});

  useEffect(() => {
    if (!socket) return;

    const handleDriverList = (locationsArray) => {
      const initialMap = {};
      locationsArray.forEach((driver) => {
        if (driver.driverId) {
          initialMap[driver.driverId] = driver;
        }
      });
      setDrivers(initialMap);
    };

    // Escuchar lista inicial y actualizaciones globales
    socket.on("initial_drivers_locations", handleDriverList);
    socket.on("drivers_online_list", handleDriverList);

    // Actualización de posición individual
    socket.on("driver_location_changed", (driverData) => {
      setDrivers((prev) => ({
        ...prev,
        [driverData.driverId]: driverData,
      }));
    });

    // Remover al desconectarse
    socket.on("driver_disconnected_location", ({ driverId }) => {
      setDrivers((prev) => {
        const copy = { ...prev };
        delete copy[driverId];
        return copy;
      });
    });

    return () => {
      socket.off("initial_drivers_locations", handleDriverList);
      socket.off("drivers_online_list", handleDriverList);
      socket.off("driver_location_changed");
      socket.off("driver_disconnected_location");
    };
  }, [socket]);

  // Coordenadas por defecto (Inírida, Guainía)
  const center = userLocation || [3.8653, -67.9239];

  return (
    <div
      style={{
        height: "380px",
        width: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        position: "relative",
        zIndex: 0,
      }}
    >
      {/* Animación del pulso de radar e inhibición de z-index conflictivos */}
      <style>{`
        @keyframes radarPulse {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        .leaflet-container {
          z-index: 1 !important;
        }
        .leaflet-pane {
          z-index: 1 !important;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 2 !important;
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap location={center} />

        {/* Marcador de la ubicación del Cliente */}
        {userLocation && (
          <Marker position={userLocation}>
            <Popup>📍 Tu ubicación actual</Popup>
          </Marker>
        )}

        {/* Marcadores de Motocarros activos en tiempo real (Puntos de Radar) */}
        {Object.values(drivers).map((driver) => {
          const isSelected = selectedDriverId === driver.driverId;
          return (
            <Marker
              key={driver.driverId}
              position={[driver.lat, driver.lng]}
              icon={createRadarIcon(isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectDriver) {
                    onSelectDriver(driver);
                  }
                },
              }}
            >
              <Popup>
                <div style={{ textAlign: "center", padding: "4px" }}>
                  <strong style={{ fontSize: "14px" }}>
                    {driver.driverName || "Motocarro Express"}
                  </strong>
                  <br />
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#16a34a",
                      fontWeight: "bold",
                    }}
                  >
                    🟢 En Línea y Disponible
                  </span>
                  {onSelectDriver && (
                    <button
                      onClick={() => onSelectDriver(driver)}
                      style={{
                        marginTop: "8px",
                        width: "100%",
                        backgroundColor: isSelected ? "#16a34a" : "#ea580c",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      {isSelected
                        ? "✓ Seleccionado"
                        : "Pedir a este Motocarro 🛺"}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
