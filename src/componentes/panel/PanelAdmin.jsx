import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import ImportService from '../../services/ImportService';
import AdminCentro from '../../models/AdminCentro';
import Carrera from '../../models/Carrera';
import CARRERAS_DISPONIBLES from '../../carrerasData';
import SeccionConfiguracion from './SeccionConfiguracion';

const importService = new ImportService();

const PLANTILLA_OFERTA_CSV =
  'CARRERA,ASIGNATURA,COD. ASIG,COMISIÓN,TURNO,DIA,HORA,MODALIDAD,SEDE,Aulas\n' +
  'Tec. en Automatizacion y Control y Tec. en Protesis Dental,"Herramientas computacionales para la Ing. Y la Ciencia",4,1,noche,martes,19 a 22,presencial,Escuela N° 5,4\n' +
  ',,,2,noche,miércoles,19 a 22,presencial,Escuela N° 5,1\n' +
  'Tec. en Comunicación Digital,"Taller de Ciencia, Tecnología y Sociedad/Ciencia, tecnología e Innovación",1/269,1,mañana,martes,8 a 12,virtual,virtual,---------------------\n' +
  'Tec. en Diseño y Desarrollo de Producto,,,2,tarde,jueves,14 a 18,virtual,virtual,---------------------\n' +
  'Lic. en Administración,,,3,mañana,martes,10 a 14,presencial,Campus Unab - Aula Magna,8\n';

const PLANTILLA_PLAN_ESTUDIO_CSV =
  'CARRERA,AÑO VIGENCIA,AÑO,CUATRIMESTRE,COD.,ESPACIO CURRICULAR,HS,CURSADO (Cód.),APROBADO (Cód.)\n' +
  'Tecnicatura en Programación,2026,1,1,269,"Ciencia, Tecnología e Innovación",64,,\n' +
  ',,1,1,2,Matemática General,96,,\n' +
  ',,1,1,184,Algoritmos y Estructuras de Datos,96,,\n' +
  ',,1,2,270,Organización de Computadoras,64,,\n' +
  ',,1,2,177,Álgebra,96,2,\n' +
  ',,1,2,271,Estructuras de Datos,64,184,\n' +
  ',,1,2,5,Inglés,48,,\n' +
  ',,2,1,189,Programación Avanzada,96,184,\n' +
  ',,2,1,180,Probabilidad y Estadística,96,177,2\n' +
  ',,2,1,273,Desarrollo de Software,64,184,\n' +
  ',,2,1,274,Inglés Comunicacional,48,,5\n' +
  ',,2,2,186,Gestión de Datos,96,271,184\n' +
  ',,2,2,183,"Inferencia Estadística y Reconocimiento de Patrones",96,"271, 180",184\n' +
  ',,2,2,188,Visualización de la Información,64,"271, 189",184\n';

