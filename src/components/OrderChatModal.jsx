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
  order, // Acepta la orden completa como fallback
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

  // Extracción limpia e infalible del ID de la orden
  const getTargetOrderId = () => {
    if (typeof orderId === "string" || typeof orderId === "number") {
      return orderId;
    }
    const targetObj = order || (typeof orderId === "object" ? orderId : null);
    if (!targetObj) return null;

    return (
      targetObj._id ||
      targetObj.id ||
      targetObj.orderId ||
      targetObj.order?._id ||
      targetObj.order?.id ||
      null
    );
  };

  const activeOrderId = getTargetOrderId();

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
    if (!activeOrderId) return;

    // 1. Fetch del historial de mensajes via HTTP
    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `${BASE_URL}/api/orders/${activeOrderId}/messages`,
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(Array.isArray(data) ? data : []);
        } else {
          const legacyRes = await fetch(
            `${BASE_URL}/orders/${activeOrderId}/messages`,
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
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 20000,
      withCredentials: false,
    });

    const joinRoom = () => {
      if (socketRef.current) {
        setIsConnected(true);
        // Unirse únicamente a una sala para evitar transmisiones dobles
        socketRef.current.emit("join_order", activeOrderId);
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

    // Manejador único de mensajes entrantes con deduplicación estricta
    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => {
        const isDuplicate = prev.some((m) => {
          // 1. Coincidencia por ID real o temporal
          if (m._id && newMessage._id && m._id === newMessage._id) return true;
          if (m.tempId && newMessage.tempId && m.tempId === newMessage.tempId)
            return true;

          // 2. Coincidencia por contenido y emisor
          const sameText = m.text === newMessage.text;
          const sameRole =
            (m.senderRole || m.senderType) ===
            (newMessage.senderRole || newMessage.senderType);

          return sameText && sameRole;
        });

        if (isDuplicate) return prev;
        return [...prev, newMessage];
      });
    };

    // Apagar listeners viejos antes de encender
    socketRef.current.off("receive_message", handleReceiveMessage);
    socketRef.current.off("newMessage", handleReceiveMessage);

    socketRef.current.on("receive_message", handleReceiveMessage);
    socketRef.current.on("newMessage", handleReceiveMessage);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave_order", activeOrderId);
        socketRef.current.off("receive_message", handleReceiveMessage);
        socketRef.current.off("newMessage", handleReceiveMessage);
        socketRef.current.off("connect", joinRoom);
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.io.off("reconnect", joinRoom);
        socketRef.current.disconnect();
      }
    };
  }, [activeOrderId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Envío con Fallback HTTP REST
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const cleanText = text.trim();
    if (!cleanText || !activeOrderId) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const messageData = {
      _id: tempId,
      tempId,
      orderId: activeOrderId,
      senderRole: role,
      senderType: role,
      senderName: name,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    // Renderizado optimista
    setMessages((prev) => [...prev, messageData]);
    setText("");

    let sentViaSocket = false;

    // Intentar envío vía Socket
    if (socketRef.current && socketRef.current.connected) {
      try {
        socketRef.current.emit("send_message", messageData);
        sentViaSocket = true;
      } catch (err) {
        console.warn(
          "Fallo emitiendo por socket, enviando vía HTTP REST...",
          err,
        );
      }
    }

    // Respaldo vía HTTP POST
    if (!sentViaSocket) {
      try {
        await fetch(`${BASE_URL}/api/orders/${activeOrderId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tempId,
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
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3"
      style={{ zIndex: 1060 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm h-[520px] max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="bg-orange-500 text-white p-3.5 flex justify-between items-center shadow-md shrink-0">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              💬 Chat Carrera #{(activeOrderId || "").toString().slice(-4)}
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
                title={
                  isConnected ? "Socket Conectado" : "Conectando Socket..."
                }
              />
            </h3>
            <p className="text-[11px] text-orange-100">
              {isConnected ? "En línea" : "Modo Respaldo (HTTP)"}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="bg-orange-600 hover:bg-orange-700 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 text-xs mt-12">
              <p>📍 Chat activo entre Cliente y Motocarro.</p>
              <p className="text-[11px] mt-1 text-gray-400">
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
                  key={msg._id || msg.tempId || index}
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[10px] font-bold text-gray-600">
                      {msg.senderName}
                    </span>
                    <span
                      className={`text-[8px] px-1.5 py-0.2 rounded-full font-semibold ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs shadow-xs relative ${
                      isMe
                        ? "bg-orange-500 text-white rounded-tr-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </div>
                    <span
                      className={`block text-[8px] mt-0.5 text-right ${
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

        {/* Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-2.5 bg-white border-t border-gray-100 flex gap-2 shrink-0"
        >
          <input
            type="text"
            placeholder="Escribe un mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-slate-800"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            Enviar 🚀
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrderChatModal;
