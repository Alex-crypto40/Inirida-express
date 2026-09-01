import React, { useState } from "react";
import { AlertCircle, Navigation, ShieldCheck } from "lucide-react";

// Hook Personalizado
import { useDriverDashboard } from "../hooks/useDriverDashboard";

// Componentes
import DriverHeader from "../components/DriverHeader";
import AvailableOrdersList from "../components/AvailableOrdersList";
import ActiveTripCard from "../components/ActiveTripCard";
import DriverWalletCard from "../components/DriverWalletCard";
import OrderChatModal from "../components/OrderChatModal";

export default function DriverDashboard({
  driverName: propDriverName = "Conductor",
  driverId = "drv_123",
  socket,
  onLogout,
}) {
  // Estado local para modal de Billetera
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Extraer toda la lógica del Custom Hook
  const {
    driverName, // Nombre formateado y sincronizado devuelto por el hook
    isOnline,
    setIsOnline,
    gpsAccuracy,
    error,
    setError,
    loading,
    availableOrders,
    activeOrders,
    walletBalance,
    setWalletBalance,
    currentCoords,
    fetchOrders,
    handleAcceptOrder,
    handleUpdateStatus,
    isChatOpen,
    setIsChatOpen,
    chatTargetOrder,
    chatMessages,
    newMessageText,
    setNewMessageText,
    handleOpenChat,
    handleSendMessage,
    chatEndRef,
    calculateDistance,
  } = useDriverDashboard({ driverName: propDriverName, driverId, socket });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12 flex flex-col">
      {/* 1. Header Principal */}
      <DriverHeader
        driverName={driverName} // Se pasa la variable procesada por el hook
        isOnline={isOnline}
        setIsOnline={setIsOnline}
        gpsAccuracy={gpsAccuracy}
        walletBalance={walletBalance}
        onOpenWallet={() => setShowWalletModal(true)}
        onLogout={onLogout}
      />

      {/* Banner/Alerta de Errores */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 flex items-center justify-between text-xs text-red-400">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError("")}
            className="font-bold underline ml-2 hover:text-red-300"
          >
            Descartar
          </button>
        </div>
      )}

      {/* 2. Contenido Principal */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 space-y-6">
        {!isOnline ? (
          /* Estado Offline */
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-4 my-auto">
            <div className="w-16 h-16 bg-slate-800/80 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-slate-700">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">
                Estás Fuera de Servicio
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Cambia tu estado a "DISPONIBLE" en la parte superior para
                recibir solicitudes de carreras en tiempo real.
              </p>
            </div>
            <button
              onClick={() => setIsOnline(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20"
            >
              CONECTARME AHORA
            </button>
          </div>
        ) : (
          <>
            {/* Sección de Carreras Disponibles */}
            <AvailableOrdersList
              availableOrders={availableOrders}
              activeOrdersCount={activeOrders.length}
              loading={loading}
              currentCoords={currentCoords}
              onFetchOrders={fetchOrders}
              onAcceptOrder={handleAcceptOrder}
              calculateDistance={calculateDistance}
            />

            {/* Componente Flotante Único de Carreras Activas */}
            {activeOrders.length > 0 && (
              <ActiveTripCard
                activeOrders={activeOrders}
                onUpdateStatus={handleUpdateStatus}
                onOpenChat={handleOpenChat}
                loading={loading}
              />
            )}
          </>
        )}
      </main>

      {/* 3. Modal de Billetera */}
      {showWalletModal && (
        <DriverWalletCard
          balance={walletBalance}
          setBalance={setWalletBalance}
          onClose={() => setShowWalletModal(false)}
        />
      )}

      {/* 4. Modal del Chat */}
      {isChatOpen && chatTargetOrder && (
        <OrderChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          order={chatTargetOrder}
          chatMessages={chatMessages}
          newMessageText={newMessageText}
          setNewMessageText={setNewMessageText}
          onSendMessage={handleSendMessage}
          chatEndRef={chatEndRef}
          currentUserRole="driver"
        />
      )}
    </div>
  );
}
