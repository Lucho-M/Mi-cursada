import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import Profesor from '../../models/Profesor';
import SeccionConfiguracion from './SeccionConfiguracion';

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const PARCIALES = [
  { key: '1',    label: 'Parcial 1' },
  { key: 'rec1', label: 'Recup. P1' },
  { key: '2',    label: 'Parcial 2' },
  { key: 'rec2', label: 'Recup. P2' },
  { key: 'final1', label: 'Final 1' },
  { key: 'final2', label: 'Final 2' },
  { key: 'final3', label: 'Final 3' },
  { key: 'libre',  label: 'Libre' },
  { key: 'equivalencia', label: 'Equiv.' },
];

function NotaInput({ valor, onChange }) {
  return (
    <input
      type="number" min="1" max="10" step="0.5"
      value={valor ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      style={{width:'52px',padding:'4px 6px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'0.82rem',textAlign:'center'}}
    />
  );
}

function calcularEstado(notas) {
  const get = (key) => {
    const n = notas.find(n => n.parcial === key);
    return n ? Number(n.nota) : null;
  };
  if (get('equivalencia') !== null) return 'Aprobada por equivalencia';
  const libre = get('libre');
  if (libre !== null && libre >= 4) return 'Aprobada libre';
  const p1 = get('rec1') !== null ? get('rec1') : get('1');
  const p2 = get('rec2') !== null ? get('rec2') : get('2');
  if (p1 !== null && p2 !== null) {
    const prom = (p1 + p2) / 2;
    if (p1 >= 6 && p2 >= 6 && prom >= 6.5) return 'Promocionada';
    if (p1 >= 4 && p2 >= 4) {
      for (const k of ['final1','final2','final3']) {
        const f = get(k);
        if (f !== null && f >= 4) return 'Aprobada regular';
      }
      const finalesRendidos = ['final1','final2','final3'].filter(k => get(k) !== null).length;
      if (finalesRendidos >= 3) return 'Perdio regularidad';
      return 'Regular';
    }
    return 'Libre';
  }
  return 'Cursando';
}

function BadgeEstado({ estado }) {
  const map = {
    'Cursando':               'badge-yellow',
    'Libre':                  'badge-red',
    'Regular':                'badge-blue',
    'Promocionada':           'badge-green',
    'Aprobada regular':       'badge-green',
    'Aprobada libre':         'badge-green',
    'Aprobada por equivalencia': 'badge-green',
    'Perdio regularidad':     'badge-red',
  };
  return <span className={'status-badge ' + (map[estado] || 'badge-yellow')}>{estado}</span>;
}

function PanelProfesor({ perfil, seccion }) {
  const [comisiones, setComisiones] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [comSeleccionada, setComSeleccionada] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [notas, setNotas] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!perfil?.uid) return;
    const cargar = async () => {
      setCargando(true);
      try {
        const comSnap = await getDocs(
          query(collection(db, 'comisiones'), where('profesorUid', '==', perfil.uid))
        );
        const comData = comSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setComisiones(comData);
        const hoy = new Date().toISOString().split('T')[0];
        const evSnap = await getDocs(
          query(collection(db, 'eventos'), where('fecha', '>=', hoy))
        );
        setEventos(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando datos del profesor:', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [perfil]);

  const cargarAlumnosComision = async (com) => {
    setComSeleccionada(com);
    setMensaje('');
    try {
      const inscSnap = await getDocs(
        query(collection(db, 'inscripciones'), where('comisionId', '==', com.id))
      );
      const inscData = inscSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const uids = inscData.map(i => i.alumnoUid);
      const alumnosData = [];
      for (const uid of uids) {
        const uSnap = await getDocs(query(collection(db, 'usuarios'), where('uid', '==', uid)));
        if (!uSnap.empty) alumnosData.push({ uid, ...uSnap.docs[0].data() });
      }
      setAlumnos(alumnosData);
      const notasMap = {};
      for (const a of alumnosData) {
        const nSnap = await getDocs(
          query(collection(db, 'notas'),
            where('alumnoUid', '==', a.uid),
            where('materiaId', '==', com.materiaId))
        );
        notasMap[a.uid] = nSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setNotas(notasMap);
    } catch (e) {
      console.error('Error cargando alumnos:', e);
    }
  };

  const actualizarNota = (alumnoUid, parcial, valor) => {
    setNotas(prev => {
      const lista = [...(prev[alumnoUid] || [])];
      const idx = lista.findIndex(n => n.parcial === parcial);
      if (valor === null || valor === '') {
        if (idx >= 0) lista.splice(idx, 1);
      } else {
        if (idx >= 0) lista[idx] = { ...lista[idx], nota: valor };
        else lista.push({ parcial, nota: valor, alumnoUid, materiaId: comSeleccionada.materiaId });
      }
      return { ...prev, [alumnoUid]: lista };
    });
  };

  const guardarNotas = async () => {
    if (!comSeleccionada) return;
    setGuardando(true);
    setMensaje('');
    try {
      for (const alumnoUid of Object.keys(notas)) {
        for (const nota of notas[alumnoUid]) {
          const docId = alumnoUid + '_' + comSeleccionada.materiaId + '_' + nota.parcial;
          await setDoc(doc(db, 'notas', docId), {
            alumnoUid,
            materiaId: comSeleccionada.materiaId,
            comisionId: comSeleccionada.id,
            parcial: nota.parcial,
            nota: nota.nota,
            fecha: new Date().toISOString(),
          });
        }
      }
      setMensaje('ok:Notas guardadas correctamente.');
    } catch (e) {
      setMensaje('error:Error al guardar. Intenta de nuevo.');
      console.error(e);
    } finally {
      setGuardando(false);
    }
  };

  const profObj = new Profesor(perfil?.nombre, perfil?.dni, perfil?.email, '', perfil?.carrera);
  comisiones.forEach(c => profObj.asignarComision(c));
  const alumnosTotales = profObj.obtenerAlumnosTotales();
  const materiasDictadas = profObj.obtenerMateriasDictadas();

  const topbar = (titulo, subtitulo) => (
    <div className="topbar">
      <div className="page-title">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
    </div>
  );

  if (seccion === 'panel') {
    return (
      <>
        {topbar('Panel docente', perfil?.nombre + ' · ' + new Date().getFullYear())}
        <div className="content">
          <div className="stats-row">
            <div className="stat-card c-green">
              <div className="stat-label">Comisiones activas</div>
              <div className="stat-value">{cargando ? '...' : comisiones.length}</div>
              <div className="stat-meta">Este cuatrimestre</div>
            </div>
            <div className="stat-card c-blue">
              <div className="stat-label">Materias</div>
              <div className="stat-value">{cargando ? '...' : materiasDictadas}</div>
              <div className="stat-meta">Dictadas</div>
            </div>
            <div className="stat-card c-yellow">
              <div className="stat-label">Alumnos inscriptos</div>
              <div className="stat-value">{cargando ? '...' : alumnosTotales}</div>
              <div className="stat-meta">Entre todas las comisiones</div>
            </div>
            <div className="stat-card c-red">
              <div className="stat-label">Proximos parciales</div>
              <div className="stat-value">{cargando ? '...' : eventos.filter(e => e.tipo === 'Parcial').length}</div>
              <div className="stat-meta">Proximas semanas</div>
            </div>
          </div>
          <div className="grid-2">
            <div>
              <div className="section-head"><h2>Mis comisiones</h2></div>
              <div className="card">
                <div className="table-head cols-profesor">
                  <div>Materia</div><div>Horario</div><div>Aula</div><div>Alumnos</div><div>Modalidad</div>
                </div>
                {cargando ? (
                  <div className="empty-state"><p>Cargando comisiones...</p></div>
                ) : comisiones.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📋</div>
                    <p>No tenes comisiones asignadas aun.</p>
                  </div>
                ) : (
                  comisiones.map(com => (
                    <div key={com.id} className="table-row cols-profesor">
                      <div>
                        <div className="materia-name">{com.materiaNombre || com.materiaId}</div>
                        <div className="materia-code">Comision {com.numero || com.id.slice(0,4)}</div>
                      </div>
                      <div className="materia-prof">{com.horario || '-'}</div>
                      <div style={{fontSize:'0.82rem'}}>{com.aula || '-'}</div>
                      <div><span className="nota-pill nota-empty">{com.alumnos?.length || 0}</span></div>
                      <div>
                        <span className={'status-badge ' + (com.modalidad === 'virtual' ? 'badge-yellow' : 'badge-green')}>
                          {com.modalidad || 'Presencial'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="section-head"><h2>Proximos eventos</h2></div>
              <div className="side-card">
                {eventos.length === 0 ? (
                  <div className="empty-state"><div className="icon">📅</div><p>Sin eventos proximos</p></div>
                ) : (
                  eventos.slice(0,4).map(ev => {
                    const d = new Date(ev.fecha + 'T00:00:00');
                    return (
                      <div key={ev.id} className="prox-item">
                        <div className="prox-date">
                          <div className="day">{d.getDate()}</div>
                          <div className="mon">{MESES[d.getMonth()]}</div>
                        </div>
                        <div className="prox-info">
                          <div className="ev-title">{ev.titulo}</div>
                          <div className="ev-sub">{ev.hora || ''}</div>
                          <span className="ev-type" style={{background: ev.tipo==='Parcial'?'var(--red-soft)':'var(--yellow-soft)',color:ev.tipo==='Parcial'?'var(--red)':'var(--yellow)'}}>
                            {ev.tipo || 'Evento'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (seccion === 'alumnos' || seccion === 'notas' || seccion === 'comisiones') {
    return (
      <>
        {topbar(
          seccion === 'alumnos' ? 'Alumnos por comision' :
          seccion === 'notas'   ? 'Cargar notas' : 'Mis comisiones',
          comSeleccionada ? comSeleccionada.materiaNombre || comSeleccionada.materiaId : 'Selecciona una comision'
        )}
        <div className="content">
          <div className="section-head" style={{marginBottom:'12px'}}>
            <h2>Selecciona una comision</h2>
          </div>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'24px'}}>
            {comisiones.map(com => (
              <button key={com.id}
                onClick={() => cargarAlumnosComision(com)}
                style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid #ddd',cursor:'pointer',
                  background: comSeleccionada?.id === com.id ? '#2e7d32' : 'white',
                  color: comSeleccionada?.id === com.id ? 'white' : '#333',
                  fontWeight: 600, fontSize:'0.85rem'}}>
                {com.materiaNombre || com.materiaId}
              </button>
            ))}
          </div>

          {comSeleccionada && (
            <>
              {mensaje && (
                <div style={{background:mensaje.startsWith('ok:')?'#e0ffe0':'#ffe0e0',color:mensaje.startsWith('ok:')?'#1a7a1a':'#c0392b',border:'1px solid '+(mensaje.startsWith('ok:')?'#2ecc71':'#e74c3c'),borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'0.88rem'}}>
                  {mensaje.split(':')[1]}
                </div>
              )}
              <div className="card" style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                  <thead>
                    <tr style={{background:'#f5f5f5'}}>
                      <th style={{padding:'10px 12px',textAlign:'left',fontWeight:600}}>Alumno</th>
                      {PARCIALES.map(p => (
                        <th key={p.key} style={{padding:'10px 8px',textAlign:'center',fontWeight:600,whiteSpace:'nowrap'}}>{p.label}</th>
                      ))}
                      <th style={{padding:'10px 12px',textAlign:'center',fontWeight:600}}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnos.length === 0 ? (
                      <tr><td colSpan={PARCIALES.length + 2} style={{textAlign:'center',padding:'24px',color:'#999'}}>
                        No hay alumnos inscriptos en esta comision.
                      </td></tr>
                    ) : (
                      alumnos.map(a => {
                        const notasAlumno = notas[a.uid] || [];
                        const estado = calcularEstado(notasAlumno);
                        return (
                          <tr key={a.uid} style={{borderBottom:'1px solid #f0f0f0'}}>
                            <td style={{padding:'10px 12px'}}>
                              <div style={{fontWeight:600}}>{a.nombre}</div>
                              <div style={{fontSize:'0.75rem',color:'#999'}}>{a.email}</div>
                            </td>
                            {PARCIALES.map(p => {
                              const notaObj = notasAlumno.find(n => n.parcial === p.key);
                              return (
                                <td key={p.key} style={{padding:'6px 8px',textAlign:'center'}}>
                                  {seccion === 'notas' ? (
                                    <NotaInput
                                      valor={notaObj?.nota ?? null}
                                      onChange={val => actualizarNota(a.uid, p.key, val)}
                                    />
                                  ) : (
                                    <span className={'nota-pill ' + (notaObj ? (Number(notaObj.nota) >= 4 ? 'nota-high' : 'nota-low') : 'nota-empty')}>
                                      {notaObj ? notaObj.nota : '-'}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td style={{padding:'10px 12px',textAlign:'center'}}>
                              <BadgeEstado estado={estado} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {seccion === 'notas' && (
                <div style={{marginTop:'16px',textAlign:'right'}}>
                  <button onClick={guardarNotas} disabled={guardando}
                    style={{padding:'10px 24px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600,fontSize:'0.9rem'}}>
                    {guardando ? 'Guardando...' : 'Guardar notas'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  if (seccion === 'calendario') {
    const materiaIds = new Set(comisiones.map(c => c.materiaId));
    const eventosPropios = eventos
      .filter(ev => materiaIds.has(ev.materiaId))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    return (
      <>
        {topbar('Calendario', 'Parciales, TPs y eventos de tus comisiones')}
        <div className="content">
          <div className="card">
            <div className="table-head" style={{gridTemplateColumns:'auto 2fr 1fr 1fr 1fr'}}>
              <div>Fecha</div><div>Materia</div><div>Tipo</div><div>Hora</div><div>Aula</div>
            </div>
            {cargando ? (
              <div className="empty-state"><p>Cargando...</p></div>
            ) : eventosPropios.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📅</div>
                <p>No hay eventos proximos en tus comisiones.</p>
              </div>
            ) : (
              eventosPropios.map(ev => {
                const d = new Date(ev.fecha + 'T00:00:00');
                return (
                  <div key={ev.id} className="table-row" style={{gridTemplateColumns:'auto 2fr 1fr 1fr 1fr'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                      <div className="prox-date" style={{width:'42px'}}>
                        <div className="day">{d.getDate()}</div>
                        <div className="mon">{MESES[d.getMonth()]}</div>
                      </div>
                    </div>
                    <div className="materia-name">{ev.titulo}</div>
                    <div>
                      <span className="status-badge" style={{background: ev.tipo==='Parcial'?'var(--red-soft)':'var(--yellow-soft)',color:ev.tipo==='Parcial'?'var(--red)':'var(--yellow)'}}>
                        {ev.tipo || 'Evento'}
                      </span>
                    </div>
                    <div style={{fontSize:'0.85rem'}}>{ev.hora || '-'}</div>
                    <div style={{fontSize:'0.85rem'}}>{ev.aula || '-'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </>
    );
  }

  if (seccion === 'config') {
    return (
      <>
        {topbar('Configuracion', 'Gestion de tu cuenta')}
        <SeccionConfiguracion perfil={perfil} onBaja={() => window.location.reload()} />
      </>
    );
  }

  return (
    <>
      {topbar('Seccion en construccion')}
      <div className="content">
        <div className="empty-state"><div className="icon">🚧</div><p>Esta seccion estara disponible proximamente.</p></div>
      </div>
    </>
  );
}

export default PanelProfesor;
