import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Save,
  X,
  Home,
  Briefcase,
  GraduationCap,
} from "lucide-react";

export const UserProfileModal = ({ onClose }) => {
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newAddressText, setNewAddressText] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Cargar datos guardados en localStorage
  useEffect(() => {
    const storedName = localStorage.getItem("customerName") || "";
    const storedPhone = localStorage.getItem("customerPhone") || "";
    const storedAddresses = localStorage.getItem("savedAddresses");

    setUserName(storedName);
    setUserPhone(storedPhone);

    if (storedAddresses) {
      try {
        setAddresses(JSON.parse(storedAddresses));
      } catch (e) {
        setAddresses([]);
      }
    } else {
      // Direcciones iniciales por defecto si no hay ninguna
      setAddresses([
        { id: "1", label: "Casa", address: "Barrio Centro" },
        { id: "2", label: "Trabajo", address: "SENA / Alcaldía" },
      ]);
    }
  }, []);

  // Guardar datos generales del perfil
  const handleSaveProfile = (e) => {
    e.preventDefault();
    localStorage.setItem("customerName", userName.trim());
    localStorage.setItem("customerPhone", userPhone.trim());
    localStorage.setItem("savedAddresses", JSON.stringify(addresses));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Agregar nueva dirección favorita
  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newAddressText.trim()) return;

    const newFav = {
      id: Date.now().toString(),
      label: newLabel.trim(),
      address: newAddressText.trim(),
    };

    const updated = [...addresses, newFav];
    setAddresses(updated);
    localStorage.setItem("savedAddresses", JSON.stringify(updated));

    setNewLabel("");
    setNewAddressText("");
    setShowAddAddress(false);
  };

  // Eliminar dirección favorita
  const handleDeleteAddress = (id) => {
    const updated = addresses.filter((item) => item.id !== id);
    setAddresses(updated);
    localStorage.setItem("savedAddresses", JSON.stringify(updated));
  };

  const getIconForLabel = (label) => {
    const lower = label.toLowerCase();
    if (lower.includes("casa"))
      return <Home className="w-4 h-4 text-orange-500" />;
    if (lower.includes("trabajo") || lower.includes("oficina"))
      return <Briefcase className="w-4 h-4 text-blue-500" />;
    if (
      lower.includes("sena") ||
      lower.includes("colegio") ||
      lower.includes("u")
    )
      return <GraduationCap className="w-4 h-4 text-emerald-500" />;
    return <MapPin className="w-4 h-4 text-orange-500" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-all duration-300">
      {/* ================================================================
        CAPA EXTERIOR
        Permite cerrar el modal al tocar fuera.
    ================================================================= */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* ================================================================
        MODAL PRINCIPAL
        En móvil funciona como Drawer inferior.
        En escritorio se convierte en Modal centrado.
    ================================================================= */}
      <div
        className="
        relative z-10
        w-full max-w-md
        h-[92vh] sm:h-[86vh]
        bg-slate-50
        rounded-t-[2rem] sm:rounded-3xl
        flex flex-col
        overflow-hidden
        shadow-2xl
        animate-in slide-in-from-bottom duration-300
      "
      >
        {/* ================================================================
          INDICADOR TÁCTIL — SOLO MÓVIL
      ================================================================= */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* ================================================================
          HEADER DEL PERFIL
      ================================================================= */}
        <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white px-5 py-5 shrink-0">
          {/* Decoración de fondo */}
          <div className="absolute -right-10 -top-12 w-36 h-36 rounded-full bg-white/10" />
          <div className="absolute -right-4 bottom-[-55px] w-32 h-32 rounded-full bg-white/5" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="
                w-11 h-11
                rounded-2xl
                bg-white/20
                border border-white/25
                backdrop-blur-md
                flex items-center justify-center
                shadow-lg
              "
              >
                <User className="w-5 h-5 text-white" />
              </div>

              <div>
                <h2 className="text-lg font-black tracking-tight leading-none">
                  Mi Perfil
                </h2>

                <p className="text-[10px] text-orange-100 mt-1 font-medium">
                  Tu información y lugares favoritos
                </p>
              </div>
            </div>

            {/* Botón cerrar */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar perfil"
              className="
              w-9 h-9
              rounded-xl
              bg-white/15
              hover:bg-white/25
              border border-white/20
              backdrop-blur-md
              flex items-center justify-center
              transition-all
              active:scale-90
              cursor-pointer
            "
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mini estado del perfil */}
          <div className="relative mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />

            <span className="text-[10px] text-white/90 font-semibold">
              Perfil activo
            </span>
          </div>
        </header>

        {/* ================================================================
          CONTENIDO SCROLLABLE
      ================================================================= */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* ================================================================
            MENSAJE DE ÉXITO
        ================================================================= */}
          {savedSuccess && (
            <div
              className="
              flex items-center gap-3
              px-3.5 py-3
              bg-emerald-50
              border border-emerald-200
              rounded-2xl
              shadow-sm
              animate-fadeIn
            "
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-emerald-600 text-sm font-black">✓</span>
              </div>

              <div>
                <p className="text-[11px] font-extrabold text-emerald-800">
                  Cambios guardados
                </p>

                <p className="text-[10px] text-emerald-600 mt-0.5">
                  Tu información fue actualizada correctamente.
                </p>
              </div>
            </div>
          )}

          {/* ================================================================
            INFORMACIÓN PERSONAL
        ================================================================= */}
          <section
            className="
            bg-white
            rounded-3xl
            border border-slate-200
            shadow-sm
            overflow-hidden
          "
          >
            {/* Título de sección */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-500" />
                </div>

                <div>
                  <h3 className="text-xs font-black text-slate-800">
                    Información personal
                  </h3>

                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Datos utilizados para tus servicios
                  </p>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveProfile} className="p-4 space-y-4">
              {/* ============================================================
                NOMBRE
            ============================================================= */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-black text-slate-500 mb-1.5">
                  Nombre completo
                </label>

                <div className="relative">
                  <div
                    className="
                    absolute left-3 top-1/2 -translate-y-1/2
                    w-7 h-7
                    rounded-lg
                    bg-slate-100
                    flex items-center justify-center
                  "
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>

                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="
                    w-full
                    h-11
                    pl-12 pr-3
                    rounded-xl
                    bg-slate-50
                    border border-slate-200
                    text-xs font-medium text-slate-800
                    placeholder:text-slate-400
                    outline-none
                    transition-all
                    focus:bg-white
                    focus:border-orange-400
                    focus:ring-4
                    focus:ring-orange-500/10
                  "
                    required
                  />
                </div>
              </div>

              {/* ============================================================
                TELÉFONO
            ============================================================= */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-black text-slate-500 mb-1.5">
                  Teléfono / WhatsApp
                </label>

                <div className="relative">
                  <div
                    className="
                    absolute left-3 top-1/2 -translate-y-1/2
                    w-7 h-7
                    rounded-lg
                    bg-slate-100
                    flex items-center justify-center
                  "
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                  </div>

                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="Ej. 314 307 7813"
                    className="
                    w-full
                    h-11
                    pl-12 pr-3
                    rounded-xl
                    bg-slate-50
                    border border-slate-200
                    text-xs font-medium text-slate-800
                    placeholder:text-slate-400
                    outline-none
                    transition-all
                    focus:bg-white
                    focus:border-orange-400
                    focus:ring-4
                    focus:ring-orange-500/10
                  "
                    required
                  />
                </div>
              </div>

              {/* ============================================================
                BOTÓN GUARDAR
            ============================================================= */}
              <button
                type="submit"
                className="
                w-full
                h-11
                bg-gradient-to-r from-orange-500 to-amber-500
                hover:from-orange-600 hover:to-amber-600
                active:scale-[0.98]
                text-white
                font-black
                text-xs
                rounded-xl
                shadow-lg shadow-orange-500/20
                transition-all
                flex items-center justify-center gap-2
                cursor-pointer
              "
              >
                <Save className="w-4 h-4" />
                Guardar cambios
              </button>
            </form>
          </section>

          {/* ================================================================
            LUGARES FRECUENTES
        ================================================================= */}
          <section
            className="
            bg-white
            rounded-3xl
            border border-slate-200
            shadow-sm
            overflow-hidden
          "
          >
            {/* Cabecera */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <span className="text-base">📍</span>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-800">
                      Lugares frecuentes
                    </h3>

                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Accede rápido a tus destinos
                    </p>
                  </div>
                </div>

                {!showAddAddress && (
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(true)}
                    className="
                    h-8
                    px-2.5
                    rounded-xl
                    bg-orange-50
                    hover:bg-orange-100
                    border border-orange-200
                    text-orange-600
                    text-[10px]
                    font-black
                    flex items-center gap-1.5
                    transition-all
                    active:scale-95
                    cursor-pointer
                  "
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar
                  </button>
                )}
              </div>
            </div>

            <div className="p-4">
              {/* ============================================================
                NUEVA DIRECCIÓN
            ============================================================= */}
              {showAddAddress && (
                <form
                  onSubmit={handleAddAddress}
                  className="
                  mb-4
                  p-3.5
                  rounded-2xl
                  bg-gradient-to-br
                  from-orange-50
                  to-amber-50
                  border border-orange-200
                  space-y-3
                  animate-fadeIn
                "
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-orange-900">
                        Nueva ubicación
                      </p>

                      <p className="text-[10px] text-orange-700/70 mt-0.5">
                        Guarda un lugar para usarlo rápidamente.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="
                      w-7 h-7
                      rounded-lg
                      bg-white/70
                      hover:bg-white
                      text-slate-400
                      hover:text-slate-600
                      flex items-center justify-center
                      transition-all
                      cursor-pointer
                    "
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Etiqueta */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-black text-orange-800 mb-1">
                      Nombre del lugar
                    </label>

                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Ej. Casa, Trabajo, Gimnasio"
                      className="
                      w-full
                      h-10
                      px-3
                      text-xs
                      rounded-xl
                      bg-white
                      border border-orange-100
                      outline-none
                      focus:border-orange-400
                      focus:ring-4
                      focus:ring-orange-500/10
                      transition-all
                    "
                      required
                    />
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider font-black text-orange-800 mb-1">
                      Dirección o referencia
                    </label>

                    <input
                      type="text"
                      value={newAddressText}
                      onChange={(e) => setNewAddressText(e.target.value)}
                      placeholder="Ej. Barrio Centro, cerca al parque"
                      className="
                      w-full
                      h-10
                      px-3
                      text-xs
                      rounded-xl
                      bg-white
                      border border-orange-100
                      outline-none
                      focus:border-orange-400
                      focus:ring-4
                      focus:ring-orange-500/10
                      transition-all
                    "
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="
                    w-full
                    h-10
                    bg-orange-500
                    hover:bg-orange-600
                    text-white
                    font-black
                    text-xs
                    rounded-xl
                    shadow-sm
                    transition-all
                    active:scale-[0.98]
                    cursor-pointer
                  "
                  >
                    Guardar ubicación
                  </button>
                </form>
              )}

              {/* ============================================================
                LISTADO DE DIRECCIONES
            ============================================================= */}
              {addresses.length === 0 ? (
                <div
                  className="
                  py-8
                  px-4
                  rounded-2xl
                  bg-slate-50
                  border border-dashed border-slate-200
                  text-center
                "
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <MapPin className="w-5 h-5 text-slate-300" />
                  </div>

                  <p className="text-xs font-bold text-slate-600">
                    Aún no tienes lugares guardados
                  </p>

                  <p className="text-[10px] text-slate-400 mt-1 max-w-[230px] mx-auto leading-relaxed">
                    Guarda tu casa, trabajo o lugares frecuentes para solicitar
                    carreras más rápido.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map((item) => (
                    <div
                      key={item.id}
                      className="
                      group
                      flex items-center justify-between
                      gap-3
                      p-3
                      rounded-2xl
                      bg-slate-50
                      hover:bg-orange-50/60
                      border border-slate-100
                      hover:border-orange-100
                      transition-all
                    "
                    >
                      {/* Información */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icono */}
                        <div
                          className="
                          w-10 h-10
                          rounded-xl
                          bg-white
                          border border-slate-200
                          flex items-center justify-center
                          shadow-sm
                          shrink-0
                        "
                        >
                          {getIconForLabel(item.label)}
                        </div>

                        {/* Texto */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-xs text-slate-800 truncate">
                              {item.label}
                            </p>

                            <span className="text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-600 shrink-0">
                              Guardado
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {item.address}
                          </p>
                        </div>
                      </div>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(item.id)}
                        title={`Eliminar ${item.label}`}
                        aria-label={`Eliminar ${item.label}`}
                        className="
                        w-8 h-8
                        rounded-xl
                        flex items-center justify-center
                        text-slate-300
                        hover:text-red-500
                        hover:bg-red-50
                        transition-all
                        active:scale-90
                        cursor-pointer
                        shrink-0
                      "
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ================================================================
            INFORMACIÓN INFERIOR
        ================================================================= */}
          <div
            className="
            flex items-center justify-center
            gap-2
            px-4 py-3
            text-[9px]
            text-slate-400
          "
          >
            <span>🔒</span>
            <span>
              Tus datos se utilizan para mejorar tu experiencia en Inírida
              Express.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
