import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

// Función principal del componente App
export default function App() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '' });
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Nuevo estado para controlar los diálogos de confirmación
  const [dialog, setDialog] = useState({ isOpen: false, type: '', data: null, message: '' });

  // 1. Efecto para desaparecer la notificación de éxito/error después de 4 segundos
  useEffect(() => {
    if (status.msg) {
      const timer = setTimeout(() => {
        setStatus({ type: '', msg: '' });
      }, 4000);
      return () => clearTimeout(timer); // Limpiar el timer si el componente se desmonta o el status cambia
    }
  }, [status.msg]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Función para obtener los usuarios desde la API
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'x-api-key': API_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error de conexión:', err);
    }
  };

  // 2. Lógica para solicitar la confirmación ANTES de procesar
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setStatus({ type: '', msg: '' });

    if (form.name.trim().length < 2) return setStatus({ type: 'error', msg: 'El nombre debe tener al menos 2 caracteres' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setStatus({ type: 'error', msg: 'Por favor, ingrese un email válido' });

    // Si estamos editando, pedimos confirmación. Si estamos creando (POST), pasamos directo.
    if (editingId) {
      setDialog({
        isOpen: true,
        type: 'update',
        message: '¿Estás seguro de que deseas sobreescribir los datos de este registro?'
      });
    } else {
      executeSave();
    }
  };

  // Función para solicitar confirmación antes de eliminar un registro
  const requestDelete = (id) => {
    setDialog({
      isOpen: true,
      type: 'delete',
      data: id,
      message: 'Esta acción es irreversible. ¿Deseas eliminar permanentemente este registro?'
    });
  };

  // 3. Función que se ejecuta cuando el usuario presiona "Confirmar" en el modal
  const handleConfirmAction = () => {
    if (dialog.type === 'update') executeSave();
    if (dialog.type === 'delete') executeDelete(dialog.data);
    setDialog({ isOpen: false, type: '', data: null, message: '' });
  };

  // Lógica principal de guardado (Crear o Actualizar)
  const executeSave = async () => {
    setLoading(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `${API_URL}/users/${editingId}` : `${API_URL}/users`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify(form)
      });

      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const textError = await res.text();
        throw new Error(`Error del servidor (${res.status}): Detalles: ${textError.substring(0, 50)}...`);
      }

      if (!res.ok) throw new Error(data.error || data.errors?.[0]?.msg || 'Error al procesar la solicitud');

      setStatus({ type: 'success', msg: editingId ? 'Registro actualizado con éxito' : 'Registro completado con éxito' });
      setForm({ name: '', email: '' });
      setEditingId(null);
      fetchUsers();
    } catch (error) {
      setStatus({ type: 'error', msg: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Lógica principal de eliminación
  const executeDelete = async (id) => {
    if (editingId === id) cancelEdit();
    try {
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-api-key': API_KEY }
      });
      if (res.ok) {
        setStatus({ type: 'success', msg: 'Registro eliminado permanentemente' });
        fetchUsers();
      }
    } catch (error) {
      setStatus({ type: 'error', msg: 'Error al intentar eliminar el registro' });
    }
  };

  // Función para iniciar la edición de un registro
  const handleEdit = (user) => {
    setForm({ name: user.name, email: user.email });
    setEditingId(user.id);
    setStatus({ type: '', msg: '' });
  };

  // Función para cancelar la edición y limpiar el formulario
  const cancelEdit = () => {
    setForm({ name: '', email: '' });
    setEditingId(null);
    setStatus({ type: '', msg: '' });
  };

  // Renderizado del componente
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans selection:bg-cyan-900/50 selection:text-cyan-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,47,73,0.2),transparent_70%)] pointer-events-none" />

      {/* Contenedor principal escalado a max-w-xl (más ancho) */}
      <div className="w-full max-w-xl relative z-10 py-8 space-y-8">

        {/* Cabecera ampliada */}
        <div className="text-center space-y-2">
          <h1 className="text-xl md:text-2xl font-bold tracking-[0.2em] text-cyan-400 uppercase">
            Portal de Registro
          </h1>
          <p className="text-xs text-slate-500 font-mono tracking-widest uppercase">
            sys.db.connection // active
          </p>
        </div>

        {/* Formulario y lista de usuarios */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-8 space-y-8 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-linear-to-r before:from-transparent before:via-cyan-500/50 before:to-transparent">
          {/* Formulario de registro */}
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Nombre Completo</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={loading}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 rounded-xl p-4 text-sm md:text-base tracking-wide outline-none transition-all placeholder:text-slate-700 text-slate-200"
                placeholder="Ingresa el identificador del usuario"
              />
            </div>

            {/* Campo de correo electrónico */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Correo Electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={loading}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 rounded-xl p-4 text-sm md:text-base tracking-wide outline-none transition-all placeholder:text-slate-700 text-slate-200"
                placeholder="ejemplo@nodo.com"
              />
            </div>

            {/* Mensaje de estado*/}
            {status.msg && (
              <div className={`p-4 rounded-xl text-sm tracking-wide border transition-all ${
                status.type === 'error'
                  ? 'bg-red-950/20 border-red-900/40 text-red-400 font-mono'
                  : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
              }`}>
                <span className="opacity-60 font-bold mr-2">{status.type === 'error' ? 'ERR://' : 'ACK://'}</span>
                {status.msg}
              </div>
            )}

            {/* Botones de envío y cancelación */}
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-4 border rounded-xl text-sm font-bold tracking-[0.15em] uppercase transition-all duration-300 disabled:opacity-50 ${
                  editingId
                    ? 'bg-indigo-950/50 hover:bg-indigo-900/70 border-indigo-500/40 hover:border-indigo-400 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                    : 'bg-cyan-950/50 hover:bg-cyan-900/70 border-cyan-500/40 hover:border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                }`}
              >
                {loading ? 'Procesando...' : (editingId ? 'Actualizar Registro' : 'Enviar Registro')}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={loading}
                  className="px-6 py-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-500 rounded-xl text-slate-400 font-semibold text-sm tracking-widest uppercase transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          {/* Separador de Registros*/}
          <div className="flex items-center justify-between py-4">
            <div className="h-px bg-slate-800 grow" />
            <span className="text-xs text-slate-500 px-4 tracking-[0.3em] uppercase font-mono">Directorio</span>
            <div className="h-px bg-slate-800 grow" />
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {users.length === 0 ? (
              <p className="text-center text-sm text-slate-600 py-6 italic font-mono tracking-wide">
                El sistema no encontró registros activos.
              </p>
            ) : (
              users.map(u => (
                <div key={u.id} className={`p-4 bg-slate-950/60 border hover:border-slate-600 rounded-xl flex justify-between items-center group transition-all ${editingId === u.id ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800'}`}>
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-slate-200 text-base font-medium truncate tracking-wide">{u.name}</span>
                    <span className="text-slate-500 font-mono text-xs truncate mt-1">{u.email}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(u)}
                      className={`p-2 rounded-lg transition-all ${editingId === u.id ? 'text-indigo-400 bg-indigo-900/40' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-950/30'}`}
                      title="Editar registro"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => requestDelete(u.id)}
                      className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-950/30 transition-all"
                      title="Eliminar registro"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación Superpuesto (Z-50) */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity">
          <div className="bg-slate-900 border border-slate-700/80 p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-full space-y-6 relative">
            <h3 className="text-lg font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
              {dialog.type === 'delete' ? (
                <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Sistema: Alerta</>
              ) : (
                <><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Sistema: Confirmar</>
              )}
            </h3>

            <p className="text-slate-400 text-sm leading-relaxed">
              {dialog.message}
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDialog({ isOpen: false, type: '', data: null, message: '' })}
                className="flex-1 py-3 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 tracking-widest uppercase transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${
                  dialog.type === 'delete'
                    ? 'bg-red-950/60 hover:bg-red-900 border border-red-500/30 hover:border-red-500/60 text-red-400'
                    : 'bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-400'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
