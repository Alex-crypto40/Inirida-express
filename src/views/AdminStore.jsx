import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Trash2,
  Edit3,
  PlusCircle,
  Check,
  X,
  RefreshCw,
  Store,
  Package,
  Image as ImageIcon,
  Tag,
  DollarSign,
  FileText,
  ArrowLeft,
  Search,
  Utensils,
  Sparkles,
  AlertCircle,
  Save,
  ChevronRight,
} from "lucide-react";

function AdminStore() {
  const { storeId } = useParams();
  const navigate = useNavigate();

  // ============================================================
  // ESTADOS DEL FORMULARIO PARA NUEVO PRODUCTO
  // ============================================================

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("Comida");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ============================================================
  // ESTADOS PARA LISTAR Y EDITAR PRODUCTOS
  // ============================================================

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    image: "",
  });

  // ============================================================
  // ESTADO PARA BÚSQUEDA
  // ============================================================

  const [searchTerm, setSearchTerm] = useState("");

  // ============================================================
  // URL ACTUAL DEL BACKEND
  // ============================================================

  const BASE_URL = "http://192.168.1.246:5000/api/products";

  // ============================================================
  // CARGAR PRODUCTOS DEL COMERCIO
  // ============================================================

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);

    try {
      const res = await fetch(`${BASE_URL}?storeId=${storeId}`);

      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        console.error("No se pudieron cargar los productos");
        setProducts([]);
      }
    } catch (err) {
      console.error("Error al obtener productos:", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [storeId]);

  // ============================================================
  // CARGA INICIAL
  // ============================================================

  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
  }, [storeId, fetchProducts]);

  // ============================================================
  // LIMPIAR MENSAJES AUTOMÁTICAMENTE
  // ============================================================

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [message]);

  // ============================================================
  // CREAR PRODUCTO
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setMessage("⚠️ Debes ingresar el nombre del producto.");
      return;
    }

    if (!price || Number(price) < 0) {
      setMessage("⚠️ Ingresa un precio válido.");
      return;
    }

    setLoading(true);
    setMessage("");

    const newProduct = {
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      image: image.trim(),
      category,
      storeId,
    };

    try {
      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProduct),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ Producto publicado correctamente.");

        // Limpiar formulario
        setName("");
        setPrice("");
        setDescription("");
        setImage("");
        setCategory("Comida");

        // Actualizar catálogo
        await fetchProducts();
      } else {
        setMessage(
          `❌ Error: ${data.message || "No se pudo guardar el producto."}`,
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // INICIAR EDICIÓN
  // ============================================================

  const handleStartEdit = (prod) => {
    const prodId = prod._id || prod.id;

    setEditingId(prodId);

    setEditForm({
      name: prod.name || "",
      price: prod.price ?? "",
      category: prod.category || "Comida",
      description: prod.description || "",
      image: prod.image || "",
    });
  };

  // ============================================================
  // CANCELAR EDICIÓN
  // ============================================================

  const handleCancelEdit = () => {
    setEditingId(null);

    setEditForm({
      name: "",
      price: "",
      category: "",
      description: "",
      image: "",
    });
  };

  // ============================================================
  // GUARDAR CAMBIOS
  // ============================================================

  const handleSaveEdit = async (id) => {
    if (!editForm.name.trim()) {
      setMessage("⚠️ El producto debe tener un nombre.");
      return;
    }

    if (editForm.price === "" || Number(editForm.price) < 0) {
      setMessage("⚠️ Ingresa un precio válido.");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editForm,
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          image: editForm.image.trim(),
          price: Number(editForm.price),
        }),
      });

      if (res.ok) {
        setMessage("✅ Producto actualizado correctamente.");
        handleCancelEdit();
        await fetchProducts();
      } else {
        setMessage("❌ No se pudo actualizar el producto.");
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Error al conectar con el servidor.");
    }
  };

  // ============================================================
  // ELIMINAR PRODUCTO
  // ============================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "¿Seguro que deseas eliminar este producto del catálogo?",
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("✅ Producto eliminado correctamente.");
        await fetchProducts();
      } else {
        setMessage("❌ No se pudo eliminar el producto.");
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Error al conectar con el servidor.");
    }
  };

  // ============================================================
  // FILTRADO LOCAL
  // ============================================================

  const filteredProducts = products.filter((prod) => {
    const search = searchTerm.toLowerCase().trim();

    if (!search) return true;

    return (
      prod.name?.toLowerCase().includes(search) ||
      prod.category?.toLowerCase().includes(search) ||
      prod.description?.toLowerCase().includes(search)
    );
  });

  // ============================================================
  // FORMATO DE PRECIO
  // ============================================================

  const formatPrice = (value) => {
    return Number(value || 0).toLocaleString("es-CO");
  };

  // ============================================================
  // INICIALES DEL PRODUCTO
  // ============================================================

  const getProductInitials = (productName) => {
    if (!productName) return "PR";

    const words = productName.trim().split(/\s+/);

    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="w-full max-w-2xl mx-auto pb-16">
        {/* ======================================================
            HEADER PRINCIPAL
        ====================================================== */}

        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 flex items-center justify-center transition-all active:scale-95 shrink-0"
                title="Volver"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 shrink-0">
                <Store className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-500">
                  Administración
                </p>

                <h1 className="text-sm font-black text-slate-900 truncate">
                  Panel del comercio
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchProducts}
              disabled={loadingProducts}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-orange-50 text-slate-500 hover:text-orange-600 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shrink-0"
              title="Actualizar catálogo"
            >
              <RefreshCw
                className={`w-4 h-4 ${loadingProducts ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </header>

        {/* ======================================================
            INTRO / RESUMEN
        ====================================================== */}

        <section className="px-4 pt-5">
          <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 p-5 text-white shadow-lg shadow-orange-500/15">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-orange-100" />

                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-100">
                    Tu catálogo
                  </span>
                </div>

                <h2 className="text-xl font-black tracking-tight">
                  Administra tus productos
                </h2>

                <p className="text-[11px] text-orange-50/90 mt-1 leading-relaxed max-w-sm">
                  Publica, actualiza y organiza los productos que tus clientes
                  pueden encontrar en Inírida Express.
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* MINI ESTADÍSTICAS */}

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5">
                <p className="text-[9px] text-orange-100 font-semibold">
                  Productos
                </p>

                <p className="text-lg font-black leading-tight mt-0.5">
                  {products.length}
                </p>
              </div>

              <div className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2.5">
                <p className="text-[9px] text-orange-100 font-semibold">
                  Estado
                </p>

                <p className="text-[11px] font-black leading-tight mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  Catálogo activo
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================
            MENSAJE DE SISTEMA
        ====================================================== */}

        {message && (
          <div
            className={`mx-4 mt-4 p-3 rounded-2xl border flex items-start gap-2.5 text-xs font-semibold ${
              message.includes("✅")
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message.includes("✅") ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}

            <span>{message}</span>
          </div>
        )}

        {/* ======================================================
            FORMULARIO NUEVO PRODUCTO
        ====================================================== */}

        <section className="px-4 mt-5">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                  <PlusCircle className="w-4.5 h-4.5" />
                </div>

                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Nuevo producto
                  </h2>

                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Agrega un producto al catálogo
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* NOMBRE */}

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  <Package className="w-3 h-3" />
                  Nombre del producto *
                </label>

                <input
                  type="text"
                  required
                  placeholder="Ej. Hamburguesa Especial"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all"
                />
              </div>

              {/* PRECIO + CATEGORÍA */}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    <DollarSign className="w-3 h-3" />
                    Precio *
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                      $
                    </span>

                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="18.000"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full pl-7 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    <Tag className="w-3 h-3" />
                    Categoría
                  </label>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all"
                  >
                    <option value="Comida">Comida</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Postres">Postres</option>
                  </select>
                </div>
              </div>

              {/* DESCRIPCIÓN */}

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  <FileText className="w-3 h-3" />
                  Descripción
                </label>

                <textarea
                  placeholder="Describe brevemente el producto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all resize-none"
                />
              </div>

              {/* IMAGEN */}

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  <ImageIcon className="w-3 h-3" />
                  Imagen del producto
                </label>

                <input
                  type="text"
                  placeholder="https://enlace-de-la-imagen.jpg"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 outline-none transition-all"
                />

                <p className="text-[9px] text-slate-400 mt-1.5">
                  Puedes utilizar la URL pública de una imagen.
                </p>
              </div>

              {/* BOTÓN PUBLICAR */}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-black shadow-md shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Publicar producto
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* ======================================================
            CATÁLOGO
        ====================================================== */}

        <section className="px-4 mt-6">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-500">
                Catálogo
              </p>

              <h2 className="text-base font-black text-slate-900 mt-0.5">
                Tus productos
              </h2>

              <p className="text-[10px] text-slate-400 mt-0.5">
                {products.length} producto
                {products.length !== 1 ? "s" : ""} registrado
                {products.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* BUSCADOR */}

          {products.length > 0 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-3.5 py-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 transition-all"
              />
            </div>
          )}

          {/* CARGANDO */}

          {loadingProducts ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-10 flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center mb-3">
                <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
              </div>

              <p className="text-xs font-bold text-slate-700">
                Cargando catálogo
              </p>

              <p className="text-[10px] text-slate-400 mt-1">
                Estamos consultando tus productos...
              </p>
            </div>
          ) : products.length === 0 ? (
            /* ==================================================
               ESTADO VACÍO
            ================================================== */

            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mb-3">
                <Utensils className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-black text-slate-800">
                Tu catálogo está vacío
              </h3>

              <p className="text-[10px] text-slate-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                Publica tu primer producto utilizando el formulario de arriba
                para comenzar a mostrar tu oferta.
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-bold">
                <PlusCircle className="w-3 h-3" />
                Agrega tu primer producto
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* ==================================================
               SIN RESULTADOS
            ================================================== */

            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />

              <p className="text-xs font-bold text-slate-700">
                No encontramos productos
              </p>

              <p className="text-[10px] text-slate-400 mt-1">
                Prueba con otro nombre o categoría.
              </p>
            </div>
          ) : (
            /* ==================================================
               LISTA DE PRODUCTOS
            ================================================== */

            <div className="space-y-2.5">
              {filteredProducts.map((prod) => {
                const prodId = prod._id || prod.id;
                const isEditing = editingId === prodId;

                // ------------------------------------------------
                // MODO EDICIÓN
                // ------------------------------------------------

                if (isEditing) {
                  return (
                    <div
                      key={prodId}
                      className="bg-white rounded-3xl border border-orange-200 shadow-sm overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-orange-50/70 border-b border-orange-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-orange-500" />

                          <div>
                            <p className="text-xs font-black text-orange-800">
                              Editando producto
                            </p>

                            <p className="text-[9px] text-orange-600/70">
                              Actualiza la información necesaria
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="w-7 h-7 rounded-lg bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center border border-orange-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-4 space-y-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Nombre del producto"
                          className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-orange-400"
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editForm.price}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                price: e.target.value,
                              })
                            }
                            placeholder="Precio"
                            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-orange-400"
                          />

                          <select
                            value={editForm.category}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                category: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:border-orange-400"
                          >
                            <option value="Comida">Comida</option>
                            <option value="Bebidas">Bebidas</option>
                            <option value="Postres">Postres</option>
                          </select>
                        </div>

                        <textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Descripción"
                          rows={2}
                          className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-400 resize-none"
                        />

                        <input
                          type="text"
                          value={editForm.image}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              image: e.target.value,
                            })
                          }
                          placeholder="URL de la imagen"
                          className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-400"
                        />

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSaveEdit(prodId)}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Guardar cambios
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ------------------------------------------------
                // PRODUCTO NORMAL
                // ------------------------------------------------

                return (
                  <article
                    key={prodId}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 hover:border-orange-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* IMAGEN */}

                      {prod.image ? (
                        <img
                          src={prod.image}
                          alt={prod.name}
                          loading="lazy"
                          className="w-14 h-14 rounded-2xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 text-orange-600 flex items-center justify-center font-black text-xs shrink-0">
                          {getProductInitials(prod.name)}
                        </div>
                      )}

                      {/* INFORMACIÓN */}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h3 className="text-xs font-black text-slate-800 truncate">
                            {prod.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-[8px] font-bold text-slate-500">
                            <Tag className="w-2.5 h-2.5" />
                            {prod.category || "Comida"}
                          </span>
                        </div>

                        <p className="text-sm font-black text-orange-600 mt-1">
                          ${formatPrice(prod.price)}
                        </p>
                      </div>

                      {/* ACCIONES */}

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(prod)}
                          className="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center transition-all active:scale-95"
                          title="Editar producto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(prodId)}
                          className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all active:scale-95"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* DESCRIPCIÓN */}

                    {prod.description && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-start gap-1.5">
                        <FileText className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />

                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                          {prod.description}
                        </p>

                        <ChevronRight className="w-3 h-3 text-slate-300 ml-auto shrink-0 mt-0.5" />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ======================================================
            FOOTER ADMIN
        ====================================================== */}

        <div className="px-4 mt-8 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400">
            <Store className="w-3 h-3" />
            <span className="font-semibold">
              Inírida Express · Administración de comercio
            </span>
          </div>

          <p className="text-[8px] text-slate-300 mt-1">
            Mantén tu catálogo actualizado para tus clientes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminStore;
