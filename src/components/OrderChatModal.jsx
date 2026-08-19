import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

// Detección de entorno local vs producción
const IS_PROD = window.location.hostname !== "localhost";

const BASE_DOMAIN = IS_PROD
  ? "https://inirida-express.onrender.com"
  : "http://localhost:5000";

const RAW_API = import.meta.env.VITE_API_URL || BASE_DOMAIN;
const BASE_URL = RAW_API.replace(/\/api\/?$/, "");

const OrderChatModal = ({
  orderId,
  currentUserRole,
  userType,
  currentUserName,
  onClose,
}) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
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

  // Cerrar modal al presionar la tecla ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!orderId) return;

    // 1. Fetch del historial de mensajes via HTTP
    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/api/orders/${orderId}/messages`,
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(Array.isArray(data) ? data : []);
        } else {
          const legacyRes = await fetch(
            `${BASE_URL}/orders/${orderId}/messages`,
          );
          if (legacyRes.ok) {
            const legacyData = await legacyRes.json();
            setMessages(Array.isArray(legacyData) ? legacyData : []);
          }
        }
      } catch (error) {
        console.error("Error al cargar historial del chat:", error);
      }
    };

    fetchHistory();

    // 2. Conexión Socket.io optimizada para Render
    socketRef.current = io(BASE_URL, {
      transports: ["websocket", "polling"], // Intentar websocket primero
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: false,
    });

    const joinRoom = () => {
      if (socketRef.current) {
        setIsConnected(true);
        socketRef.current.emit("join_order", orderId);
        socketRef.current.emit("join", orderId); // Fallback room name
      }
    };

    // Manejadores de conexión
    socketRef.current.on("connect", joinRoom);

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
    });

    socketRef.current.on("connect_error", (err) => {
      console.warn(
        "Socket conexión fallida, reintentando con polling...",
        err.message,
      );
      setIsConnected(false);
    });

    socketRef.current.io.on("reconnect", joinRoom);

    // Manejador único de mensajes entrantes
    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => {
        const isDuplicate = prev.some((m) => {
          if (m._id && newMessage._id && m._id === newMessage._id) return true;
          const sameText = m.text === newMessage.text;
          const sameRole =
            (m.senderRole || m.senderType) ===
            (newMessage.senderRole || newMessage.senderType);
          const timeDiff = Math.abs(
            new Date(m.createdAt || Date.now()) -
              new Date(newMessage.createdAt || Date.now()),
          );
          return sameText && sameRole && timeDiff < 2000;
        });

        if (isDuplicate) return prev;
        return [...prev, newMessage];
      });
    };

    // Escuchar eventos estándar de Socket
    socketRef.current.on("receive_message", handleReceiveMessage);
    socketRef.current.on("newMessage", handleReceiveMessage);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_order", orderId);
        socketRef.current.off("receive_message", handleReceiveMessage);
        socketRef.current.off("newMessage", handleReceiveMessage);
        socketRef.current.off("connect", joinRoom);
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.io.off("reconnect", joinRoom);
        socketRef.current.disconnect();
      }
    };
  }, [orderId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Envío con Fallback HTTP REST
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const messageData = {
      _id: tempId,
      orderId,
      senderRole: role,
      senderType: role,
      senderName: name,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    // Actualización optimista en UI
    setMessages((prev) => [...prev, messageData]);
    setText("");

    let sentViaSocket = false;

    // Intentar envío vía Socket
    if (socketRef.current && socketRef.current.connected) {
      try {
        socketRef.current.emit("send_message", {
          orderId,
          senderRole: role,
          senderType: role,
          senderName: name,
          text: cleanText,
          createdAt: messageData.createdAt,
        });
        sentViaSocket = true;
      } catch (err) {
        console.warn(
          "Fallo emitiendo por socket, enviando vía HTTP REST...",
          err,
        );
      }
    }

    // Respando vía HTTP POST si Socket falló o está desconectado
    if (!sentViaSocket) {
      try {
        await fetch(`${BASE_URL}/api/orders/${orderId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderRole: role,
            senderType: role,
            senderName: name,
            text: cleanText,
          }),
        });
      } catch (error) {
        console.error("Error al enviar mensaje por HTTP REST:", error);
      }
    }
  };

  const getRoleBadge = (senderRole) => {
    const normalizedRole = (senderRole || "").toLowerCase();
    switch (normalizedRole) {
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
      style={{ zIndex: 1060 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[550px] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="bg-orange-500 text-white p-4 flex justify-between items-center shadow-md">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              💬 Chat del Pedido
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
                title={
                  isConnected ? "Socket Conectado" : "Conectando Socket..."
                }
              />
            </h3>
            <p className="text-xs text-orange-100">
              {isConnected ? "En línea" : "Modo Respaldo (HTTP)"}
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

        {/* Mensajes */}
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
              const msgRole = (
                msg.senderRole ||
                msg.senderType ||
                ""
              ).toLowerCase();
              const isMe =
                msgRole === role.toLowerCase() ||
                (role === "client" && msgRole === "customer");
              const badge = getRoleBadge(msgRole);

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
                    className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-xs relative ${
                      isMe
                        ? "bg-orange-500 text-white rounded-tr-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>
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

        {/* Input */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-white border-t border-gray-100 flex gap-2"
        >
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-800"
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
