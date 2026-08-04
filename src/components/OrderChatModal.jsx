import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// Determinar la URL base dinámica usando VITE_API_URL sin el sufijo /api
const RAW_API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const BASE_URL = RAW_API.replace(/\/api\/?$/, "");

const OrderChatModal = ({
  orderId,
  currentUserRole,
  userType, // Fallback si se pasa como userType
  currentUserName,
  onClose,
}) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Normalización estricta de roles ("customer" -> "client")
  let rawRole = currentUserRole || userType || "client";
  if (rawRole === "customer") rawRole = "client";
  const role = rawRole;

  const name =
    currentUserName ||
    (role === "client"
      ? "Cliente"
      : role === "driver"
        ? "Conductor"
        : "Comercio");

  useEffect(() => {
    if (!orderId) return;

    // 1. Cargar historial de mensajes previo desde el backend
    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/api/orders/${orderId}/messages`,
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

    // 2. Conectar al servidor WebSocket
    socketRef.current = io(BASE_URL);

    // Unirse a la sala única de esta orden
    socketRef.current.emit("join_order_chat", orderId);
    socketRef.current.emit("join_order", `order_${orderId}`); // Compatibilidad cruzada
    socketRef.current.emit("join_order", orderId);

    // Escuchar mensajes en tiempo real previniendo duplicados
    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => {
        // Si el mensaje ya existe en el estado local por ID o coincidencia exacta, no se duplica
        const isDuplicate = prev.some(
          (m) =>
            (m._id && newMessage._id && m._id === newMessage._id) ||
            (m.text === newMessage.text &&
              m.senderRole === newMessage.senderRole &&
              Math.abs(
                new Date(m.createdAt || Date.now()) -
                  new Date(newMessage.createdAt || Date.now()),
              ) < 1000),
        );

        if (isDuplicate) return prev;
        return [...prev, newMessage];
      });
    };

    socketRef.current.on("receive_message", handleReceiveMessage);
    socketRef.current.on("new_message", handleReceiveMessage);

    return () => {
      if (socketRef.current) {
        socketRef.current.off("receive_message", handleReceiveMessage);
        socketRef.current.off("new_message", handleReceiveMessage);
        socketRef.current.disconnect();
      }
    };
  }, [orderId]);

  // Auto-scroll al último mensaje enviado o recibido
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enviar mensaje
  const handleSendMessage = (e) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;

    const messageData = {
      _id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, // ID temporal para UI optimista
      orderId,
      senderRole: role, // "driver" | "client" | "store"
      senderName: name,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    // 1. Actualización optimista local (UI inmediata)
    setMessages((prev) => [...prev, messageData]);

    // 2. Emitir mensaje por WebSockets al backend
    if (socketRef.current) {
      socketRef.current.emit("send_message", {
        orderId,
        senderRole: role,
        senderName: name,
        text: cleanText,
        createdAt: messageData.createdAt,
      });
    }

    setText("");
  };

  // Asignar colores y badges según el rol
  const getRoleBadge = (senderRole) => {
    switch (senderRole) {
      case "store":
        return { label: "Comercio 🏪", bg: "bg-orange-100 text-orange-800" };
      case "driver":
        return { label: "Motocarro 🛺", bg: "bg-blue-100 text-blue-800" };
      case "client":
      case "customer":
        return { label: "Cliente 👤", bg: "bg-green-100 text-green-800" };
      default:
        return { label: "Usuario", bg: "bg-gray-100 text-gray-800" };
    }
  };

  // Helper para dar formato de hora legible (ej: 10:30 a. m.)
  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      style={{ zIndex: 1060 }} // Capa z-index garantizada sobre la tarjeta flotante
    >
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
            type="button"
            className="bg-orange-600 hover:bg-orange-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Lista de Mensajes */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 text-sm mt-10">
              <p>📍 Chat activo entre Cliente y Motocarro.</p>
              <p className="text-xs mt-1">
                Escribe un mensaje para iniciar la conversación.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe =
                msg.senderRole === role ||
                (role === "client" && msg.senderRole === "customer");
              const badge = getRoleBadge(msg.senderRole);

              return (
                <div
                  key={msg._id || index}
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
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
                    className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm relative ${
                      isMe
                        ? "bg-orange-500 text-white rounded-tr-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                    }`}
                  >
                    <div>{msg.text}</div>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        isMe ? "text-orange-200" : "text-gray-400"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </span>
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
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-1 cursor-pointer"
          >
            Enviar 🚀
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrderChatModal;
