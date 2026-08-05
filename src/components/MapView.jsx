import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Icono personalizado para el Motocarro
const motocarroIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1048/1048314.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

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
      }}
    >
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
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

        {/* Marcadores de Motocarros activos en tiempo real */}
        {Object.values(drivers).map((driver) => (
          <Marker
            key={driver.driverId}
            position={[driver.lat, driver.lng]}
            icon={motocarroIcon}
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
                      backgroundColor:
                        selectedDriverId === driver.driverId
                          ? "#16a34a"
                          : "#ea580c",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    {selectedDriverId === driver.driverId
                      ? "✓ Seleccionado"
                      : "Pedir a este Motocarro 🛺"}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
