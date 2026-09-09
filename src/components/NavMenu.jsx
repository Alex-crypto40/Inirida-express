import React, { useEffect, useRef } from "react";
import {
  Package,
  Settings,
  LogOut,
  User,
  X,
  ChevronRight,
  ShieldCheck,
  Phone,
  CircleCheck,
} from "lucide-react";

export const NavMenu = ({
  menuAbierto,
  setMenuAbierto,
  setMostrarHistorial,
  setMostrarPerfil,
  cerrarSesion,
  usuario,
}) => {
  const menuRef = useRef(null);

  // ============================================================
  // CERRAR CON ESCAPE
  // ============================================================
  useEffect(() => {
    if (!menuAbierto) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuAbierto(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuAbierto, setMenuAbierto]);

  // ============================================================
  // CERRAR AL HACER CLIC FUERA
  // ============================================================
  useEffect(() => {
    if (!menuAbierto) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuAbierto, setMenuAbierto]);

  if (!menuAbierto) return null;

  // ============================================================
  // DATOS DEL USUARIO
  // ============================================================
  const tieneNombre = Boolean(usuario?.nombre?.trim());

  const nombreOMovil = tieneNombre
    ? usuario.nombre
    : usuario?.telefono || "Cliente Inírida";

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleCerrarMenu = () => {
    setMenuAbierto(false);
  };

  const handleHistorial = () => {
    setMenuAbierto(false);

    if (setMostrarHistorial) {
      setMostrarHistorial(true);
    }
  };

  const handlePerfil = () => {
    setMenuAbierto(false);

    if (setMostrarPerfil) {
      setMostrarPerfil(true);
    }
  };

  const handleCerrarSesion = () => {
    setMenuAbierto(false);

    if (cerrarSesion) {
      cerrarSesion();
    }
  };

  // ============================================================
  // COMPONENTE INTERNO PARA OPCIONES DEL MENÚ
  // ============================================================
  const MenuItem = ({
    icon: Icon,
    title,
    description,
    onClick,
    variant = "default",
  }) => {
    const styles = {
      default: {
        wrapper:
          "hover:bg-slate-50 active:bg-slate-100 border border-transparent hover:border-slate-100",
        icon: "bg-slate-100 text-slate-600 group-hover:bg-orange-50 group-hover:text-orange-600",
        title: "text-slate-700 group-hover:text-slate-900",
        arrow:
          "text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5",
      },

      orange: {
        wrapper:
          "hover:bg-orange-50/70 active:bg-orange-100/70 border border-transparent hover:border-orange-100",
        icon: "bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white",
        title: "text-slate-700 group-hover:text-orange-700",
        arrow:
          "text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5",
      },
    };

    const current = styles[variant] || styles.default;

    return (
      <button
        type="button"
        role="menuitem"
        onClick={onClick}
        className={`
          group
          w-full
          flex
          items-center
          justify-between
          gap-2.5
          px-2
          py-2
          rounded-xl
          text-left
          transition-all
          duration-150
          active:scale-[0.98]
          cursor-pointer
          ${current.wrapper}
        `}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`
              w-8
              h-8
              rounded-[10px]
              flex
              items-center
              justify-center
              shrink-0
              transition-all
              duration-150
              ${current.icon}
            `}
          >
            <Icon className="w-4 h-4 stroke-[2.2]" />
          </div>

          <div className="min-w-0">
            <p
              className={`
                text-[11px]
                font-extrabold
                leading-tight
                transition-colors
                ${current.title}
              `}
            >
              {title}
            </p>

            {description && (
              <p className="text-[9px] text-slate-400 leading-tight mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        <ChevronRight
          className={`
            w-3.5
            h-3.5
            shrink-0
            transition-all
            duration-150
            ${current.arrow}
          `}
        />
      </button>
    );
  };

  return (
    <>
      {/* ========================================================
          BACKDROP
          Mantiene la página protegida mientras el menú está abierto.
      ======================================================== */}
      <div
        className="
          fixed
          inset-0
          z-[90]
          bg-slate-950/35
          backdrop-blur-[2px]
          animate-in
          fade-in
          duration-150
        "
        onClick={handleCerrarMenu}
        aria-hidden="true"
      />

      {/* ========================================================
          MENÚ PRINCIPAL
          Se mantiene como tarjeta compacta debajo del Navbar.
      ======================================================== */}
      <aside
        ref={menuRef}
        role="menu"
        aria-label="Menú de usuario"
        className="
          absolute
          top-[62px]
          right-3
          z-[100]

          w-[245px]

          overflow-hidden
          rounded-2xl

          bg-white

          border
          border-slate-200/80

          shadow-[0_18px_45px_rgba(15,23,42,0.16)]

          ring-1
          ring-black/[0.03]

          origin-top-right

          animate-in
          fade-in
          zoom-in-95
          slide-in-from-top-1
          duration-150
        "
      >
        {/* ======================================================
            CABECERA DEL USUARIO
        ====================================================== */}
        <div className="px-3.5 pt-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar */}
              <div
                className="
                  relative
                  w-10
                  h-10
                  rounded-xl
                  bg-gradient-to-br
                  from-orange-500
                  to-orange-600
                  text-white
                  flex
                  items-center
                  justify-center
                  shrink-0
                  shadow-sm
                  shadow-orange-500/20
                "
              >
                {tieneNombre ? (
                  <User className="w-[18px] h-[18px] stroke-[2.3]" />
                ) : (
                  <Phone className="w-[17px] h-[17px] stroke-[2.3]" />
                )}

                {/* Indicador de cuenta activa */}
                <span
                  className="
                    absolute
                    -right-0.5
                    -top-0.5
                    w-2.5
                    h-2.5
                    rounded-full
                    bg-emerald-500
                    border-2
                    border-white
                  "
                />
              </div>

              {/* Datos */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="
                      text-[8px]
                      font-black
                      uppercase
                      tracking-[0.08em]
                      text-orange-600
                    "
                  >
                    Cliente
                  </span>

                  <span className="w-1 h-1 rounded-full bg-slate-300" />

                  <span className="text-[8px] font-semibold text-emerald-600">
                    Activo
                  </span>
                </div>

                <h3
                  className="
                    text-[12px]
                    font-black
                    text-slate-800
                    leading-tight
                    truncate
                  "
                >
                  {nombreOMovil}
                </h3>

                {usuario?.telefono && tieneNombre && (
                  <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                    {usuario.telefono}
                  </p>
                )}
              </div>
            </div>

            {/* Cerrar */}
            <button
              type="button"
              onClick={handleCerrarMenu}
              aria-label="Cerrar menú"
              className="
                w-7
                h-7
                rounded-lg
                flex
                items-center
                justify-center
                text-slate-400
                hover:text-slate-700
                hover:bg-slate-100
                active:scale-95
                transition-all
                cursor-pointer
                shrink-0
              "
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          {/* Estado de cuenta */}
          <div
            className="
              mt-2.5
              flex
              items-center
              gap-1.5
              px-2.5
              py-1.5
              rounded-lg
              bg-slate-50
              border
              border-slate-100
            "
          >
            <CircleCheck className="w-3 h-3 text-emerald-500 shrink-0" />

            <span className="text-[8.5px] font-semibold text-slate-500">
              Cuenta activa en Inírida Express
            </span>
          </div>
        </div>

        {/* ======================================================
            SEPARADOR
        ====================================================== */}
        <div className="h-px bg-slate-100" />

        {/* ======================================================
            NAVEGACIÓN
        ====================================================== */}
        <div className="px-2 py-2">
          <p
            className="
              px-2
              mb-1
              text-[8px]
              font-black
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            Mi cuenta
          </p>

          {/* MIS PEDIDOS */}
          <MenuItem
            icon={Package}
            title="Mis pedidos"
            description="Historial de servicios"
            onClick={handleHistorial}
            variant="orange"
          />

          {/* MI PERFIL */}
          <MenuItem
            icon={Settings}
            title="Mi perfil"
            description="Datos y lugares guardados"
            onClick={handlePerfil}
          />
        </div>

        {/* ======================================================
            CERRAR SESIÓN
        ====================================================== */}
        <div className="px-2 pb-2">
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleCerrarSesion}
              className="
                group
                w-full
                flex
                items-center
                gap-2.5
                px-2
                py-2
                rounded-xl
                text-left

                bg-red-50/50
                border
                border-red-100/70

                hover:bg-red-50
                hover:border-red-200

                active:scale-[0.98]

                transition-all
                duration-150

                cursor-pointer
              "
            >
              <div
                className="
                  w-8
                  h-8
                  rounded-[10px]
                  bg-red-100
                  text-red-500
                  flex
                  items-center
                  justify-center
                  shrink-0
                  transition-all
                  duration-150
                  group-hover:bg-red-500
                  group-hover:text-white
                "
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold text-red-500 leading-tight">
                  Cerrar sesión
                </p>

                <p className="text-[9px] text-red-300 mt-0.5">
                  Salir de tu cuenta
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ======================================================
            FOOTER DE MARCA
        ====================================================== */}
        <div
          className="
            h-7
            border-t
            border-slate-100
            bg-slate-50/60
            flex
            items-center
            justify-center
            gap-1
          "
        >
          <ShieldCheck className="w-3 h-3 text-orange-500" />

          <span
            className="
              text-[7.5px]
              font-black
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            Inírida Express
          </span>
        </div>
      </aside>
    </>
  );
};
