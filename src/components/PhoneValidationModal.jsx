import { useState, useEffect } from "react";

function PhoneValidationModal({ onValidated }) {
  const [countryCode, setCountryCode] = useState("+57");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [generatedPin, setGeneratedPin] = useState("");
  const [userPin, setUserPin] = useState("");
  const [step, setStep] = useState(1); // 1: Datos, 2: PIN
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Estado para desplegar los términos completos
  const [showTermsModal, setShowTermsModal] = useState(false);

  const generateNewPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedPin(pin);
    setUserPin("");
  };

  useEffect(() => {
    generateNewPin();
  }, []);

  const handleNextStep = (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, "");

    if (countryCode === "+57") {
      if (cleanPhone.length !== 10 || !cleanPhone.startsWith("3")) {
        setErrorMsg(
          "Ingresa un número colombiano válido (10 dígitos arrancando en 3).",
        );
        return;
      }
    } else {
      if (cleanPhone.length < 7 || cleanPhone.length > 14) {
        setErrorMsg("Ingresa un número internacional válido.");
        return;
      }
    }

    if (!acceptedTerms) {
      setErrorMsg("Debes aceptar los Términos y Condiciones.");
      return;
    }

    setErrorMsg("");
    setStep(2);
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();

    if (userPin.trim() !== generatedPin) {
      setErrorMsg("El código PIN ingresado no coincide. Intenta de nuevo.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    // Pausa visual de 2 segundos
    setTimeout(() => {
      setLoading(false);
      setIsSuccess(true); // Mostrar tarjeta de éxito

      // 1.5 segundos en la pantalla de éxito antes de redirigir
      setTimeout(() => {
        const fullPhone = `${countryCode}${phone.trim().replace(/\D/g, "")}`;
        localStorage.setItem("userPhone", fullPhone);
        localStorage.setItem("termsAccepted", "true");
        onValidated({ phone: fullPhone });
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full space-y-4 border border-gray-100 relative transition-all">
        {/* ENCABEZADO */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-xl">
            {isSuccess ? "✅" : step === 1 ? "📱" : "🔐"}
          </div>
          <h3 className="font-black text-lg text-gray-800">
            {isSuccess
              ? "¡Validación Exitosa!"
              : step === 1
                ? "Ingresa a Inírida Express"
                : "Verificación de Seguridad"}
          </h3>
          <p className="text-xs text-gray-500 leading-snug">
            {isSuccess
              ? "Tu número ha sido autenticado correctamente."
              : step === 1
                ? "Ingresa tu número para coordinar tus domicilios y carreras."
                : "Ingresa el PIN de seguridad que aparece abajo para continuar."}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-xs font-semibold p-2.5 rounded-xl text-center border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* PANTALLA DE ÉXITO */}
        {isSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-2 animate-fade-in">
            <span className="text-emerald-700 font-extrabold text-sm block">
              Número Verificado Exitosamente
            </span>
            <p className="text-[11px] text-emerald-600 font-medium">
              Redirigiendo a la plataforma...
            </p>
          </div>
        ) : (
          <>
            {/* PASO 1: Captura de Celular + País */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                    Número de Celular *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="p-3.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
                    >
                      <option value="+57">🇨🇴 +57</option>
                      <option value="+58">🇻🇪 +58</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+">🌐 Otro</option>
                    </select>
                    <input
                      type="tel"
                      maxLength={15}
                      placeholder={
                        countryCode === "+57" ? "3101234567" : "Número"
                      }
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3.5 text-base rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-amber-500 outline-none font-bold text-gray-800 text-center tracking-wider"
                      required
                    />
                  </div>
                </div>

                {/* Casilla de Términos con enlace interactivo */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    required
                  />
                  <label
                    htmlFor="terms"
                    className="text-[11px] text-gray-500 leading-snug cursor-pointer"
                  >
                    Acepto los{" "}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="font-bold text-amber-600 underline hover:text-amber-700"
                    >
                      Términos y Condiciones
                    </button>{" "}
                    del servicio.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!acceptedTerms}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl text-sm shadow-md shadow-amber-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  Continuar ➔
                </button>
              </form>
            )}

            {/* PASO 2: Confirmación con PIN */}
            {step === 2 && (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">
                    Tu Código PIN
                  </span>
                  <div className="text-2xl font-black text-amber-600 tracking-[0.3em]">
                    {generatedPin}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1 text-center">
                    Escribe el PIN mostrado arriba
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="0000"
                    value={userPin}
                    onChange={(e) => setUserPin(e.target.value)}
                    className="w-full p-3 text-xl rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-amber-500 outline-none font-black text-gray-800 text-center tracking-[0.4em]"
                    autoFocus
                    disabled={loading}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setStep(1);
                      generateNewPin();
                    }}
                    className="w-1/3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={loading || userPin.length !== 4}
                    className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <span>
                      {loading
                        ? "Validando número..."
                        : "Validar e Ingresar 🛵"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* VENTANA FLOTANTE CON LOS TÉRMINOS Y CONDICIONES COMPLETOS */}
        {showTermsModal && (
          <div className="absolute inset-0 bg-white rounded-3xl p-5 flex flex-col justify-between z-20 border border-gray-200 shadow-2xl">
            <div className="space-y-3 overflow-y-auto max-h-[280px] pr-1 text-left">
              <h4 className="font-extrabold text-sm text-gray-800 border-b pb-1">
                Términos, Condiciones y Privacidad
              </h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                <strong>1. Uso del Servicio:</strong> Inírida Express facilita
                la conexión entre usuarios y domiciliarios locales. Al
                continuar, autorizas el uso de tu número celular para la
                coordinación de carreras y envíos.
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                <strong>2. Tratamiento de Datos:</strong> Tu número celular será
                procesado únicamente para fines operativos de entrega y no será
                compartido con terceros.
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                <strong>3. Canal Voluntario:</strong> La interacción vía la
                plataforma se realiza de forma voluntaria por el usuario para
                validar la autenticidad del registro.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowTermsModal(false);
                setAcceptedTerms(true);
              }}
              className="w-full mt-3 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Entendido y Aceptar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhoneValidationModal;
