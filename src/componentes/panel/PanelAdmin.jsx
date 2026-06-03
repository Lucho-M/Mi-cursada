import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import ImportService from '../../services/ImportService';
import AdminCentro from '../../models/AdminCentro';

const importService = new ImportService();

function DropZoneImport({ titulo, descripcion, formatoEjemplo, onImportar }) {
  const [dragOver, setDragOver] = useState(false);
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef();

  const procesar = async archivo => {
    if (!archivo) return;
    setCargando(true);
    setEstado(null);
    try {
      const cantidad = await onImportar(archivo);
      setEstado({ tipo: 'ok', msg: cantidad + ' registros importados correctamente' });
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

function PanelAdmin({ perfil, seccion }) {
  const [stats, setStats] = useState({ carreras: 0, alumnos: 0, docentes: 0, materias: 0 });
  const [cargando, setCargando] = useState(true);
  const [docentes, setDocentes] = useState([]);
  const [cargandoDocentes, setCargandoDocentes] = useState(false);
  const [docenteEditando, setDocenteEditando] = useState(null);

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
                  onImportar={archivo => importService.importarOfertaAcademica(archivo)}
                />
                <DropZoneImport
                  titulo="Plan de Estudio"
                  descripcion="Importa el plan de estudio de una carrera con sus materias y correlativas."
                  onImportar={archivo => importService.importarPlanEstudio(archivo)}
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
