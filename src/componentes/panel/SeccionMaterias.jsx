import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

const SIU_URL = 'https://inscripcion.unab.edu.ar/rectorado/acceso';

function normalizarTexto(texto) {
  return (texto || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// La oferta usa nombres abreviados ("Tec. en X", "Lic. en X") mientras que el
// nombre formal de la carrera dice "Tecnicatura en X" / "Licenciatura en X".
// Se quita ese prefijo antes de comparar para no perder la palabra clave.
const PREFIJOS_CARRERA = [
  'tecnicatura universitaria en', 'tecnicatura en',
  'licenciatura en', 'ccc licenciatura en ensenanza de',
].sort((a, b) => b.length - a.length);

function nucleoCarrera(texto) {
  let t = normalizarTexto(texto);
  for (const pre of PREFIJOS_CARRERA) {
    if (t.startsWith(pre + ' ')) { t = t.slice(pre.length).trim(); break; }
  }
  return t;
}

function carreraEnOferta(carreraRef, nombreCarrera) {
  const ref = normalizarTexto(carreraRef);
  const nucleo = nucleoCarrera(nombreCarrera);
  const palabras = nucleo.split(' ').filter(p => p.length > 3);
  if (palabras.length === 0) return false;
  return palabras.every(p => ref.includes(p));
}

export default function SeccionMaterias({ perfil, notasHistorial, setSeccion }) {
  const [tab, setTab] = useState('inscripciones');
  const [filtro, setFiltro] = useState('todas');
  const [inscripciones, setInscripciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [ofertaData, setOfertaData] = useState([]);
  const [planInfo, setPlanInfo] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevaInscripcion, setNuevaInscripcion] = useState({
    materiaNombre: '', comision: '', dia: '', horario: '', aula: '', docente: '', modalidad: 'presencial', sede: ''
  });
  const [mensaje, setMensaje] = useState('');

  const carreras = Array.isArray(perfil?.carreras) && perfil.carreras.length > 0
    ? perfil.carreras : (perfil?.carrera ? [perfil.carrera] : []);
  const carreraActual = carreras[0] || '';
  const materiasCarrera = planInfo?.materias || [];

  // Materias cursadas y aprobadas del historial
  const cursadas = new Set(
    (notasHistorial || [])
      .filter(n => ['regular_sin_final','regular_con_final','promocionado','libre','equivalencia'].includes(n.estado))
      .map(n => n.materiaId)
  );
  const aprobadas = new Set(
    (notasHistorial || [])
      .filter(n => ['regular_con_final','promocionado','libre','equivalencia'].includes(n.estado))
      .map(n => n.materiaId)
  );

  // Filtrar oferta por carrera del alumno
  const ofertaCarrera = ofertaData.filter(o => carreraEnOferta(o.carrera_ref, carreraActual));

  // Agrupar oferta por materia
  const ofertaAgrupada = ofertaCarrera.reduce((acc, o) => {
    const key = o.materia_nombre;
    if (!acc[key]) acc[key] = { nombre: key, comisiones: [] };
    acc[key].comisiones.push(o);
    return acc;
  }, {});

  // Verificar correlativas
  const puedeInscribirse = (nombreMateria) => {
    const materia = materiasCarrera.find(m =>
      normalizarTexto(m.nombre).includes(normalizarTexto(nombreMateria).substring(0, 15))
    );
    if (!materia) return true;
    const corrParaCursar = materia.correlativas?.para_cursar || [];
    const corrParaAprobar = materia.correlativas?.para_aprobar || [];
    const cumpleCursadas = corrParaCursar.every(c => cursadas.has(c) || aprobadas.has(c));
    const cumpleAprobadas = corrParaAprobar.every(c => aprobadas.has(c));
    return cumpleCursadas && cumpleAprobadas;
  };

  useEffect(() => {
    if (!perfil?.uid) return;
    const cargar = async () => {
      setCargando(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'inscripciones'), where('alumnoUid', '==', perfil.uid))
        );
        setInscripciones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [perfil?.uid]);

  useEffect(() => {
    const cargarOferta = async () => {
      try {
        const snap = await getDocs(collection(db, 'comisionesOferta'));
        setOfertaData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando oferta academica:', e);
      }
    };
    cargarOferta();
  }, []);

  useEffect(() => {
    if (!carreraActual) return;
    const cargarPlan = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'planesEstudio'), where('carrera', '==', carreraActual))
        );
        if (!snap.empty) setPlanInfo({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } catch (e) {
        console.error('Error cargando plan de estudio:', e);
      }
    };
    cargarPlan();
  }, [carreraActual]);

  const agregarInscripcion = async () => {
    if (!nuevaInscripcion.materiaNombre.trim()) {
      setMensaje('error:Ingresa el nombre de la materia.');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'inscripciones'), {
        alumnoUid: perfil.uid,
        materiaId: nuevaInscripcion.materiaNombre.toLowerCase().replace(/ /g, '_'),
        materiaNombre: nuevaInscripcion.materiaNombre,
        comisionId: nuevaInscripcion.comision,
        dia: nuevaInscripcion.dia,
        horario: nuevaInscripcion.horario,
        aula: nuevaInscripcion.aula,
        docente: nuevaInscripcion.docente,
        modalidad: nuevaInscripcion.modalidad,
        sede: nuevaInscripcion.sede,
        cuatrimestre: 1,
        anio: 2026,
      });
     setInscripciones(prev => [...prev, { id: docRef.id, ...nuevaInscripcion, comisionId: nuevaInscripcion.comision, alumnoUid: perfil.uid }]);
      setNuevaInscripcion({ materiaNombre:'', comision:'', dia:'', horario:'', aula:'', docente:'', modalidad:'presencial', sede:'' });
      setMensaje('ok:Materia agregada correctamente.');
    } catch (e) {
      setMensaje('error:Error al guardar. Intenta de nuevo.');
      console.error(e);
    }
  };

  const eliminarInscripcion = async (id) => {
    try {
      await deleteDoc(doc(db, 'inscripciones', id));
      setInscripciones(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const ofertaKeysTodas = Object.keys(ofertaAgrupada);
  const ofertaKeys = filtro === 'puedo' ? ofertaKeysTodas.filter(n => puedeInscribirse(n)) : ofertaKeysTodas;

  return (
    <div className="content">
      <div style={{display:'flex',gap:'10px',marginBottom:'20px',borderBottom:'1px solid #eee',paddingBottom:'12px',flexWrap:'wrap'}}>
        {[
          {key:'inscripciones', label:'Mis inscripciones'},
          {key:'oferta', label:'Oferta del cuatrimestre'},
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{padding:'8px 18px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:600,fontSize:'0.88rem',
              background: tab === t.key ? '#2e7d32' : '#f5f5f5',
              color: tab === t.key ? 'white' : '#555'}}>
            {t.label}
          </button>
        ))}
        <a href={SIU_URL} target="_blank" rel="noreferrer"
          style={{marginLeft:'auto',padding:'8px 18px',borderRadius:'8px',background:'#1565c0',color:'white',fontWeight:600,fontSize:'0.88rem',textDecoration:'none',display:'flex',alignItems:'center',gap:'6px'}}>
          Inscribirme en SIU Guarani →
        </a>
      </div>

      {tab === 'oferta' && (
        <div>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
            {[{key:'todas',label:'Todas las materias'},{key:'puedo',label:'Puedo cursar'}].map(f => (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                style={{padding:'6px 14px',borderRadius:'20px',border:'1px solid #ddd',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',
                  background: filtro === f.key ? '#2e7d32' : 'white',
                  color: filtro === f.key ? 'white' : '#333'}}>
                {f.label}
              </button>
            ))}
          </div>
          <p style={{fontSize:'0.85rem',color:'var(--text-2)',marginBottom:'16px'}}>
            Materias disponibles para tu carrera este cuatrimestre. Las marcadas en verde cumplen las correlativas.
          </p>
          {ofertaKeys.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📚</div>
              <p>No se encontro oferta para tu carrera este cuatrimestre.</p>
            </div>
          ) : (
            ofertaKeys.map(nombre => {
              const grupo = ofertaAgrupada[nombre];
              const puede = puedeInscribirse(nombre);
              return (
                <div key={nombre} style={{border:'1px solid '+(puede?'var(--green)':'var(--border)'),borderRadius:'10px',padding:'14px',marginBottom:'12px',background:'var(--surface)',textAlign:'left'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-1)',fontWeight:700}}>{nombre}</div>
                      <div style={{fontSize:'0.75rem',color:puede?'#4caf50':'#e74c3c',fontWeight:puede?400:700,marginTop:'2px'}}>
                        {puede ? '✓ Podes inscribirte' : (<span onClick={() => setSeccion && setSeccion('correlativas')} style={{cursor:'pointer',textDecoration:'underline'}}><span style={{color:'#f1c40f'}}>⚠</span> Verificar correlativas</span>)}
                      </div>
                    </div>

                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                    {grupo.comisiones.map((c, i) => (
                      <div key={i} style={{fontSize:'0.75rem',background:'var(--surface-2)',borderRadius:'6px',padding:'4px 8px',color:'var(--text-2)'}}>
                        Com. {c.comision} · {c.dia} {c.hora_rango}hs · {c.sede || c.modalidad}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'inscripciones' && (
        <div>
          {mensaje && (
            <div style={{background:mensaje.startsWith('ok:')?'#e0ffe0':'#ffe0e0',color:mensaje.startsWith('ok:')?'#1a7a1a':'#c0392b',border:'1px solid '+(mensaje.startsWith('ok:')?'#2ecc71':'#e74c3c'),borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'0.88rem'}}>
              {mensaje.split(':')[1]}
            </div>
          )}
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'14px'}}>
            <button onClick={() => setModalAbierto(true)}
              style={{padding:'8px 18px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
              + Agregar materia
            </button>
          </div>
          {cargando ? (
            <div className="empty-state"><p>Cargando...</p></div>
          ) : inscripciones.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>No tenes materias cargadas aun.<br/>Agregalas despues de inscribirte en el SIU Guarani.</p>
            </div>
          ) : (
            <div className="card">
              <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto'}}>
                <div>Materia</div><div>Dia</div><div>Horario</div><div>Comision</div><div>Modalidad</div><div></div>
              </div>
              {inscripciones.map(insc => (
                <div key={insc.id} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto'}}>
                  <div>
                    <div className="materia-name">{insc.materiaNombre}</div>
                    <div className="materia-code">{insc.sede || insc.modalidad || ''}</div>
                  </div>
                  <div style={{fontSize:'0.82rem',textTransform:'capitalize'}}>{insc.dia || '-'}</div>
                  <div style={{fontSize:'0.82rem'}}>{insc.horario || '-'}</div>
                  <div style={{fontSize:'0.82rem'}}>{insc.comisionId ? 'Com. ' + insc.comisionId : '-'}</div>
                  <div style={{fontSize:'0.82rem',textTransform:'capitalize'}}>{insc.modalidad || '-'}</div>
                  <div>
                    <button onClick={() => eliminarInscripcion(insc.id)}
                      style={{background:'none',border:'none',cursor:'pointer',color:'#c0392b',fontSize:'0.85rem',fontWeight:700}}>
                      x
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalAbierto && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'white',borderRadius:'12px',padding:'28px',width:'500px',maxWidth:'90vw',maxHeight:'90vh',overflowY:'auto'}}>
            <h3 style={{marginBottom:'16px',color:'#222'}}>Agregar materia cursando</h3>

            <div style={{marginBottom:'14px'}}>
              <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px',color:'#333'}}>Materia *</label>
              <select
                value={nuevaInscripcion.materiaNombre}
                onChange={e => {
                  const nombre = e.target.value;
                  setNuevaInscripcion({ materiaNombre: nombre, comision: '', dia: '', horario: '', aula: '', docente: '', modalidad: 'presencial', sede: '' });
                }}
                style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',color:'#333'}}>
                <option value="">Selecciona una materia</option>
                {Object.keys(ofertaAgrupada).filter(n => puedeInscribirse(n)).sort().map(nombre => (
                  <option key={nombre} value={nombre}>{nombre}</option>
                ))}
              </select>
            </div>

            {nuevaInscripcion.materiaNombre && (
              <div style={{marginBottom:'14px'}}>
                <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px',color:'#333'}}>Comision *</label>
                <select
                  value={nuevaInscripcion.comision}
                  onChange={e => {
                    const comNum = e.target.value;
                    const com = ofertaAgrupada[nuevaInscripcion.materiaNombre]?.comisiones.find(c => c.comision === comNum);
                    if (com) {
                      setNuevaInscripcion(prev => ({
                        ...prev,
                        comision: comNum,
                        dia: com.dia || '',
                        horario: com.hora_rango || '',
                        aula: com.aula || '',
                        modalidad: com.modalidad || 'presencial',
                        sede: com.sede || '',
                      }));
                    }
                  }}
                  style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',color:'#333'}}>
                  <option value="">Selecciona una comision</option>
                  {(ofertaAgrupada[nuevaInscripcion.materiaNombre]?.comisiones || []).map((c, i) => (
                    <option key={i} value={c.comision}>
                      Comision {c.comision} - {c.dia} {c.hora_rango}hs - {c.sede || c.modalidad}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {nuevaInscripcion.comision && (
              <div style={{background:'#f5f5f5',borderRadius:'8px',padding:'12px',marginBottom:'14px',fontSize:'0.85rem',color:'#555'}}>
                <div><strong>Dia:</strong> {nuevaInscripcion.dia}</div>
                <div><strong>Horario:</strong> {nuevaInscripcion.horario}hs</div>
                <div><strong>Aula:</strong> {nuevaInscripcion.aula || '-'}</div>
                <div><strong>Sede:</strong> {nuevaInscripcion.sede || nuevaInscripcion.modalidad}</div>
                <div><strong>Modalidad:</strong> {nuevaInscripcion.modalidad}</div>
              </div>
            )}

            <div style={{marginBottom:'12px'}}>
              <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'4px',color:'#333'}}>Docente (opcional)</label>
              <input type="text" value={nuevaInscripcion.docente || ''}
                onChange={e => setNuevaInscripcion(prev => ({...prev, docente: e.target.value}))}
                placeholder="Nombre del docente"
                style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',boxSizing:'border-box',color:'#333'}} />
            </div>

            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'16px'}}>
              <button onClick={() => {setModalAbierto(false);setMensaje('');setNuevaInscripcion({materiaNombre:'',comision:'',dia:'',horario:'',aula:'',docente:'',modalidad:'presencial',sede:''}); }}
                style={{padding:'8px 18px',border:'1px solid #ddd',borderRadius:'6px',cursor:'pointer',background:'white',color:'#333'}}>
                Cancelar
              </button>
              <button onClick={agregarInscripcion}
                disabled={!nuevaInscripcion.materiaNombre || !nuevaInscripcion.comision}
                style={{padding:'8px 18px',background:'#2e7d32',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:600,opacity:(!nuevaInscripcion.materiaNombre || !nuevaInscripcion.comision)?0.5:1}}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
