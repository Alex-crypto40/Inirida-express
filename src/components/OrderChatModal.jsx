import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// URL de tu servidor backend (Ajusta la IP si estás probando desde celular en red local)
const SOCKET_URL = "http://localhost:5000";

const OrderChatModal = ({
  orderId,
  currentUserRole,
  currentUserName,
  onClose,
}) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    // 1. Cargar el historial de mensajes previo desde el backend
    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/orders/${orderId}/messages`,
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Error al cargar historial del chat:", error);
      }
    };

    fetchHistory();

    // 2. Conectar con el servidor WebSocket
    socketRef.current = io(SOCKET_URL);

    // Unirse a la sala única de esta orden
    socketRef.current.emit("join_order_chat", orderId);

    // Escuchar mensajes entrantes en tiempo real
    socketRef.current.on("receive_message", (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    // Desconectar socket al cerrar el modal
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [orderId]);

  // Auto-scroll hacia el último mensaje
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enviar nuevo mensaje
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const messageData = {
      orderId,
      senderRole: currentUserRole, // "driver" | "client" | "store"
      senderName: currentUserName,
      text: text.trim(),
    };

    // Emitir mensaje por WebSockets
    socketRef.current.emit("send_message", messageData);
    setText("");
  };

  // Asignar colores según el rol que envía el mensaje
  const getRoleBadge = (role) => {
    switch (role) {
      case "store":
        return { label: "Comercio 🏪", bg: "bg-orange-100 text-orange-800" };
      case "driver":
        return { label: "Repartidor 🛵", bg: "bg-blue-100 text-blue-800" };
      case "client":
        return { label: "Cliente 👤", bg: "bg-green-100 text-green-800" };
      default:
        return { label: "Usuario", bg: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[550px] flex flex-col overflow-hidden border border-gray-100">
        {/* Encabezado del Chat */}
        <div className="bg-orange-500 text-white p-4 flex justify-between items-center shadow-md">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              💬 Chat del Pedido
            </h3>
            <p className="text-xs text-orange-100">
              Comunicación en tiempo real
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-orange-600 hover:bg-orange-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Lista de Mensajes */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-10">
              <p>📍 Chat activo entre Cliente, Comercio y Domiciliario.</p>
              <p className="text-xs mt-1">
                Escribe un mensaje para iniciar la conversación.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderRole === currentUserRole;
              const badge = getRoleBadge(msg.senderRole);

              return (
                <div
                  key={msg._id || index}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[10px] font-bold text-gray-600">
                      {msg.senderName}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                      isMe
                        ? "bg-orange-500 text-white rounded-tr-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Formulario de Envío */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-white border-t flex gap-2"
        >
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-1"
          >
            Enviar 🚀
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrderChatModal;
