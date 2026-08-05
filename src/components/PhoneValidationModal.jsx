import React, { useState, useEffect } from "react";
import { Phone, ShieldCheck, ArrowRight, User } from "lucide-react";

export default function PhoneValidationModal({ onValidated }) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState(1); // 1: Datos, 2: PIN
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Validación de número de celular colombiano (10 dígitos empezando por 3)
  const isPhoneValid = /^3\d{9}$/.test(phone);

  const handleSendCode = (e) => {
    e.preventDefault();
    if (!isPhoneValid) {
      setError(
        "Ingresa un número de celular válido de 10 dígitos (ej: 3101234567).",
      );
      return;
    }
    setError("");
    setLoading(true);

    // Simulación de envío de PIN (puedes conectar tu endpoint del backend aquí)
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 800);
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError("El PIN debe ser de 4 dígitos.");
      return;
    }

    // Guardado persistente único
    localStorage.setItem("userPhone", phone);
    if (name.trim()) localStorage.setItem("userName", name.trim());

    if (onValidated) {
      onValidated({ phone, name: name.trim() });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 text-gray-800 space-y-5">
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
            {step === 1 ? (
              <Phone className="w-7 h-7" />
            ) : (
              <ShieldCheck className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            {step === 1 ? "Verifica tu Celular" : "Confirma el Código"}
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            {step === 1
              ? "Para pedir carreritas o domicilios en Inírida, necesitamos confirmar tu número una única vez."
              : `Ingresa el PIN de prueba enviado al ${phone}`}
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl font-medium text-center border border-red-100">
            ⚠️ {error}
          </div>
        )}

        {/* PASO 1: Captura de Celular y Nombre */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                Celular / WhatsApp *
              </label>
              <div className="relative">
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="3101234567"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 focus:bg-white transition-all pl-10"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">
                Tu Nombre (Opcional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pedro Perez"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all pl-10"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPhoneValid}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm flex items-center justify-center space-x-2 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
            >
              <span>{loading ? "Procesando..." : "Continuar"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* PASO 2: Confirmación PIN */}
        {step === 2 && (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <input
                type="text"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="0000"
                className="w-full text-center tracking-widest text-2xl font-mono bg-gray-50 border border-gray-200 rounded-xl py-3 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm"
            >
              Validar e Iniciar
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-xs text-gray-500 hover:underline text-center block"
            >
              Cambiar número de celular
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
