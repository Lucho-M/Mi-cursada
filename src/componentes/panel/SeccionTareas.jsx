import { useState, useEffect, useRef } from 'react';
import TareaService from '../../services/TareaService';

const tareaService = new TareaService();

const COLUMNAS = [
  { key: 'pendiente',   label: 'Por hacer',    color: 'var(--blue)' },
  { key: 'en_progreso', label: 'En progreso',  color: 'var(--yellow)' },
  { key: 'terminado',   label: 'Terminado',    color: 'var(--accent)' },
];

const PRIORIDADES = [
  { key: 'baja',  label: 'Baja' },
  { key: 'media', label: 'Media' },
  { key: 'alta',  label: 'Alta' },
];

const TAREA_VACIA = { titulo: '', descripcion: '', prioridad: 'media', fechaLimite: '', miembrosInfo: [] };

function iniciales(nombre) {
  return (nombre || '?').trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function tareaVencida(t) {
  return !!t.fechaLimite && t.estado !== 'terminado' && t.fechaLimite < new Date().toISOString().slice(0, 10);
}

// Buscador de companeros reutilizable: maneja su propia busqueda y devuelve
// la seleccion al padre via onSeleccionar, sin tocar el estado del modal que lo usa.
function BuscadorCompaneros({ excluirUids, onSeleccionar }) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const timeoutRef = useRef(null);

  const onChange = (valor) => {
    setTexto(valor);
    clearTimeout(timeoutRef.current);
    if (valor.trim().length < 2) {
      setResultados([]);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await tareaService.buscarUsuarios(valor);
        setResultados(res.filter(u => !excluirUids.includes(u.uid)));
      } catch (e) {
        console.error('Error buscando usuarios:', e);
      } finally {
        setBuscando(false);
      }
    }, 300);
  };

  return (
    <div className="form-group">
      <label>Invitar compañeros</label>
      <input type="text" value={texto} onChange={e => onChange(e.target.value)}
        placeholder="Buscar por nombre o email..." />
      {buscando && <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: '6px' }}>Buscando...</p>}
      {resultados.length > 0 && (
        <div className="user-search-results">
          {resultados.map(u => (
            <div key={u.uid} className="user-search-item">
              <div>
                <div className="us-nombre">{u.nombre || u.email}</div>
                <div className="us-email">{u.email}</div>
              </div>
              <button type="button" className="us-add"
                onClick={() => { onSeleccionar(u); setTexto(''); setResultados([]); }}>
                + Invitar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SeccionTareas({ perfil }) {
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [modalNuevaAbierto, setModalNuevaAbierto] = useState(false);
  const [nuevaTarea, setNuevaTarea] = useState(TAREA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [tareaDetalle, setTareaDetalle] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [colDragOver, setColDragOver] = useState(null);
  const [verArchivadas, setVerArchivadas] = useState(false);

  useEffect(() => {
    if (!perfil?.uid) return;
    const cargar = async () => {
      setCargando(true);
      try {
        setTareas(await tareaService.obtenerTareas(perfil.uid));
      } catch (e) {
        console.error('Error cargando tareas:', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [perfil?.uid]);

  const tareasFiltradas = tareas.filter(t =>
    !busqueda.trim() ||
    t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
    (t.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const moverTarea = async (id, nuevoEstado) => {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, estado: nuevoEstado } : t));
    if (tareaDetalle?.id === id) setTareaDetalle(prev => ({ ...prev, estado: nuevoEstado }));
    try {
      await tareaService.actualizarEstado(id, nuevoEstado);
    } catch (e) {
      console.error('Error moviendo tarea:', e);
      setMensaje('error:No se pudo mover la tarea. Intenta de nuevo.');
    }
  };

  const guardarNuevaTarea = async () => {
    if (!nuevaTarea.titulo.trim()) {
      setMensaje('error:Ingresa un titulo para la tarea.');
      return;
    }
    setGuardando(true);
    try {
      const tarea = await tareaService.crearTarea({
        ...nuevaTarea,
        creadoPor: perfil.uid,
        creadorNombre: perfil.nombre || perfil.email || 'Yo',
      });
      setTareas(prev => [...prev, tarea]);
      setModalNuevaAbierto(false);
      setNuevaTarea(TAREA_VACIA);
      setMensaje('ok:Tarea creada correctamente.');
    } catch (e) {
      console.error('Error creando tarea:', e);
      setMensaje('error:No se pudo crear la tarea. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicionDetalle = async () => {
    setGuardando(true);
    try {
      await tareaService.actualizarTarea(tareaDetalle.id, {
        titulo: tareaDetalle.titulo,
        descripcion: tareaDetalle.descripcion,
        prioridad: tareaDetalle.prioridad,
        fechaLimite: tareaDetalle.fechaLimite,
        miembros: tareaDetalle.miembros,
        miembrosInfo: tareaDetalle.miembrosInfo,
      });
      setTareas(prev => prev.map(t => t.id === tareaDetalle.id ? tareaDetalle : t));
      setTareaDetalle(null);
      setMensaje('ok:Tarea actualizada correctamente.');
    } catch (e) {
      console.error('Error guardando tarea:', e);
      setMensaje('error:No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const archivarTarea = async (id, archivada) => {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, archivada } : t));
    if (tareaDetalle?.id === id) setTareaDetalle(prev => ({ ...prev, archivada }));
    try {
      await tareaService.actualizarTarea(id, { archivada });
    } catch (e) {
      console.error('Error archivando tarea:', e);
      setMensaje('error:No se pudo archivar. Intenta de nuevo.');
    }
  };

  const eliminarTarea = async (id) => {
    if (!window.confirm('¿Eliminar esta tarea para todos los invitados?')) return;
    try {
      await tareaService.eliminarTarea(id);
      setTareas(prev => prev.filter(t => t.id !== id));
      setTareaDetalle(null);
      setMensaje('ok:Tarea eliminada.');
    } catch (e) {
      console.error('Error eliminando tarea:', e);
      setMensaje('error:No se pudo eliminar. Intenta de nuevo.');
    }
  };

  const agregarMiembroNueva = (u) => {
    if (nuevaTarea.miembrosInfo.some(m => m.uid === u.uid)) return;
    setNuevaTarea(prev => ({ ...prev, miembrosInfo: [...prev.miembrosInfo, { uid: u.uid, nombre: u.nombre || u.email }] }));
  };

  const agregarMiembroDetalle = (u) => {
    setTareaDetalle(prev => {
      if (prev.miembros.includes(u.uid)) return prev;
      return {
        ...prev,
        miembros: [...prev.miembros, u.uid],
        miembrosInfo: [...prev.miembrosInfo, { uid: u.uid, nombre: u.nombre || u.email }],
      };
    });
  };

  const quitarMiembroDetalle = (uid) => {
    setTareaDetalle(prev => ({
      ...prev,
      miembros: prev.miembros.filter(m => m !== uid),
      miembrosInfo: prev.miembrosInfo.filter(m => m.uid !== uid),
    }));
  };

  const esCreadorDetalle = tareaDetalle && tareaDetalle.creadoPor === perfil.uid;

  return (
    <div className="content">
      {mensaje && (
        <div className={'import-result ' + (mensaje.startsWith('ok:') ? 'ok' : 'error')} style={{ marginBottom: '14px' }}>
          {mensaje.split(':').slice(1).join(':')}
        </div>
      )}

      <div className="kanban-toolbar">
        {!verArchivadas && <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔎 Buscar tarea..." />}
        <div style={{ display: 'flex', gap: '10px', marginLeft: verArchivadas ? 0 : 'auto' }}>
          <button className="btn btn-outline" onClick={() => setVerArchivadas(v => !v)}>
            {verArchivadas ? '← Volver al tablero' : '📦 Archivadas'}
          </button>
          {!verArchivadas && (
            <button className="btn btn-primary" onClick={() => { setNuevaTarea(TAREA_VACIA); setModalNuevaAbierto(true); setMensaje(''); }}>
              + Nueva tarea
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className="empty-state"><p>Cargando tareas...</p></div>
      ) : verArchivadas ? (
        <div className="card">
          {tareas.filter(t => t.archivada).length === 0 ? (
            <div className="empty-state">
              <div className="icon">📦</div>
              <p>No tenes tareas archivadas.</p>
            </div>
          ) : (
            tareas.filter(t => t.archivada).map(t => (
              <div key={t.id} className="table-row" style={{ gridTemplateColumns: '2fr 1fr auto' }}>
                <div>
                  <div className="materia-name">{t.titulo}</div>
                  {t.descripcion && <div className="materia-code">{t.descripcion}</div>}
                </div>
                <div style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{COLUMNAS.find(c => c.key === t.estado)?.label || t.estado}</div>
                <button className="btn btn-outline" onClick={() => archivarTarea(t.id, false)}>Desarchivar</button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="kanban-board">
          {COLUMNAS.map((col, idx) => {
            const tareasCol = tareasFiltradas.filter(t => t.estado === col.key && !t.archivada);
            return (
              <div key={col.key} className="kanban-col">
                <div className="kanban-col-head">
                  <span className="kanban-col-dot" style={{ background: col.color }} />
                  <span className="kanban-col-title">{col.label}</span>
                  <span className="kanban-col-count">{tareasCol.length}</span>
                </div>
                <div
                  className={'kanban-col-body' + (colDragOver === col.key ? ' drag-over' : '')}
                  onDragOver={e => { e.preventDefault(); setColDragOver(col.key); }}
                  onDragLeave={() => setColDragOver(null)}
                  onDrop={e => {
                    e.preventDefault();
                    const id = dragId || e.dataTransfer.getData('text/plain');
                    if (id) moverTarea(id, col.key);
                    setDragId(null);
                    setColDragOver(null);
                  }}
                >
                  {tareasCol.length === 0 ? (
                    <div className="kanban-col-empty">Sin tareas aca</div>
                  ) : (
                    tareasCol.map(t => (
                      <div
                        key={t.id}
                        className={'kanban-card prioridad-' + t.prioridad + (dragId === t.id ? ' dragging' : '')}
                        draggable
                        onDragStart={e => { setDragId(t.id); e.dataTransfer.setData('text/plain', t.id); }}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => setTareaDetalle({ ...t })}
                      >
                        <div className="kanban-card-top">
                          <div className="kanban-card-title">{t.titulo}</div>
                        </div>
                        {t.descripcion && <div className="kanban-card-desc">{t.descripcion}</div>}
                        <div className="kanban-card-meta">
                          <div className="kanban-avatares">
                            {(t.miembrosInfo || []).slice(0, 4).map(m => (
                              <span key={m.uid} className="kanban-avatar" title={m.nombre}>{iniciales(m.nombre)}</span>
                            ))}
                          </div>
                          {t.fechaLimite && (
                            <span className={'kanban-fecha' + (tareaVencida(t) ? ' vencida' : '')}>
                              {tareaVencida(t) ? '⚠ ' : '📅 '}
                              {formatearFecha(t.fechaLimite)}
                            </span>
                          )}
                        </div>
                        <div className="kanban-card-move" onClick={e => e.stopPropagation()}>
                          <button type="button" className="kanban-move-btn" disabled={idx === 0}
                            onClick={() => moverTarea(t.id, COLUMNAS[idx - 1]?.key)}>◀</button>
                          <button type="button" className="kanban-move-btn" disabled={idx === COLUMNAS.length - 1}
                            onClick={() => moverTarea(t.id, COLUMNAS[idx + 1]?.key)}>▶</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalNuevaAbierto && (
        <div className="modal-overlay" onClick={() => setModalNuevaAbierto(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Nueva tarea</h3>
            <div className="form-group">
              <label>Titulo *</label>
              <input type="text" value={nuevaTarea.titulo}
                onChange={e => setNuevaTarea(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ej: Terminar TP de Bases de Datos" />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea value={nuevaTarea.descripcion}
                onChange={e => setNuevaTarea(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Detalles opcionales..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Prioridad</label>
                <select value={nuevaTarea.prioridad} onChange={e => setNuevaTarea(prev => ({ ...prev, prioridad: e.target.value }))}>
                  {PRIORIDADES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha limite</label>
                <input type="date" value={nuevaTarea.fechaLimite}
                  onChange={e => setNuevaTarea(prev => ({ ...prev, fechaLimite: e.target.value }))} />
              </div>
            </div>
            <BuscadorCompaneros
              excluirUids={[perfil.uid, ...nuevaTarea.miembrosInfo.map(m => m.uid)]}
              onSeleccionar={agregarMiembroNueva}
            />
            {nuevaTarea.miembrosInfo.length > 0 && (
              <div className="chip-list">
                {nuevaTarea.miembrosInfo.map(m => (
                  <span key={m.uid} className="chip">
                    {m.nombre}
                    <button type="button" onClick={() => setNuevaTarea(prev => ({ ...prev, miembrosInfo: prev.miembrosInfo.filter(x => x.uid !== m.uid) }))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModalNuevaAbierto(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardarNuevaTarea} disabled={guardando}>
                {guardando ? 'Creando...' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tareaDetalle && (
        <div className="modal-overlay" onClick={() => setTareaDetalle(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>{esCreadorDetalle ? 'Editar tarea' : 'Detalle de la tarea'}</h3>

            <div className="form-group">
              <label>Titulo</label>
              <input type="text" value={tareaDetalle.titulo} disabled={!esCreadorDetalle}
                onChange={e => setTareaDetalle(prev => ({ ...prev, titulo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Descripcion</label>
              <textarea value={tareaDetalle.descripcion} disabled={!esCreadorDetalle}
                onChange={e => setTareaDetalle(prev => ({ ...prev, descripcion: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Prioridad</label>
                <select value={tareaDetalle.prioridad} disabled={!esCreadorDetalle}
                  onChange={e => setTareaDetalle(prev => ({ ...prev, prioridad: e.target.value }))}>
                  {PRIORIDADES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Fecha limite</label>
                <input type="date" value={tareaDetalle.fechaLimite || ''} disabled={!esCreadorDetalle}
                  onChange={e => setTareaDetalle(prev => ({ ...prev, fechaLimite: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={tareaDetalle.estado} onChange={e => moverTarea(tareaDetalle.id, e.target.value)}>
                {COLUMNAS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>

            <BuscadorCompaneros
              excluirUids={tareaDetalle.miembros}
              onSeleccionar={agregarMiembroDetalle}
            />
            {tareaDetalle.miembrosInfo.length > 0 && (
              <div className="chip-list">
                {tareaDetalle.miembrosInfo.map(m => (
                  <span key={m.uid} className="chip">
                    {m.nombre}{m.uid === tareaDetalle.creadoPor ? ' (creador)' : ''}
                    {esCreadorDetalle && m.uid !== tareaDetalle.creadoPor && (
                      <button type="button" onClick={() => quitarMiembroDetalle(m.uid)}>×</button>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <div style={{ marginRight: 'auto', display: 'flex', gap: '10px' }}>
                {esCreadorDetalle && (
                  <button className="btn btn-danger" onClick={() => eliminarTarea(tareaDetalle.id)}>
                    Eliminar
                  </button>
                )}
                <button className="btn btn-outline" onClick={() => archivarTarea(tareaDetalle.id, !tareaDetalle.archivada)}>
                  {tareaDetalle.archivada ? 'Desarchivar' : '📦 Archivar'}
                </button>
              </div>
              <button className="btn btn-outline" onClick={() => setTareaDetalle(null)}>Cerrar</button>
              {esCreadorDetalle && (
                <button className="btn btn-primary" onClick={guardarEdicionDetalle} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
