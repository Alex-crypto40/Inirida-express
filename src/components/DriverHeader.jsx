import React, { useState, useRef, useEffect } from "react";
import {
  Power,
  Wallet,
  User,
  LogOut,
  History,
  ChevronDown,
  MapPin,
} from "lucide-react";

// ============================================================================
// DRIVER HEADER — VERSIÓN PRO
// ============================================================================

export default function DriverHeader({
  driverName = "Conductor",
  isOnline,
  setIsOnline,
  gpsAccuracy,
  walletBalance = 0,
  onOpenWallet,
  onOpenHistory,
  onLogout,
}) {
  // --------------------------------------------------------------------------
  // ESTADO DEL MENÚ
  // --------------------------------------------------------------------------
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Referencia del contenedor del perfil.

  const menuRef = useRef(null);

  // --------------------------------------------------------------------------
  // OBTENER INICIALES DEL CONDUCTOR
  // --------------------------------------------------------------------------
  const getInitials = (name) => {
    if (!name || name === "Conductor") return "C";

    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0][0]?.toUpperCase() || "C";
    }

    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

  // --------------------------------------------------------------------------
  // FORMATEAR SALDO
  // --------------------------------------------------------------------------
  const formattedBalance = Number(walletBalance || 0).toLocaleString("es-CO");

  // --------------------------------------------------------------------------
  // ESTADO GPS
  // --------------------------------------------------------------------------
  const gpsStatus = isOnline
    ? gpsAccuracy
      ? `GPS activo · ±${Math.round(gpsAccuracy)} m`
      : "Conectado · buscando GPS..."
    : "Fuera de servicio";

  // --------------------------------------------------------------------------
  // CERRAR MENÚ AL HACER CLIC FUERA
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --------------------------------------------------------------------------
  // CERRAR MENÚ CON ESCAPE
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // --------------------------------------------------------------------------
  // TOGGLE DEL MENÚ
  // --------------------------------------------------------------------------
  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  // --------------------------------------------------------------------------
  // ABRIR HISTORIAL
  // --------------------------------------------------------------------------
  const handleOpenHistory = () => {
    setIsMenuOpen(false);

    if (typeof onOpenHistory === "function") {
      onOpenHistory();
    }
  };

  // --------------------------------------------------------------------------
  // CERRAR SESIÓN
  // --------------------------------------------------------------------------
  const handleLogout = () => {
    setIsMenuOpen(false);

    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  // --------------------------------------------------------------------------
  // CAMBIAR DISPONIBILIDAD
  // --------------------------------------------------------------------------
  const handleToggleOnline = () => {
    setIsOnline((prev) => !prev);
  };

  return (
    <header
      className="
        sticky top-0 z-30
        w-full
        bg-slate-950/95
        border-b border-slate-800/80
        backdrop-blur-xl
        shadow-lg shadow-black/10
      "
    >
      <div
        className="
          px-3 py-2.5
          flex items-center justify-between
          gap-2
          max-w-2xl
          mx-auto
        "
      >
        {/* ==================================================================
            PERFIL DEL CONDUCTOR
        ================================================================== */}
        <div ref={menuRef} className="relative shrink-0">
          {/* --------------------------------------------------------------
              BOTÓN PRINCIPAL DEL PERFIL
          -------------------------------------------------------------- */}
          <button
            type="button"
            onClick={toggleMenu}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="Abrir menú del conductor"
            className="
              group
              flex items-center
              gap-1.5
              p-1
              rounded-xl
              bg-slate-900/80
              border border-slate-800
              hover:border-slate-700
              hover:bg-slate-800
              active:scale-[0.98]
              transition-all duration-200
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-amber-500/60
            "
          >
            {/* AVATAR */}
            <div className="relative shrink-0">
              <div
                className="
                  w-9 h-9
                  rounded-xl
                  bg-gradient-to-br
                  from-amber-400
                  via-amber-500
                  to-orange-500
                  text-slate-950
                  font-black
                  text-xs
                  flex items-center justify-center
                  shadow-md
                  shadow-amber-500/10
                "
              >
                {getInitials(driverName)}
              </div>

              {/* INDICADOR ONLINE/OFFLINE */}
              <span
                className={`
                  absolute
                  -top-1
                  -right-1
                  w-3
                  h-3
                  rounded-full
                  border-2
                  border-slate-950
                  ${
                    isOnline
                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                      : "bg-red-500"
                  }
                `}
              />

              {/* Pequeño pulso cuando está disponible */}
              {isOnline && (
                <span
                  className="
                    absolute
                    -top-1
                    -right-1
                    w-3
                    h-3
                    rounded-full
                    bg-emerald-500
                    opacity-40
                    animate-ping
                  "
                />
              )}
            </div>

            {/* FLECHA */}
            <ChevronDown
              className={`
                w-3.5 h-3.5
                text-slate-500
                mr-0.5
                transition-transform duration-200
                ${isMenuOpen ? "rotate-180 text-amber-400" : ""}
              `}
            />
          </button>

          {/* ==================================================================
              MENÚ FLOTANTE DEL CONDUCTOR
          ================================================================== */}
          {isMenuOpen && (
            <div
              role="menu"
              aria-label="Menú del conductor"
              className="
                absolute
                left-0
                top-[calc(100%+10px)]
                w-[min(280px,calc(100vw-24px))]
                bg-slate-900
                border border-slate-800
                rounded-2xl
                shadow-2xl
                shadow-black/40
                overflow-hidden
                z-50

                animate-in
                fade-in
                zoom-in-95
                slide-in-from-top-2
                duration-200
              "
            >
              {/* --------------------------------------------------------------
                  PEQUEÑO INDICADOR SUPERIOR
                  Da sensación de menú conectado al avatar.
              -------------------------------------------------------------- */}
              <div
                className="
                  absolute
                  -top-1.5
                  left-5
                  w-3
                  h-3
                  rotate-45
                  bg-slate-900
                  border-l
                  border-t
                  border-slate-800
                "
              />

              {/* --------------------------------------------------------------
                  CABECERA DEL PERFIL
              -------------------------------------------------------------- */}
              <div
                className="
                  relative
                  px-4
                  pt-4
                  pb-3.5
                  bg-gradient-to-br
                  from-slate-900
                  to-slate-950
                  border-b
                  border-slate-800
                "
              >
                <div className="flex items-center gap-3">
                  {/* AVATAR GRANDE */}
                  <div className="relative shrink-0">
                    <div
                      className="
                        w-11 h-11
                        rounded-xl
                        bg-gradient-to-br
                        from-amber-400
                        to-orange-500
                        text-slate-950
                        font-black
                        text-sm
                        flex items-center justify-center
                        shadow-lg
                      "
                    >
                      {getInitials(driverName)}
                    </div>

                    <span
                      className={`
                        absolute
                        -bottom-0.5
                        -right-0.5
                        w-3
                        h-3
                        rounded-full
                        border-2
                        border-slate-900
                        ${isOnline ? "bg-emerald-500" : "bg-red-500"}
                      `}
                    />
                  </div>

                  {/* INFORMACIÓN */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className="
                          text-[10px]
                          uppercase
                          tracking-wider
                          font-bold
                          text-slate-500
                        "
                      >
                        Perfil conductor
                      </p>

                      <span
                        className="
                          text-[9px]
                          bg-amber-500/10
                          text-amber-400
                          border
                          border-amber-500/20
                          px-1.5
                          py-0.5
                          rounded
                          font-mono
                          font-black
                        "
                      >
                        PRO
                      </span>
                    </div>

                    <p
                      className="
                        text-sm
                        font-extrabold
                        text-slate-100
                        mt-0.5
                        truncate
                      "
                    >
                      {driverName}
                    </p>

                    {/* ESTADO GPS */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`
                          w-1.5
                          h-1.5
                          rounded-full
                          shrink-0
                          ${isOnline ? "bg-emerald-500" : "bg-red-500"}
                        `}
                      />

                      <p
                        className={`
                          text-[10px]
                          font-medium
                          truncate
                          ${isOnline ? "text-emerald-400" : "text-red-400"}
                        `}
                      >
                        {gpsStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* --------------------------------------------------------------
                  OPCIONES
              -------------------------------------------------------------- */}
              <div className="p-2">
                {/* HISTORIAL */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleOpenHistory}
                  className="
                    w-full
                    flex items-center
                    gap-3
                    px-3
                    py-2.5
                    rounded-xl
                    text-left
                    text-slate-300
                    hover:text-white
                    hover:bg-slate-800
                    active:bg-slate-800
                    transition-all
                    group
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-amber-500/50
                  "
                >
                  <span
                    className="
                      w-8 h-8
                      rounded-lg
                      bg-amber-500/10
                      border border-amber-500/10
                      flex items-center justify-center
                      shrink-0
                      group-hover:bg-amber-500/15
                      transition-colors
                    "
                  >
                    <History className="w-4 h-4 text-amber-400" />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span
                      className="
                        block
                        text-xs
                        font-bold
                        text-slate-200
                      "
                    >
                      Historial de carreras
                    </span>

                    <span
                      className="
                        block
                        text-[9px]
                        text-slate-500
                        mt-0.5
                      "
                    >
                      Consulta tus servicios realizados
                    </span>
                  </span>

                  <span
                    className="
                      text-slate-600
                      text-lg
                      group-hover:text-amber-400
                      group-hover:translate-x-0.5
                      transition-all
                    "
                  >
                    ›
                  </span>
                </button>

                {/* SEPARADOR */}
                <div className="h-px bg-slate-800/80 my-1.5" />

                {/* CERRAR SESIÓN */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="
                    w-full
                    flex items-center
                    gap-3
                    px-3
                    py-2.5
                    rounded-xl
                    text-left
                    text-red-400
                    hover:bg-red-500/10
                    hover:text-red-300
                    active:bg-red-500/15
                    transition-all
                    group
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-red-500/40
                  "
                >
                  <span
                    className="
                      w-8 h-8
                      rounded-lg
                      bg-red-500/10
                      border border-red-500/10
                      flex items-center justify-center
                      shrink-0
                    "
                  >
                    <LogOut className="w-4 h-4" />
                  </span>

                  <span className="flex-1">
                    <span className="block text-xs font-bold">
                      Cerrar sesión
                    </span>

                    <span
                      className="
                        block
                        text-[9px]
                        text-red-400/50
                        mt-0.5
                      "
                    >
                      Salir de tu cuenta
                    </span>
                  </span>
                </button>
              </div>

              {/* --------------------------------------------------------------
                  FOOTER DISCRETO
              -------------------------------------------------------------- */}
              <div
                className="
                  px-4
                  py-2
                  bg-slate-950/70
                  border-t
                  border-slate-800/70
                  flex
                  items-center
                  justify-between
                "
              >
                <span
                  className="
                    text-[8px]
                    uppercase
                    tracking-widest
                    text-slate-600
                    font-bold
                  "
                >
                  Inírida Express
                </span>

                <span
                  className="
                    text-[8px]
                    text-slate-600
                    font-mono
                  "
                >
                  DRIVER PRO
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================================
            ACCIONES RÁPIDAS
        ================================================================== */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* --------------------------------------------------------------
              BILLETERA
          -------------------------------------------------------------- */}
          <button
            type="button"
            onClick={onOpenWallet}
            aria-label={`Abrir billetera. Saldo ${formattedBalance} pesos`}
            title="Abrir billetera"
            className="
              group
              flex items-center
              gap-1.5
              px-2.5
              py-1.5
              rounded-xl
              bg-slate-900
              border border-amber-500/25
              hover:border-amber-500/45
              hover:bg-slate-800
              text-amber-400
              transition-all duration-200
              active:scale-[0.97]
              focus:outline-none
              focus-visible:ring-2
              focus-visible:ring-amber-500/50
            "
          >
            <Wallet
              className="
                w-3.5 h-3.5
                shrink-0
                group-hover:scale-105
                transition-transform
              "
            />

            <span className="text-xs font-black tracking-tight">
              ${formattedBalance}
            </span>
          </button>

          {/* --------------------------------------------------------------
              DISPONIBILIDAD
          -------------------------------------------------------------- */}
          <button
            type="button"
            onClick={handleToggleOnline}
            aria-pressed={isOnline}
            aria-label={
              isOnline ? "Cambiar a fuera de servicio" : "Ponerse disponible"
            }
            title={
              isOnline ? "Cambiar a fuera de servicio" : "Ponerse disponible"
            }
            className={`
              flex
              items-center
              gap-1.5
              px-2.5
              py-1.5
              rounded-xl
              text-xs
              font-black
              tracking-tight
              transition-all
              duration-200
              active:scale-[0.97]
              focus:outline-none
              focus-visible:ring-2
              ${
                isOnline
                  ? `
                    bg-emerald-500/10
                    text-emerald-400
                    border border-emerald-500/30
                    hover:bg-emerald-500/15
                    hover:border-emerald-500/45
                    focus-visible:ring-emerald-500/50
                  `
                  : `
                    bg-red-500/10
                    text-red-400
                    border border-red-500/30
                    hover:bg-red-500/15
                    hover:border-red-500/45
                    focus-visible:ring-red-500/50
                  `
              }
            `}
          >
            {/* INDICADOR */}
            <span className="relative flex w-3.5 h-3.5 items-center justify-center">
              <span
                className={`
                  absolute
                  w-1.5
                  h-1.5
                  rounded-full
                  ${isOnline ? "bg-emerald-400" : "bg-red-400"}
                `}
              />

              {isOnline && (
                <span
                  className="
                    absolute
                    w-3.5
                    h-3.5
                    rounded-full
                    bg-emerald-400/20
                    animate-ping
                  "
                />
              )}
            </span>

            {/* ICONO */}
            <Power className="w-3.5 h-3.5 shrink-0" />

            {/* TEXTO */}
            <span className="hidden min-[350px]:inline">
              {isOnline ? "DISPONIBLE" : "OFFLINE"}
            </span>

            {/* Versión corta en móviles muy pequeños */}
            <span className="inline min-[350px]:hidden">
              {isOnline ? "ON" : "OFF"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
