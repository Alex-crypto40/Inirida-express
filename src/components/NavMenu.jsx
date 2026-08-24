import React, { useEffect } from "react";
import {
  Home,
  ClipboardList,
  User,
  BriefcaseBusiness,
  Bike,
  LogOut,
  ChevronRight,
  X,
  Store,
  ShieldCheck,
} from "lucide-react";

export const NavMenu = ({
  menuAbierto,
  setMenuAbierto,
  setMostrarHistorial,
  setMostrarPerfil,
  irAFormularioComercio,
  irAFormularioRepartidor,
  cerrarSesion,
}) => {
  useEffect(() => {
    if (!menuAbierto) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuAbierto(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuAbierto, setMenuAbierto]);

  if (!menuAbierto) return null;

  const handleInicio = () => setMenuAbierto(false);

  const handleHistorial = () => {
    setMenuAbierto(false);
    if (setMostrarHistorial) setMostrarHistorial(true);
  };

  const handlePerfil = () => {
    setMenuAbierto(false);
    if (setMostrarPerfil) setMostrarPerfil(true);
  };

  const handleComercio = () => {
    setMenuAbierto(false);
    if (irAFormularioComercio) irAFormularioComercio();
  };

  const handleRepartidor = () => {
    setMenuAbierto(false);
    if (irAFormularioRepartidor) irAFormularioRepartidor();
  };

  const handleCerrarSesion = () => {
    setMenuAbierto(false);
    if (cerrarSesion) cerrarSesion();
  };

  return (
    <>
      {/* BACKDROP: Cambiado a absolute */}
      <div
        className="absolute inset-0 z-[90] bg-slate-950/20 backdrop-blur-[1px] transition-opacity"
        onClick={() => setMenuAbierto(false)}
        aria-hidden="true"
      />

      {/* DROPDOWN PRINCIPAL: Cambiado a absolute */}
      <aside
        role="menu"
        aria-label="Menú principal de Inírida Express"
        className="
          absolute
          top-[60px]
          right-3
          z-[100]
          w-[min(88vw,300px)]
          overflow-hidden
          rounded-2xl
          border
          border-slate-200/80
          bg-white
          shadow-[0_18px_45px_rgba(15,23,42,0.22)]
          ring-1
          ring-black/5
          origin-top-right
          animate-in
          fade-in
          zoom-in-95
          slide-in-from-top-2
          duration-200
        "
      >
        {/* CABECERA DE CUENTA */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 px-4 py-3.5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-white text-orange-500 flex items-center justify-center shadow-md">
                <User className="w-5 h-5" strokeWidth={2.4} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/70">
                  Mi cuenta
                </p>
                <h3 className="text-sm font-extrabold leading-tight truncate">
                  Cliente
                </h3>
                <p className="text-[9px] text-white/80 mt-0.5">
                  Inírida Express
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMenuAbierto(false)}
              aria-label="Cerrar menú"
              className="w-8 h-8 shrink-0 rounded-xl bg-white/15 hover:bg-white/25 border border-white/10 flex items-center justify-center transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            <span className="text-[10px] font-semibold">
              Cliente activo en Inírida Express
            </span>
          </div>
        </div>

        {/* CONTENIDO DEL MENÚ */}
        <div className="p-2.5">
          <div className="px-2 pb-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Mi cuenta
            </p>
          </div>

          <nav className="space-y-1" aria-label="Opciones de cuenta">
            {/* INICIO */}
            <button
              type="button"
              role="menuitem"
              onClick={handleInicio}
              className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left hover:bg-orange-50 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100 group-hover:bg-orange-100 transition-colors">
                  <Home className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    Inicio
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Solicita servicios
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* MIS PEDIDOS */}
            <button
              type="button"
              role="menuitem"
              onClick={handleHistorial}
              className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left hover:bg-blue-50 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100 group-hover:bg-blue-100 transition-colors">
                  <ClipboardList className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    Mis pedidos
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Historial de servicios
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* MI PERFIL */}
            <button
              type="button"
              role="menuitem"
              onClick={handlePerfil}
              className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left hover:bg-emerald-50 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                  <User className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    Mi perfil
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Datos y lugares guardados
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          </nav>

          {/* SECCIÓN ALIADOS */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="px-2 pb-1.5 flex items-center gap-1.5">
              <Store className="w-3 h-3 text-orange-500" />
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Comercios y aliados
              </p>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                role="menuitem"
                onClick={handleComercio}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left bg-orange-50/50 border border-orange-100 hover:bg-orange-50 hover:border-orange-200 active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-white text-orange-500 flex items-center justify-center border border-orange-100 shadow-sm">
                    <BriefcaseBusiness className="w-4 h-4" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      ¿Tienes un negocio?
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Vende tus productos aquí
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleRepartidor}
                className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left hover:bg-slate-50 active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 group-hover:bg-slate-200 transition-colors">
                    <Bike className="w-4 h-4" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      Trabaja con nosotros
                    </p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      Sé repartidor en Inírida
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-3 pb-3">
          <div className="border-t border-slate-100 pt-2.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleCerrarSesion}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 hover:border-red-200 active:scale-[0.99] transition-all text-[11px] font-bold"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={2.3} />
              <span>Cerrar sesión</span>
            </button>

            <div className="flex items-center justify-center gap-1 mt-2">
              <ShieldCheck className="w-2.5 h-2.5 text-slate-300" />
              <p className="text-[8px] text-slate-400 font-medium">
                Inírida Express · v1.0 · 2026
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
