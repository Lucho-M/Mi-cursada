import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import ImportService from '../../services/ImportService';
import AdminCentro from '../../models/AdminCentro';
import Carrera from '../../models/Carrera';
import CARRERAS_DISPONIBLES from '../../carrerasData';
import SeccionConfiguracion from './SeccionConfiguracion';

const importService = new ImportService();

function DropZoneImport({ titulo, descripcion, formatoEjemplo, onImportar, permiteReemplazar = false }) {
  const [dragOver, setDragOver] = useState(false);
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [reemplazarTodo, setReemplazarTodo] = useState(false);
  const inputRef = useRef();

  const procesar = async archivo => {
    if (!archivo) return;
    if (reemplazarTodo && !window.confirm(
      `Esto va a BORRAR todo lo cargado actualmente en "${titulo}" antes de cargar el archivo nuevo. Esta accion no se puede deshacer. Continuar?`
    )) return;
    setCargando(true);
    setEstado(null);
    try {
      const cantidad = await onImportar(archivo, reemplazarTodo);
      setEstado({ tipo: 'ok', msg: cantidad + ' registros importados correctamente' + (reemplazarTodo ? ' (datos anteriores reemplazados)' : '') });
    } catch (e) {
      setEstado({ tipo: 'error', msg: 'Error: ' + e.message });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="import-card">
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
      {permiteReemplazar && (
        <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'0.82rem',marginBottom:'10px',cursor:'pointer'}}>
          <input type="checkbox" checked={reemplazarTodo} onChange={e => setReemplazarTodo(e.target.checked)} />
          Reemplazar todo (borra los datos actuales antes de importar)
        </label>
      )}
      <div
        className={"import-dropzone" + (dragOver ? " drag-over" : "")}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); procesar(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.json" onChange={e => procesar(e.target.files[0])} />
        <div className="drop-icon">📂</div>
        <div className="drop-label">{cargando ? 'Procesando...' : 'Arrastra un archivo o haz clic'}</div>
        <div className="drop-sub">Formatos admitidos: CSV · JSON</div>
      </div>
      {estado && <div className={"import-result " + estado.tipo}>{estado.msg}</div>}
    </div>
  );
}