function descargarPlantilla(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

function DropZoneImport({ titulo, descripcion, onImportar, permiteReemplazar = false, plantilla = null, nombrePlantilla = 'plantilla.csv' }) {
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
      {plantilla && (
        <button onClick={() => descargarPlantilla(plantilla, nombrePlantilla)}
          style={{marginTop:'12px',padding:'8px 14px',background:'none',border:'1px solid var(--border)',borderRadius:'8px',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',color:'var(--text-1)'}}>
          ⬇ Descargar plantilla CSV
        </button>
      )}
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
      <div style={{background:'var(--surface)',borderRadius:'12px',padding:'28px',width:'480px',maxWidth:'90vw'}}>
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
              style={{flex:1,padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)'}} />
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
          <button onClick={onCerrar} style={{padding:'8px 18px',border:'1px solid var(--border)',borderRadius:'6px',cursor:'pointer',background:'var(--surface-2)',color:'var(--text-1)'}}>Cancelar</button>
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
      <div style={{background:'var(--surface)',borderRadius:'12px',padding:'28px',width:'440px',maxWidth:'90vw'}}>
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
          <button onClick={onCerrar} style={{padding:'8px 18px',border:'1px solid var(--border)',borderRadius:'6px',cursor:'pointer',background:'var(--surface-2)',color:'var(--text-1)'}}>Cancelar</button>
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


function DocenteRow({ d }) {
  const [expandido, setExpandido] = useState(false);
  return (
    <div>
      <div className="table-row" style={{gridTemplateColumns:'2fr 1fr 60px',cursor:'pointer'}} onClick={() => setExpandido(prev => !prev)}>
        <div>
          <div className="materia-name">{d.nombre}</div>
          <div className="materia-code">{d.email}</div>
        </div>
        <div style={{fontSize:'0.85rem',textAlign:'center'}}>{d.comisiones.length} materia(s)</div>
        <div style={{textAlign:'center',fontSize:'1rem'}}>{expandido ? '▲' : '▼'}</div>
      </div>
      {expandido && (
        <div style={{background:'var(--surface-2)',padding:'12px 20px',borderBottom:'1px solid var(--border)'}}>
          {d.comisiones.length === 0 ? (
            <p style={{fontSize:'0.82rem',color:'var(--text-3)'}}>Sin comisiones asignadas.</p>
          ) : (
            <>
              <div style={{display:'grid',gridTemplateColumns:'2fr 80px 1fr 1fr 1fr 1fr',gap:'8px',padding:'4px 0 8px',borderBottom:'1px solid var(--border)',fontSize:'0.7rem',color:'var(--text-3)',fontWeight:700,textTransform:'uppercase'}}>
                <div>Materia</div><div style={{textAlign:'center'}}>Comision</div><div style={{textAlign:'center'}}>Modalidad</div><div style={{textAlign:'center'}}>Horario</div><div style={{textAlign:'center'}}>Aula</div><div style={{textAlign:'center'}}>Link</div>
              </div>
              {d.comisiones.map((com, i) => (
              <div key={com.id || i} style={{
                display:'grid',
                gridTemplateColumns:'2fr 80px 1fr 1fr 1fr 1fr',
                gap:'8px',
                padding:'8px 0',
                borderBottom: i < d.comisiones.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize:'0.82rem',
                alignItems:'center'
              }}>
                <div style={{fontWeight:600,color:'var(--text-1)'}}>{com.materiaNombre || com.materiaId || '-'}</div>
                <div style={{color:'var(--text-2)',textAlign:'center'}}>Com. {com.numero || '-'}</div>
                <div style={{color:'var(--text-2)',textAlign:'center',textTransform:'capitalize'}}>{com.modalidad || '-'}</div>
                <div style={{color:'var(--text-2)',textAlign:'center'}}>{com.horario || '-'}</div>
                <div style={{color:'var(--text-2)',textAlign:'center'}}>{com.aula || '-'}</div>
                <div style={{textAlign:'center'}}>
                  {com.linkVirtual
                    ? <a href={com.linkVirtual} target="_blank" rel="noreferrer" style={{color:'var(--accent)',fontSize:'0.78rem'}}>Ver link</a>
                    : <span style={{opacity:0.4,color:'var(--text-3)'}}>Sin link</span>}
                </div>
              </div>
            ))}
            </>
          )}
        </div>
      )}
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
  const [usuariosTodos, setUsuariosTodos] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [guardandoRolUid, setGuardandoRolUid] = useState(null);

  const [ofertaLista, setOfertaLista] = useState([]);
  const [cargandoOfertaLista, setCargandoOfertaLista] = useState(false);
  const [busquedaOferta, setBusquedaOferta] = useState('');
  const [editandoOfertaId, setEditandoOfertaId] = useState(null);
  const [edicionOferta, setEdicionOferta] = useState({});

  const [planesLista, setPlanesLista] = useState([]);
  const [cargandoPlanes, setCargandoPlanes] = useState(false);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState('');
  const [materiasPlanEdit, setMateriasPlanEdit] = useState([]);
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const [busquedaPlanMateria, setBusquedaPlanMateria] = useState('');

  const [materiasLista, setMateriasLista] = useState([]);
  const [cargandoMateriasLista, setCargandoMateriasLista] = useState(false);
  const [busquedaMateria, setBusquedaMateria] = useState('');
  const [editandoMateriaId, setEditandoMateriaId] = useState(null);
  const [edicionMateria, setEdicionMateria] = useState({});

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
    if (seccion !== 'usuarios') return;
    const cargarUsuarios = async () => {
      setCargandoUsuarios(true);
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        setUsuariosTodos(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando usuarios:', e);
      } finally {
        setCargandoUsuarios(false);
      }
    };
    cargarUsuarios();
  }, [seccion]);

  const cambiarRolUsuario = async (usuario, nuevoRol) => {
    setGuardandoRolUid(usuario.docId);
    try {
      await updateDoc(doc(db, 'usuarios', usuario.docId), { rol: nuevoRol });
      setUsuariosTodos(prev => prev.map(u => u.docId === usuario.docId ? { ...u, rol: nuevoRol } : u));
    } catch (e) {
      console.error('Error actualizando rol:', e);
      alert('No se pudo actualizar el rol. Intenta de nuevo.');
    } finally {
      setGuardandoRolUid(null);
    }
  };

  useEffect(() => {
    if (seccion !== 'oferta') return;
    const cargarOferta = async () => {
      setCargandoOfertaLista(true);
      try {
        const snap = await getDocs(collection(db, 'comisionesOferta'));
        setOfertaLista(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando oferta:', e);
      } finally {
        setCargandoOfertaLista(false);
      }
    };
    cargarOferta();
  }, [seccion]);

  const iniciarEdicionOferta = (item) => {
    setEditandoOfertaId(item.id);
    setEdicionOferta({ ...item });
  };

  const guardarEdicionOferta = async () => {
    try {
      const { id, ...campos } = edicionOferta;
      await updateDoc(doc(db, 'comisionesOferta', id), campos);
      setOfertaLista(prev => prev.map(o => o.id === id ? { ...o, ...campos } : o));
      setEditandoOfertaId(null);
    } catch (e) {
      console.error('Error guardando comision:', e);
      alert('No se pudo guardar. Intenta de nuevo.');
    }
  };

  const eliminarOferta = async (id) => {
    if (!window.confirm('Eliminar esta comision de la oferta? Esta accion no se puede deshacer.')) return;
    try {
      await deleteDoc(doc(db, 'comisionesOferta', id));
      setOfertaLista(prev => prev.filter(o => o.id !== id));
    } catch (e) {
      console.error('Error eliminando comision:', e);
    }
  };

  useEffect(() => {
    if (seccion !== 'planes') return;
    const cargarPlanes = async () => {
      setCargandoPlanes(true);
      try {
        const snap = await getDocs(collection(db, 'planesEstudio'));
        setPlanesLista(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando planes de estudio:', e);
      } finally {
        setCargandoPlanes(false);
      }
    };
    cargarPlanes();
  }, [seccion]);

  const seleccionarPlan = (planId) => {
    setPlanSeleccionadoId(planId);
    const plan = planesLista.find(p => p.id === planId);
    setMateriasPlanEdit(plan ? plan.materias.map(m => ({ ...m })) : []);
  };

  const actualizarMateriaPlan = (idx, campo, valor) => {
    setMateriasPlanEdit(prev => prev.map((m, i) => {
      if (i !== idx) return m;
      if (campo === 'para_cursar' || campo === 'para_aprobar') {
        return { ...m, correlativas: { ...m.correlativas, [campo]: valor.split(',').map(c => c.trim()).filter(Boolean) } };
      }
      return { ...m, [campo]: valor };
    }));
  };

  const agregarMateriaPlan = () => {
    setMateriasPlanEdit(prev => [...prev, { codigo: '', nombre: '', anio: 1, cuatrimestre: 1, horas: 0, correlativas: { para_cursar: [], para_aprobar: [] } }]);
  };

  const eliminarMateriaPlan = (idx) => {
    setMateriasPlanEdit(prev => prev.filter((_, i) => i !== idx));
  };

  const guardarPlan = async () => {
    if (!planSeleccionadoId) return;
    setGuardandoPlan(true);
    try {
      const materiasLimpias = materiasPlanEdit.map(m => ({
        ...m, anio: Number(m.anio) || 1, cuatrimestre: Number(m.cuatrimestre) || 1, horas: Number(m.horas) || 0,
      }));
      await updateDoc(doc(db, 'planesEstudio', planSeleccionadoId), { materias: materiasLimpias });
      setPlanesLista(prev => prev.map(p => p.id === planSeleccionadoId ? { ...p, materias: materiasLimpias } : p));
      setMateriasPlanEdit(materiasLimpias.map(m => ({ ...m })));
    } catch (e) {
      console.error('Error guardando plan de estudio:', e);
      alert('No se pudo guardar el plan. Intenta de nuevo.');
    } finally {
      setGuardandoPlan(false);
    }
  };

  useEffect(() => {
    if (seccion !== 'materias') return;
    const cargarMaterias = async () => {
      setCargandoMateriasLista(true);
      try {
        const snap = await getDocs(collection(db, 'materias'));
        setMateriasLista(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando materias:', e);
      } finally {
        setCargandoMateriasLista(false);
      }
    };
    cargarMaterias();
  }, [seccion]);

  const iniciarEdicionMateria = (item) => {
    setEditandoMateriaId(item.id);
    setEdicionMateria({ ...item, correlativas: (item.correlativas || []).join(', ') });
  };

  const guardarEdicionMateria = async () => {
    try {
      const { id, ...campos } = edicionMateria;
      const datos = {
        ...campos,
        anio: Number(campos.anio) || 1,
        cuatrimestre: Number(campos.cuatrimestre) || 1,
        creditos: Number(campos.creditos) || 0,
        correlativas: typeof campos.correlativas === 'string'
          ? campos.correlativas.split(',').map(c => c.trim()).filter(Boolean)
          : (campos.correlativas || []),
      };
      await updateDoc(doc(db, 'materias', id), datos);
      setMateriasLista(prev => prev.map(m => m.id === id ? { ...m, ...datos } : m));
      setEditandoMateriaId(null);
    } catch (e) {
      console.error('Error guardando materia:', e);
      alert('No se pudo guardar. Intenta de nuevo.');
    }
  };

  const eliminarMateria = async (id) => {
    if (!window.confirm('Eliminar esta materia del catalogo? Esta accion no se puede deshacer.')) return;
    try {
      await deleteDoc(doc(db, 'materias', id));
      setMateriasLista(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error('Error eliminando materia:', e);
    }
  };

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

  if (seccion === 'usuarios') {
    const busq = busquedaUsuario.toLowerCase();
    const usuariosFiltrados = usuariosTodos.filter(u =>
      (u.nombre || '').toLowerCase().includes(busq) ||
      (u.email || '').toLowerCase().includes(busq)
    );
    const ROLES = [
      { value: 'alumno', label: 'Alumno' },
      { value: 'profesor', label: 'Profesor' },
      { value: 'admin_centro', label: 'Administrador' },
    ];
    return (
      <>
        {topbar}
        <div className="content">
          <div className="section-head" style={{marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2>Usuarios y roles</h2>
            <input type="text" placeholder="Buscar por nombre o correo..." value={busquedaUsuario}
              onChange={e => setBusquedaUsuario(e.target.value)}
              style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'0.85rem',width:'260px'}} />
          </div>
          <p style={{fontSize:'0.82rem',color:'var(--text-2)',marginBottom:'16px'}}>
            Todo usuario nuevo se registra como Alumno por defecto. Desde aqui podes asignarle el rol de Profesor o Administrador.
          </p>
          <div className="card">
            <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
              <div>Usuario</div><div style={{textAlign:'center'}}>DNI</div><div style={{textAlign:'center'}}>Carrera</div><div style={{textAlign:'center'}}>Rol</div>
            </div>
            {cargandoUsuarios ? (
              <div className="empty-state"><p>Cargando usuarios...</p></div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🛡</div>
                <p>No hay usuarios que coincidan con la busqueda.</p>
              </div>
            ) : (
              usuariosFiltrados.map(u => (
                <div key={u.docId} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
                  <div>
                    <div className="materia-name">{u.nombre || '(sin nombre)'}</div>
                    <div className="materia-code">{u.email}</div>
                  </div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{u.dni || '-'}</div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{u.carrera || '-'}</div>
                  <div style={{textAlign:'center'}}>
                    <select
                      value={ROLES.some(r => r.value === u.rol) ? u.rol : 'alumno'}
                      disabled={guardandoRolUid === u.docId}
                      onChange={e => cambiarRolUsuario(u, e.target.value)}
                      style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'0.82rem',cursor:'pointer'}}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  if (seccion === 'docentes') {
    return (
      <>
        {topbar}
        <div className="content">
          <div className="section-head" style={{marginBottom:'14px'}}>
            <h2>Gestion de docentes</h2>
          </div>
          <div className="card">
            <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 60px'}}>
              <div>Docente</div><div style={{textAlign:'center'}}>Materias</div><div></div>
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
                <DocenteRow key={d.uid} d={d} />
              ))
            )}
          </div>
        </div>

      </>
    );
  }

  if (seccion === 'panel') {
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
        </div>
      </>
    );
  }

  if (seccion === 'oferta') {
    const norm = t => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const busq = norm(busquedaOferta);
    const ofertaFiltrada = ofertaLista.filter(o =>
      !busq ||
      norm(o.carrera_ref).includes(busq) ||
      norm(o.materia_nombre).includes(busq) ||
      norm(o.codigo_asignatura).includes(busq) ||
      norm(String(o.comision || '')).includes(busq)
    );
    const ofertaAMostrar = busq ? ofertaFiltrada : ofertaFiltrada.slice(0, 50);
    const camposOferta = [
      { key: 'carrera_ref', label: 'Carrera' },
      { key: 'materia_nombre', label: 'Materia' },
      { key: 'codigo_asignatura', label: 'Cod.' },
      { key: 'comision', label: 'Com.' },
      { key: 'turno', label: 'Turno' },
      { key: 'dia', label: 'Dia' },
      { key: 'hora_rango', label: 'Horario' },
      { key: 'modalidad', label: 'Modalidad' },
      { key: 'sede', label: 'Sede' },
      { key: 'aula', label: 'Aula' },
    ];
    return (
      <>
        {topbar}
        <div className="content">
          {admin.tienePermiso('importar_oferta') && (
            <div style={{marginBottom:'28px',maxWidth:'520px'}}>
              <DropZoneImport
                titulo="Importar Oferta Academica"
                descripcion="Importa la oferta del cuatrimestre: materias, comisiones, horarios y docentes."
                permiteReemplazar
                onImportar={(archivo, reemplazarTodo) => importService.importarOfertaAcademica(archivo, reemplazarTodo).then(c => { setOfertaLista([]); return c; })}
                plantilla={PLANTILLA_OFERTA_CSV}
                nombrePlantilla="plantilla_oferta_academica.csv"
              />
            </div>
          )}

          <div className="section-head" style={{marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2>Oferta academica ({ofertaLista.length} comisiones)</h2>
            <input type="text" placeholder="Buscar por carrera, materia o codigo..." value={busquedaOferta}
              onChange={e => setBusquedaOferta(e.target.value)}
              style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'0.85rem',width:'300px'}} />
          </div>
          {!busq && ofertaLista.length > 50 && (
            <p style={{fontSize:'0.8rem',color:'var(--text-2)',marginBottom:'12px'}}>
              Mostrando 50 de {ofertaLista.length}. Usa el buscador para encontrar otras comisiones.
            </p>
          )}
          <div className="card" style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
              <thead>
                <tr style={{background:'var(--surface-2)'}}>
                  {camposOferta.map(c => (
                    <th key={c.key} style={{padding:'8px 10px',textAlign:'left',fontWeight:600,whiteSpace:'nowrap',color:'var(--text-2)'}}>{c.label}</th>
                  ))}
                  <th style={{padding:'8px 10px'}}></th>
                </tr>
              </thead>
              <tbody>
                {cargandoOfertaLista ? (
                  <tr><td colSpan={camposOferta.length + 1} style={{textAlign:'center',padding:'24px',color:'var(--text-3)'}}>Cargando...</td></tr>
                ) : ofertaAMostrar.length === 0 ? (
                  <tr><td colSpan={camposOferta.length + 1} style={{textAlign:'center',padding:'24px',color:'var(--text-3)'}}>No hay comisiones que coincidan.</td></tr>
                ) : (
                  ofertaAMostrar.map(item => {
                    const editando = editandoOfertaId === item.id;
                    return (
                      <tr key={item.id} style={{borderBottom:'1px solid var(--border)'}}>
                        {camposOferta.map(c => (
                          <td key={c.key} style={{padding:'6px 8px'}}>
                            {editando ? (
                              <input type="text" value={edicionOferta[c.key] || ''}
                                onChange={e => setEdicionOferta(prev => ({ ...prev, [c.key]: e.target.value }))}
                                style={{width:'100px',padding:'4px 6px',borderRadius:'4px',border:'1px solid var(--border)',fontSize:'0.78rem',background:'var(--surface-2)',color:'var(--text-1)'}} />
                            ) : (
                              <span>{item[c.key] || '-'}</span>
                            )}
                          </td>
                        ))}
                        <td style={{padding:'6px 8px',whiteSpace:'nowrap'}}>
                          {editando ? (
                            <>
                              <button onClick={guardarEdicionOferta}
                                style={{padding:'4px 10px',background:'#2e7d32',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'0.75rem',marginRight:'4px'}}>
                                Guardar
                              </button>
                              <button onClick={() => setEditandoOfertaId(null)}
                                style={{padding:'4px 10px',background:'var(--surface-2)',color:'var(--text-1)',border:'1px solid var(--border)',borderRadius:'6px',cursor:'pointer',fontSize:'0.75rem'}}>
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => iniciarEdicionOferta(item)}
                                style={{padding:'4px 10px',background:'#f0f0f0',border:'1px solid #ddd',borderRadius:'6px',cursor:'pointer',fontSize:'0.75rem',marginRight:'4px'}}>
                                Editar
                              </button>
                              <button onClick={() => eliminarOferta(item.id)}
                                style={{padding:'4px 10px',background:'#fff0f0',border:'1px solid #f5c6c6',color:'#c0392b',borderRadius:'6px',cursor:'pointer',fontSize:'0.75rem'}}>
                                Eliminar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  if (seccion === 'planes') {
    const materiasPlanFiltradas = materiasPlanEdit.filter(m =>
      !busquedaPlanMateria ||
      (m.nombre || '').toLowerCase().includes(busquedaPlanMateria.toLowerCase()) ||
      String(m.codigo || '').toLowerCase().includes(busquedaPlanMateria.toLowerCase())
    );
    return (
      <>
        {topbar}
        <div className="content">
          {admin.tienePermiso('importar_oferta') && (
            <div style={{marginBottom:'28px',maxWidth:'520px'}}>
              <DropZoneImport
                titulo="Importar Plan de Estudio"
                descripcion="Importa el plan de estudio de una carrera con sus materias y correlativas."
                permiteReemplazar
                onImportar={(archivo, reemplazarTodo) => importService.importarPlanEstudio(archivo, reemplazarTodo).then(c => { setPlanesLista([]); setPlanSeleccionadoId(''); setMateriasPlanEdit([]); return c; })}
                plantilla={PLANTILLA_PLAN_ESTUDIO_CSV}
                nombrePlantilla="plantilla_plan_estudio.csv"
              />
            </div>
          )}

          <div className="section-head" style={{marginBottom:'14px'}}>
            <h2>Plan de estudio por carrera</h2>
          </div>
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px',alignItems:'flex-end'}}>
            <div>
              <label style={{display:'block',fontSize:'0.8rem',fontWeight:600,marginBottom:'6px'}}>Carrera</label>
              <select value={planSeleccionadoId} onChange={e => seleccionarPlan(e.target.value)}
                style={{padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',minWidth:'300px',background:'var(--surface-2)',color:'var(--text-1)'}}>
                <option value="">Selecciona un plan de estudio</option>
                {planesLista.map(p => (
                  <option key={p.id} value={p.id}>{p.carrera} ({p.anioVigencia}) · {p.materias.length} materias</option>
                ))}
              </select>
            </div>
            {planSeleccionadoId && (
              <div>
                <input type="text" placeholder="Buscar materia..." value={busquedaPlanMateria}
                  onChange={e => setBusquedaPlanMateria(e.target.value)}
                  style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid var(--border)',fontSize:'0.85rem',width:'220px',background:'var(--surface-2)',color:'var(--text-1)'}} />
              </div>
            )}
          </div>

          {cargandoPlanes ? (
            <div className="empty-state"><p>Cargando planes...</p></div>
          ) : !planSeleccionadoId ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>Elegi una carrera para ver y editar su plan de estudio.</p>
            </div>
          ) : (
            <>
              <div className="card" style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                  <thead>
                    <tr style={{background:'var(--surface-2)'}}>
                      <th style={{padding:'8px 10px',textAlign:'left'}}>Cod.</th>
                      <th style={{padding:'8px 10px',textAlign:'left'}}>Materia</th>
                      <th style={{padding:'8px 10px',textAlign:'left'}}>Año</th>
                      <th style={{padding:'8px 10px',textAlign:'left'}}>Cuatrim.</th>
                      <th style={{padding:'8px 10px',textAlign:'left'}}>Horas</th>
                      <th style={{padding:'8px 10px',textAlign:'left'}}>Correlativas (cursar)</th>
                      <th style={{padding:'8px 10px',textAlign:'left'}}>Correlativas (aprobar)</th>
                      <th style={{padding:'8px 10px'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiasPlanFiltradas.map((m) => {
                      const idx = materiasPlanEdit.indexOf(m);
                      return (
                        <tr key={idx} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'6px 8px'}}>
                            <input type="text" value={m.codigo || ''} onChange={e => actualizarMateriaPlan(idx, 'codigo', e.target.value)}
                              style={{width:'50px',padding:'4px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)'}} />
                          </td>
                          <td style={{padding:'6px 8px'}}>
                            <input type="text" value={m.nombre || ''} onChange={e => actualizarMateriaPlan(idx, 'nombre', e.target.value)}
                              style={{width:'220px',padding:'4px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)'}} />
                          </td>
                          <td style={{padding:'6px 8px'}}>
                            <input type="number" min="1" value={m.anio || 1} onChange={e => actualizarMateriaPlan(idx, 'anio', e.target.value)}
                              style={{width:'50px',padding:'4px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)'}} />
                          </td>
                          <td style={{padding:'6px 8px'}}>
                            <input type="number" min="1" max="2" value={m.cuatrimestre || 1} onChange={e => actualizarMateriaPlan(idx, 'cuatrimestre', e.target.value)}
                              style={{width:'50px',padding:'4px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)'}} />
                          </td>
                          <td style={{padding:'6px 8px'}}>
                            <input type="number" min="0" value={m.horas || 0} onChange={e => actualizarMateriaPlan(idx, 'horas', e.target.value)}
                              style={{width:'60px',padding:'4px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)'}} />
                          </td>
                          <td style={{padding:'6px 8px'}}>
                            <input type="text" value={(m.correlativas?.para_cursar || []).join(', ')}
                              onChange={e => actualizarMateriaPlan(idx, 'para_cursar', e.target.value)}
                              placeholder="codigos separados por coma"
                              style={{width:'150px',padding:'4px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)'}} />
                          </td>
                          <td style={{padding:'6px 8px'}}>
                            <input type="text" value={(m.correlativas?.para_aprobar || []).join(', ')}
                              onChange={e => actualizarMateriaPlan(idx, 'para_aprobar', e.target.value)}
                              placeholder="codigos separados por coma"
                              style={{width:'150px',padding:'4px 6px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)'}} />
                          </td>
                          <td style={{padding:'6px 8px'}}>
                            <button onClick={() => eliminarMateriaPlan(idx)}
                              style={{background:'none',border:'none',cursor:'pointer',color:'#c0392b',fontWeight:700}}>
                              x
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:'16px'}}>
                <button onClick={agregarMateriaPlan}
                  style={{padding:'8px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)',cursor:'pointer',fontWeight:600}}>
                  + Agregar materia
                </button>
                <button onClick={guardarPlan} disabled={guardandoPlan}
                  style={{padding:'10px 24px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
                  {guardandoPlan ? 'Guardando...' : 'Guardar plan de estudio'}
                </button>
              </div>
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
              <div>Alumno</div><div style={{textAlign:'center'}}>DNI</div><div style={{textAlign:'center'}}>Carrera</div><div></div>
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
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{a.dni || '-'}</div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{a.carrera || '-'}</div>
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
            <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 130px'}}>
              <div>Nombre</div><div style={{textAlign:'center'}}>Tipo</div><div style={{textAlign:'center'}}>Duración</div><div style={{textAlign:'center'}}>Estado</div><div></div>
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
                <div key={c.id} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 130px'}}>
                  <div className="materia-name">{c.nombre}</div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{c.tipo}</div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{c.duracionAnios} años</div>
                  <div style={{textAlign:'center'}}>
                    <span className={'status-badge ' + (c.activa ? 'badge-green' : 'badge-red')}
                      style={{cursor:'pointer'}} onClick={() => toggleActivaCarrera(c)}>
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div style={{display:'flex',gap:'6px',justifyContent:'center'}}>
                    <button onClick={() => { setCarreraEditando(c); setModalCarreraAbierto(true); }}
                      style={{padding:'5px 12px',background:'var(--surface-2)',border:'1px solid var(--border)',color:'var(--text-1)',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem'}}>
                      Editar
                    </button>
                    <button onClick={() => eliminarCarrera(c.id)}
                      style={{padding:'5px 12px',background:'var(--red-dim)',border:'1px solid var(--red)',color:'var(--red)',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem'}}>
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
