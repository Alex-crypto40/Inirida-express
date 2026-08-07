import { useState } from "react";

function PhoneValidationModal({ onValidated }) {
  const [step, setStep] = useState(1); // 1: Pedir Teléfono, 2: Pedir PIN
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const baseUrl =
    import.meta.env.VITE_API_URL || "https://inirida-express.onrender.com";

  // Paso 1: Enviar PIN por WhatsApp
  const handleSendPin = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setErrorMsg("Ingresa un número de celular válido (10 dígitos).");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanBaseUrl}/api/auth/send-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), name: name.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep(2);
      } else {
        setErrorMsg(data.message || "Error al enviar el PIN por WhatsApp.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Validar PIN ingresado
  const handleVerifyPin = async (e) => {
    e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      setErrorMsg("Ingresa el PIN de 4 dígitos.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
      const res = await fetch(`${cleanBaseUrl}/api/auth/verify-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), pin: pinInput.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("userPhone", phone.trim());
        if (name.trim()) localStorage.setItem("userName", name.trim());

        onValidated({ phone: phone.trim(), name: name.trim() });
      } else {
        setErrorMsg(data.message || "PIN incorrecto. Intenta de nuevo.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al validar el PIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // 'fixed inset-0 z-[9999]' asegura que cubra la pantalla completa tanto en PC como en celular
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-5 border border-gray-100">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-xl">
            {step === 1 ? "📲" : "🛡️"}
          </div>
          <h3 className="font-black text-lg text-gray-800">
            {step === 1 ? "Verifica tu Celular" : "Confirma el Código"}
          </h3>
          <p className="text-xs text-gray-500 leading-tight">
            {step === 1
              ? "Te enviaremos un PIN de 4 dígitos a tu WhatsApp."
              : `Ingresa el PIN enviado al WhatsApp +57 ${phone}`}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-xs font-semibold p-2.5 rounded-xl text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendPin} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                Celular / WhatsApp *
              </label>
              <input
                type="tel"
                placeholder="Ej: 3101234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-amber-500 outline-none font-bold text-gray-800 text-center"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                Tu Nombre (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Pedro Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-amber-500 outline-none font-medium text-gray-800 text-center"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-sm shadow-md shadow-amber-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Enviando PIN..." : "Enviar Código por WhatsApp 💬"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <input
                type="text"
                maxLength={4}
                placeholder="0 0 0 0"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full p-3.5 text-2xl font-black tracking-[0.5em] text-center rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 outline-none text-emerald-600"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Validando..." : "Validar e Iniciar"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setErrorMsg("");
              }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 font-semibold"
            >
              ← Cambiar número de celular
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default PhoneValidationModal;