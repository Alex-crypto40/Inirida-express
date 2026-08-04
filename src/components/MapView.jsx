import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Icono personalizado para el Motocarro
const motocarroIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1048/1048314.png", // Icono provisional de motocarro
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

// Componente auxiliar para centrar suavemente el mapa si cambia la ubicación del cliente
function RecenterMap({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView(location, map.getZoom());
    }
  }, [location, map]);
  return null;
}

export default function MapView({ socket, userLocation }) {
  const [drivers, setDrivers] = useState({});

  useEffect(() => {
    if (!socket) return;

    // 1. Cargar las ubicaciones iniciales transmitidas por el backend al conectar
    socket.on("initial_drivers_locations", (locationsArray) => {
      const initialMap = {};
      locationsArray.forEach((driver) => {
        initialMap[driver.driverId] = driver;
      });
      setDrivers(initialMap);
    });

    // 2. Escuchar cambios de posición de los motocarros en tiempo real
    socket.on("driver_location_changed", (driverData) => {
      setDrivers((prev) => ({
        ...prev,
        [driverData.driverId]: driverData,
      }));
    });

    // 3. Remover del mapa al conductor si se desconecta o entra en carrera
    socket.on("driver_disconnected_location", ({ driverId }) => {
      setDrivers((prev) => {
        const copy = { ...prev };
        delete copy[driverId];
        return copy;
      });
    });

    return () => {
      socket.off("initial_drivers_locations");
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
            <Popup>Tu ubicación actual</Popup>
          </Marker>
        )}

        {/* Marcadores de Motocarros activos en tiempo real */}
        {Object.values(drivers).map((driver) => (
          <Marker
            key={driver.driverId}
            position={[driver.lat, driver.lng]}
            icon={motocarroIcon}
          >
            <Popup>
              <strong>{driver.driverName}</strong>
              <br />
              🛺 Motocarro Disponible
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