function ModalDocente({ docente, onGuardar, onCerrar }) {
  const [modalidad, setModalidad] = useState(docente.modalidad || 'presencial');
  const [linkVirtual, setLinkVirtual] = useState(docente.linkVirtual || '');
  const [auxiliares, setAuxiliares] = useState(docente.auxiliares || []);
  const [nuevoAux, setNuevoAux] = useState('');

  const agregarAux = () => {
    if (nuevoAux.trim() && !auxiliares.includes(nuevoAux.trim())) {
      setAuxiliares([...auxiliares, nuevoAux.trim()]);
      setNuevoAux('');
    }
  };

  const quitarAux = (aux) => setAuxiliares(auxiliares.filter(a => a !== aux));

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'white',borderRadius:'12px',padding:'28px',width:'480px',maxWidth:'90vw'}}>
        <h3 style={{marginBottom:'16px'}}>{docente.nombre}</h3>

        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontWeight:600,fontSize:'0.85rem',marginBottom:'6px'}}>Modalidad</label>
          <select value={modalidad} onChange={e => setModalidad(e.target.value)}
            style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd'}}>
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="hibrida">Hibrida</option>
          </select>
        </div>

        {(modalidad === 'virtual' || modalidad === 'hibrida') && (
          <div style={{marginBottom:'14px'}}>
            <label style={{display:'block',fontWeight:600,fontSize:'0.85rem',marginBottom:'6px'}}>Link de encuentro virtual</label>
            <input type="url" value={linkVirtual} onChange={e => setLinkVirtual(e.target.value)}
              placeholder="https://meet.google.com/... o https://zoom.us/..."
              style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',boxSizing:'border-box'}} />
          </div>
        )}

        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontWeight:600,fontSize:'0.85rem',marginBottom:'6px'}}>Docentes auxiliares</label>
          <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
            <input type="text" value={nuevoAux} onChange={e => setNuevoAux(e.target.value)}
              placeholder="Nombre del auxiliar"
              style={{flex:1,padding:'8px',borderRadius:'6px',border:'1px solid #ddd'}} />
            <button onClick={agregarAux}
              style={{padding:'8px 14px',background:'#2e7d32',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>
              Agregar
            </button>
          </div>
          {auxiliares.map((aux, i) => (
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',background:'#f5f5f5',borderRadius:'6px',marginBottom:'4px',fontSize:'0.85rem'}}>
              <span>{aux}</span>
              <button onClick={() => quitarAux(aux)} style={{background:'none',border:'none',cursor:'pointer',color:'#c0392b',fontWeight:'bold'}}>x</button>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'20px'}}>
          <button onClick={onCerrar} style={{padding:'8px 18px',border:'1px solid #ddd',borderRadius:'6px',cursor:'pointer',background:'white'}}>Cancelar</button>
          <button onClick={() => onGuardar({ modalidad, linkVirtual, auxiliares })}
            style={{padding:'8px 18px',background:'#2e7d32',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalCarrera({ carrera, onGuardar, onCerrar }) {
  const [nombre, setNombre] = useState(carrera?.nombre || '');
  const [tipo, setTipo] = useState(carrera?.tipo || 'Licenciatura');
  const [duracionAnios, setDuracionAnios] = useState(carrera?.duracionAnios || 4);

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div style={{background:'white',borderRadius:'12px',padding:'28px',width:'440px',maxWidth:'90vw'}}>
        <h3 style={{marginBottom:'16px'}}>{carrera ? 'Editar carrera' : 'Nueva carrera'}</h3>

        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontWeight:600,fontSize:'0.85rem',marginBottom:'6px'}}>Nombre</label>
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Licenciatura en Administracion"
            style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',boxSizing:'border-box'}} />
        </div>

        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontWeight:600,fontSize:'0.85rem',marginBottom:'6px'}}>Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd'}}>
            <option value="Licenciatura">Licenciatura</option>
            <option value="Tecnicatura">Tecnicatura</option>
          </select>
        </div>

        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',fontWeight:600,fontSize:'0.85rem',marginBottom:'6px'}}>Duracion (anios)</label>
          <input type="number" min="1" max="8" value={duracionAnios}
            onChange={e => setDuracionAnios(Number(e.target.value))}
            style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',boxSizing:'border-box'}} />
        </div>

        <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'20px'}}>
          <button onClick={onCerrar} style={{padding:'8px 18px',border:'1px solid #ddd',borderRadius:'6px',cursor:'pointer',background:'white'}}>Cancelar</button>
          <button onClick={() => onGuardar({ nombre: nombre.trim(), tipo, duracionAnios })}
            disabled={!nombre.trim()}
            style={{padding:'8px 18px',background:'#2e7d32',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',opacity:nombre.trim()?1:0.5}}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelAdmin({ perfil, seccion }) {
  const [stats, setStats] = useState({ carreras: 0, alumnos: 0, docentes: 0, materias: 0 });
  const [cargando, setCargando] = useState(true);
  const [docentes, setDocentes] = useState([]);
  const [cargandoDocentes, setCargandoDocentes] = useState(false);
  const [docenteEditando, setDocenteEditando] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [busquedaAlumno, setBusquedaAlumno] = useState('');
  const [carrerasList, setCarrerasList] = useState([]);
  const [cargandoCarreras, setCargandoCarreras] = useState(false);
  const [carreraEditando, setCarreraEditando] = useState(null);
  const [modalCarreraAbierto, setModalCarreraAbierto] = useState(false);

  const admin = new AdminCentro(perfil?.nombre, perfil?.dni, perfil?.email, '');

  useEffect(() => {
    const cargarStats = async () => {
      setCargando(true);
      try {
        const [usuariosSnap, materiasSnap, carrerasSnap] = await Promise.all([
          getDocs(collection(db, 'usuarios')),
          getDocs(collection(db, 'materias')),
          getDocs(collection(db, 'planesEstudio')),
        ]);
        const usuarios = usuariosSnap.docs.map(d => d.data());
        setStats({
          alumnos:  usuarios.filter(u => u.rol === 'alumno').length,
          docentes: usuarios.filter(u => u.rol === 'profesor').length,
          materias: materiasSnap.size,
          carreras: new Set(carrerasSnap.docs.map(d => d.data().carrera)).size,
        });
      } catch (e) {
        console.error('Error cargando stats admin:', e);
      } finally {
        setCargando(false);
      }
    };
    cargarStats();
  }, []);

  useEffect(() => {
    if (seccion !== 'docentes') return;
    const cargarDocentes = async () => {
      setCargandoDocentes(true);
      try {
        const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'profesor')));
        const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        const comSnap = await getDocs(collection(db, 'comisiones'));
        const comisiones = comSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const docentesConCom = docs.map(doc => ({
          ...doc,
          comisiones: comisiones.filter(c => c.profesorUid === doc.uid),
        }));
        setDocentes(docentesConCom);
      } catch (e) {
        console.error('Error cargando docentes:', e);
      } finally {
        setCargandoDocentes(false);
      }
    };
    cargarDocentes();
  }, [seccion]);

  useEffect(() => {
    if (seccion !== 'alumnos') return;
    const cargarAlumnos = async () => {
      setCargandoAlumnos(true);
      try {
        const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'alumno')));
        setAlumnos(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando alumnos:', e);
      } finally {
        setCargandoAlumnos(false);
      }
    };
    cargarAlumnos();
  }, [seccion]);

  useEffect(() => {
    if (seccion !== 'carreras') return;
    const cargarCarreras = async () => {
      setCargandoCarreras(true);
      try {
        const snap = await getDocs(collection(db, 'carreras'));
        if (snap.empty) {
          const batch = writeBatch(db);
          CARRERAS_DISPONIBLES.forEach(c => {
            batch.set(doc(db, 'carreras', c.id), {
              nombre: c.nombre, tipo: c.tipo, duracionAnios: c.duracion_anios, activa: true,
            });
          });
          await batch.commit();
          const snapSeed = await getDocs(collection(db, 'carreras'));
          setCarrerasList(snapSeed.docs.map(d => Carrera.fromFirestore(d.id, d.data())));
        } else {
          setCarrerasList(snap.docs.map(d => Carrera.fromFirestore(d.id, d.data())));
        }
      } catch (e) {
        console.error('Error cargando carreras:', e);
      } finally {
        setCargandoCarreras(false);
      }
    };
    cargarCarreras();
  }, [seccion]);

  const guardarCarrera = async (datos) => {
    try {
      const carrera = new Carrera({ ...datos, activa: carreraEditando?.activa ?? true });
      if (carreraEditando?.id) {
        await updateDoc(doc(db, 'carreras', carreraEditando.id), carrera.toFirestore());
        setCarrerasList(prev => prev.map(c => c.id === carreraEditando.id ? { ...carrera, id: carreraEditando.id } : c));
      } else {
        const ref = await addDoc(collection(db, 'carreras'), carrera.toFirestore());
        setCarrerasList(prev => [...prev, { ...carrera, id: ref.id }]);
      }
      setModalCarreraAbierto(false);
      setCarreraEditando(null);
    } catch (e) {
      console.error('Error guardando carrera:', e);
    }
  };

  const eliminarCarrera = async (id) => {
    if (!window.confirm('Eliminar esta carrera? Esta accion no se puede deshacer.')) return;
    try {
      await deleteDoc(doc(db, 'carreras', id));
      setCarrerasList(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error('Error eliminando carrera:', e);
    }
  };

  const toggleActivaCarrera = async (carrera) => {
    try {
      await updateDoc(doc(db, 'carreras', carrera.id), { activa: !carrera.activa });
      setCarrerasList(prev => prev.map(c => c.id === carrera.id ? { ...c, activa: !c.activa } : c));
    } catch (e) {
      console.error('Error actualizando carrera:', e);
    }
  };

  const guardarDocente = async (datos) => {
    if (!docenteEditando) return;
    try {
      for (const com of docenteEditando.comisiones) {
        await updateDoc(doc(db, 'comisiones', com.id), {
          modalidad: datos.modalidad,
          linkVirtual: datos.linkVirtual || '',
          auxiliares: datos.auxiliares || [],
        });
      }
      setDocentes(prev => prev.map(d =>
        d.uid === docenteEditando.uid
          ? { ...d, modalidad: datos.modalidad, linkVirtual: datos.linkVirtual, auxiliares: datos.auxiliares }
          : d
      ));
      setDocenteEditando(null);
    } catch (e) {
      console.error('Error guardando docente:', e);
    }
  };

  const topbar = (
    <div className="topbar">
      <div className="page-title">
        <h1>Panel administrador</h1>
        <p>Centro de estudiantes · {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  if (seccion === 'docentes') {
    return (
      <>
        {topbar}
        <div className="content">
          <div className="section-head" style={{marginBottom:'14px'}}>
            <h2>Gestion de docentes</h2>
          </div>
          <div className="card">
            <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
              <div>Docente</div><div>Comisiones</div><div>Modalidad</div><div>Link virtual</div><div></div>
            </div>
            {cargandoDocentes ? (
              <div className="empty-state"><p>Cargando docentes...</p></div>
            ) : docentes.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👩‍🏫</div>
                <p>No hay docentes registrados aun.</p>
              </div>
            ) : (
              docentes.map(d => (
                <div key={d.uid} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
                  <div>
                    <div className="materia-name">{d.nombre}</div>
                    <div className="materia-code">{d.email}</div>
                  </div>
                  <div style={{fontSize:'0.85rem'}}>{d.comisiones.length} asignadas</div>
                  <div style={{fontSize:'0.85rem',textTransform:'capitalize'}}>{d.modalidad || 'Presencial'}</div>
                  <div style={{fontSize:'0.8rem'}}>
                    {d.linkVirtual
                      ? <a href={d.linkVirtual} target="_blank" rel="noreferrer" style={{color:'#2e7d32'}}>Ver link</a>
                      : <span style={{opacity:0.4}}>Sin link</span>}
                  </div>
                  <div>
                    <button onClick={() => setDocenteEditando(d)}
                      style={{padding:'5px 12px',background:'#f0f0f0',border:'1px solid #ddd',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem'}}>
                      Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {docenteEditando && (
          <ModalDocente
            docente={docenteEditando}
            onGuardar={guardarDocente}
            onCerrar={() => setDocenteEditando(null)}
          />
        )}
      </>
    );
  }

  if (seccion === 'oferta' || seccion === 'planes' || seccion === 'materias' || seccion === 'panel') {
    return (
      <>
        {topbar}
        <div className="content">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Carreras activas</div>
              <div className="stat-value">{cargando ? '...' : stats.carreras}</div>
              <span className="stat-badge badge-green">Con plan de estudio</span>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total alumnos</div>
              <div className="stat-value">{cargando ? '...' : stats.alumnos}</div>
              <span className="stat-badge badge-blue">Registrados</span>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total docentes</div>
              <div className="stat-value">{cargando ? '...' : stats.docentes}</div>
              <span className="stat-badge badge-yellow">Registrados</span>
            </div>
            <div className="stat-card">
              <div className="stat-label">Materias cargadas</div>
              <div className="stat-value">{cargando ? '...' : stats.materias}</div>
              <span className="stat-badge badge-blue">En el sistema</span>
            </div>
          </div>

          {admin.tienePermiso('importar_oferta') && (
            <>
              <div className="section-head" style={{marginBottom:'14px'}}>
                <h2>Importar datos academicos</h2>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'28px'}}>
                <DropZoneImport
                  titulo="Oferta Academica"
                  descripcion="Importa la oferta del cuatrimestre: materias, comisiones, horarios y docentes."
                  permiteReemplazar
                  onImportar={(archivo, reemplazarTodo) => importService.importarOfertaAcademica(archivo, reemplazarTodo)}
                />
                <DropZoneImport
                  titulo="Plan de Estudio"
                  descripcion="Importa el plan de estudio de una carrera con sus materias y correlativas."
                  permiteReemplazar
                  onImportar={(archivo, reemplazarTodo) => importService.importarPlanEstudio(archivo, reemplazarTodo)}
                />
              </div>
              <DropZoneImport
                titulo="Catalogo de Materias"
                descripcion="Importa el listado completo de materias con codigo, anio, cuatrimestre y correlativas."
                onImportar={archivo => importService.importarMaterias(archivo)}
              />
            </>
          )}
        </div>
      </>
    );
  }

  if (seccion === 'alumnos') {
    const alumnosFiltrados = alumnos.filter(a =>
      (a.nombre || '').toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(busquedaAlumno.toLowerCase())
    );
    return (
      <>
        {topbar}
        <div className="content">
          <div className="section-head" style={{marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2>Alumnos registrados</h2>
            <input type="text" placeholder="Buscar por nombre o email..." value={busquedaAlumno}
              onChange={e => setBusquedaAlumno(e.target.value)}
              style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'0.85rem',width:'260px'}} />
          </div>
          <div className="card">
            <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 2fr'}}>
              <div>Alumno</div><div>DNI</div><div>Carrera</div><div></div>
            </div>
            {cargandoAlumnos ? (
              <div className="empty-state"><p>Cargando alumnos...</p></div>
            ) : alumnosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="icon">👥</div>
                <p>No hay alumnos que coincidan con la busqueda.</p>
              </div>
            ) : (
              alumnosFiltrados.map(a => (
                <div key={a.docId} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 2fr'}}>
                  <div>
                    <div className="materia-name">{a.nombre}</div>
                    <div className="materia-code">{a.email}</div>
                  </div>
                  <div style={{fontSize:'0.85rem'}}>{a.dni || '-'}</div>
                  <div style={{fontSize:'0.85rem'}}>{a.carrera || '-'}</div>
                  <div style={{fontSize:'0.78rem',color:'#999'}}>
                    {Array.isArray(a.carreras) && a.carreras.length > 1 ? `+${a.carreras.length - 1} carrera(s) mas` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  if (seccion === 'carreras') {
    return (
      <>
        {topbar}
        <div className="content">
          <div className="section-head" style={{marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2>Carreras de la institucion</h2>
            <button onClick={() => { setCarreraEditando(null); setModalCarreraAbierto(true); }}
              style={{padding:'8px 18px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
              + Nueva carrera
            </button>
          </div>
          <div className="card">
            <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
              <div>Nombre</div><div>Tipo</div><div>Duracion</div><div>Estado</div><div></div>
            </div>
            {cargandoCarreras ? (
              <div className="empty-state"><p>Cargando carreras...</p></div>
            ) : carrerasList.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🏫</div>
                <p>No hay carreras cargadas aun.</p>
              </div>
            ) : (
              carrerasList.map(c => (
                <div key={c.id} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
                  <div className="materia-name">{c.nombre}</div>
                  <div style={{fontSize:'0.85rem'}}>{c.tipo}</div>
                  <div style={{fontSize:'0.85rem'}}>{c.duracionAnios} anios</div>
                  <div>
                    <span className={'status-badge ' + (c.activa ? 'badge-green' : 'badge-red')}
                      style={{cursor:'pointer'}} onClick={() => toggleActivaCarrera(c)}>
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div style={{display:'flex',gap:'6px'}}>
                    <button onClick={() => { setCarreraEditando(c); setModalCarreraAbierto(true); }}
                      style={{padding:'5px 12px',background:'#f0f0f0',border:'1px solid #ddd',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem'}}>
                      Editar
                    </button>
                    <button onClick={() => eliminarCarrera(c.id)}
                      style={{padding:'5px 12px',background:'#fff0f0',border:'1px solid #f5c6c6',color:'#c0392b',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem'}}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {modalCarreraAbierto && (
          <ModalCarrera
            carrera={carreraEditando}
            onGuardar={guardarCarrera}
            onCerrar={() => { setModalCarreraAbierto(false); setCarreraEditando(null); }}
          />
        )}
      </>
    );
  }

  if (seccion === 'config') {
    return (
      <>
        {topbar}
        <SeccionConfiguracion perfil={perfil} onBaja={() => window.location.reload()} />
      </>
    );
  }

  return (
    <>
      {topbar}
      <div className="content">
        <div className="empty-state">
          <div className="icon">🚧</div>
          <p>Seccion en construccion</p>
        </div>
      </div>
    </>
  );
}

export default PanelAdmin;
