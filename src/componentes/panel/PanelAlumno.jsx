import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, limit } from 'firebase/firestore';
import Alumno from '../../models/Alumno';
import SeccionMaterias from './SeccionMaterias';
import SeccionConfiguracion from './SeccionConfiguracion';
import SeccionTareas from './SeccionTareas';
import SeccionChat from './SeccionChat';
import SeccionOfertaAcademica from './SeccionOfertaAcademica';
import SeccionNotas from './SeccionNotas';

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb'];
const HORAS = [
  '7:00','8:00','9:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'
];

function parseHoraInicio(horario) {
  if (!horario) return null;
  const match = String(horario).match(/^(\d{1,2})/);
  return match ? `${match[1]}:00` : null;
}

function parseDuracion(horario) {
  if (!horario) return 1;
  const match = String(horario).match(/(\d{1,2}).*?(\d{1,2})/);
  if (!match) return 1;
  const inicio = Number(match[1]);
  const fin = Number(match[2]);
  const dur = fin - inicio;
  return dur > 0 ? dur : 1;
}

const ORDEN_DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function calcularProximaClase(inscripciones) {
  if (!inscripciones || inscripciones.length === 0) return null;
  const ahora = new Date();
  const diaActualIdx = ahora.getDay();
  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;

  let mejor = null;
  let mejorDistancia = Infinity;

  inscripciones.forEach(insc => {
    const diaAbrev = DIA_ABREV[String(insc.dia).toLowerCase()];
    if (!diaAbrev) return;
    const diaIdx = ORDEN_DIAS.indexOf(diaAbrev);
    if (diaIdx === -1) return;
    const horaInicioStr = parseHoraInicio(insc.horario);
    if (!horaInicioStr) return;
    const horaInicio = Number(horaInicioStr.split(':')[0]);

    let distanciaDias = diaIdx - diaActualIdx;
    if (distanciaDias < 0) distanciaDias += 7;
    let distancia = distanciaDias * 24 + (horaInicio - horaActual);
    if (distanciaDias === 0 && horaInicio < horaActual) distancia += 7 * 24;

    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      mejor = { ...insc, diaAbrev, horaInicio: horaInicioStr };
    }
  });

  return mejor;
}

const DIA_ABREV = {
  lunes: 'Lun',
  martes: 'Mar',
  miércoles: 'Mié',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sábado: 'Sáb',
  sabado: 'Sáb',
};

function NotaPill({ nota }) {
  if (nota == null || nota === '') return <span className="nota-pill nota-empty">—</span>;
  const n = Number(nota);
  const cls = n >= 7 ? 'nota-high' : n >= 4 ? 'nota-mid' : 'nota-low';
  return <span className={`nota-pill ${cls}`}>{n}</span>;
}

function StatusBadge({ estado }) {
  const map = {
    Regular:    { cls: 'badge-green',  dot: 'dot-green'  },
    Cursando:   { cls: 'badge-yellow', dot: 'dot-yellow' },
    Libre:      { cls: 'badge-red',    dot: 'dot-red'    },
    Aprobada:   { cls: 'badge-green',  dot: 'dot-green'  },
    Disponible: { cls: 'badge-yellow', dot: 'dot-yellow' },
    Bloqueada:  { cls: 'badge-red',    dot: 'dot-red'    },
  };
  const { cls, dot } = map[estado] || { cls: 'badge-yellow', dot: 'dot-yellow' };
  return (
    <span className={`status-badge ${cls}`}>
      <span className={`status-dot ${dot}`} />
      {estado || 'Cursando'}
    </span>
  );
}

function Topbar({ titulo, subtitulo, badge }) {
  return (
    <div className="topbar">
      <div className="page-title">
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {badge && <span className="topbar-badge">{badge}</span>}
    </div>
  );
}

function EventoItem({ ev, diasAviso = 3 }) {
  const d = new Date(ev.fecha + 'T00:00:00');
  const esParcial = ev.tipo === 'Parcial';
  const diasParaVencer = Math.ceil((d - new Date(new Date().toDateString())) / 86400000);
  const proximoAVencer = diasParaVencer >= 0 && diasParaVencer <= diasAviso;
  return (
    <div className="prox-item">
      <div className="prox-date">
        <div className="day">{d.getDate()}</div>
        <div className="mon">{MESES[d.getMonth()]}</div>
      </div>
      <div className="prox-info">
        <div className="ev-title">
          {proximoAVencer && <span title={`Vence en ${diasParaVencer} dia(s)`} style={{marginRight:'6px'}}>⚠️</span>}
          {ev.titulo}
        </div>
        <div className="ev-sub">
          {ev.hora || ''}
          {ev.aula ? ` · Aula ${ev.aula}` : ''}
        </div>
        <span
          className="ev-type"
          style={{
            background: esParcial ? 'var(--red-dim)'    : 'var(--yellow-dim)',
            color:      esParcial ? 'var(--red)'        : 'var(--yellow)',
          }}
        >
          {ev.tipo || 'Evento'}
        </span>
      </div>
    </div>
  );
}

function PanelAlumno({ perfil, seccion, setSeccion }) {
  const [inscripciones, setInscripciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [planInfo, setPlanInfo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modalEventoAbierto, setModalEventoAbierto] = useState(false);
  const [nuevoEvento, setNuevoEvento] = useState({ materiaId: '', tipo: 'Parcial', fecha: '', hora: '', aula: '', descripcion: '' });
  const [guardandoEvento, setGuardandoEvento] = useState(false);
  const [cronogramasPropios, setCronogramasPropios] = useState([]);
  const [diasAviso, setDiasAviso] = useState(perfil?.diasAvisoEventos ?? 3);
  const [guardandoDiasAviso, setGuardandoDiasAviso] = useState(false);

  useEffect(() => {
    if (!perfil?.uid) return;
    const cargar = async () => {
      setCargando(true);
      try {
        const hoy = new Date().toISOString().split('T')[0];
        const [inscSnap, notasSnap, evSnap] = await Promise.all([
          getDocs(query(collection(db, 'inscripciones'), where('alumnoUid', '==', perfil.uid))),
          getDocs(query(collection(db, 'notas'), where('alumnoUid', '==', perfil.uid))),
          getDocs(query(collection(db, 'eventos'), where('fecha', '>=', hoy), limit(10))),
        ]);

        setInscripciones(inscSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setNotas(notasSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setEventos(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        if (perfil.carrera) {
          const planSnap = await getDocs(
            query(collection(db, 'planesEstudio'), where('carrera', '==', perfil.carrera))
          );
          if (!planSnap.empty) setPlanInfo({ id: planSnap.docs[0].id, ...planSnap.docs[0].data() });
        }
      } catch (e) {
        console.error('Error cargando datos del alumno:', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [perfil]);

  useEffect(() => {
    if (inscripciones.length === 0) { setCronogramasPropios([]); return; }
    const cargarCronogramas = async () => {
      try {
        const snaps = await Promise.all(
          inscripciones
            .filter(insc => insc.comisionId)
            .map(insc => getDoc(doc(db, 'cronogramas', insc.comisionId)))
        );
        setCronogramasPropios(snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() })));
      } catch (e) {
        console.error('Error cargando cronogramas:', e);
      }
    };
    cargarCronogramas();
  }, [inscripciones]);

  const guardarDiasAviso = async (valor) => {
    setDiasAviso(valor);
    if (!perfil?.uid) return;
    setGuardandoDiasAviso(true);
    try {
      await updateDoc(doc(db, 'usuarios', perfil.uid), { diasAvisoEventos: valor });
    } catch (e) {
      console.error('Error guardando dias de aviso:', e);
    } finally {
      setGuardandoDiasAviso(false);
    }
  };

  const carreras = Array.isArray(perfil?.carreras) && perfil.carreras.length > 0 ? perfil.carreras : (perfil?.carrera ? [perfil.carrera] : []);
  const carreraActual = carreras[0] || '';

  // Modelo Alumno para stats
  const alumnoObj = new Alumno(perfil?.nombre, perfil?.dni, perfil?.email, '', perfil?.carrera);
  alumnoObj.cargarHistorial(
    notas
      .filter(n => n.parcial === 'final' || n.parcial === 'aprobacion' || ['equivalencia','aprobada','aprobada_libre','promocionado','regular_con_final','libre'].includes(n.estado))
      .map(n => ({ materiaId: n.materiaId, nota: n.nota || n.definitiva, estado: n.estado }))
  );
  const materiasAprobadas = alumnoObj.obtenerMateriasAprobadas().length;
  const promedio = notas.length ? alumnoObj.obtenerPromedio() : '—';
  const totalCarrera = (planInfo?.materias || []).length;

  const inferirTipoEvento = (texto) => {
    const t = (texto || '').toLowerCase();
    if (t.includes('parcial') || t.includes('examen')) return 'Parcial';
    if (t.includes('tp') || t.includes('entrega') || t.includes('trabajo')) return 'TP';
    return 'Evento';
  };

  const hoyStr = new Date().toISOString().split('T')[0];
  const eventosCronograma = cronogramasPropios.flatMap(c => {
    const insc = inscripciones.find(i => i.comisionId === c.id);
    return (c.clases || [])
      .filter(cl => cl.fechaClave && cl.fecha >= hoyStr)
      .map(cl => ({
        id: `cron_${c.id}_${cl.fecha}`,
        titulo: `${c.materiaNombre || insc?.materiaNombre || ''}: ${cl.fechaClave}`,
        tipo: inferirTipoEvento(cl.fechaClave),
        fecha: cl.fecha,
        hora: '',
        aula: insc?.aula || '',
        materiaId: c.materiaId,
      }));
  });

  const eventosTotales = [...eventos, ...eventosCronograma].sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Inscripciones enriquecidas con notas
  const materiasConNotas = inscripciones.map(insc => {
    const histo = notas.find(n => n.materiaId === insc.materiaId && n.tipo === 'historial');
    const parcial1 = histo?.p1;
    const recup1   = histo?.rec1;
    const parcial2 = histo?.p2;
    const recup2   = histo?.rec2;
    const final    = histo?.final;
    let estado = 'Cursando';
    if (histo?.estado === 'promocionado' || histo?.estado === 'equivalencia') estado = 'Aprobada';
    else if (histo?.estado === 'regular_con_final') estado = (histo?.definitiva != null && Number(histo.definitiva) >= 4) ? 'Aprobada' : 'Regular';
    else if (histo?.estado === 'regular_sin_final') estado = 'Regular';
    else if (histo?.estado === 'libre') estado = 'Libre';
    return { ...insc, parcial1, recup1, parcial2, recup2, final, estado };
  });

  const guardarEvento = async () => {
    setGuardandoEvento(true);
    try {
      const { addDoc, collection: col } = await import('firebase/firestore');
      const esManual = nuevoEvento.materiaId === 'otro';
      const materiaSeleccionada = inscripciones.find(i => i.materiaId === nuevoEvento.materiaId);
      const nombreMateria = esManual ? nuevoEvento.materiaManual : (materiaSeleccionada?.materiaNombre || nuevoEvento.materiaId);
      await addDoc(col(db, 'eventos'), {
        alumnoUid: perfil.uid,
        materiaId: esManual ? null : nuevoEvento.materiaId,
        titulo: nombreMateria,
        tipo: nuevoEvento.tipo,
        fecha: nuevoEvento.fecha,
        hora: nuevoEvento.hora || '',
        aula: nuevoEvento.aula || '',
        descripcion: nuevoEvento.descripcion || '',
      });
      const hoy = new Date().toISOString().split('T')[0];
      const evSnap = await getDocs(query(collection(db, 'eventos'), where('fecha', '>=', hoy), limit(10)));
      setEventos(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setNuevoEvento({ materiaId: '', tipo: 'Parcial', fecha: '', hora: '', aula: '', descripcion: '' });
      setModalEventoAbierto(false);
    } catch (e) {
      console.error('Error al guardar evento:', e);
    } finally {
      setGuardandoEvento(false);
    }
  };

  const eliminarEvento = async (id) => {
    try {
      const { deleteDoc, doc: docRef } = await import('firebase/firestore');
      await deleteDoc(docRef(db, 'eventos', id));
      setEventos(prev => prev.filter(ev => ev.id !== id));
    } catch (e) {
      console.error('Error al eliminar evento:', e);
    }
  };

  // ── PANEL ──────────────────────────────────────────────────────
  if (seccion === 'panel') {
    const proximaClase = calcularProximaClase(inscripciones);
    return (
      <>
        <Topbar
          titulo="Panel general"
          subtitulo={`${perfil?.carrera || 'Mi carrera'} · ${new Date().getFullYear()}`}
          badge="2° cuatrimestre activo"
        />
        <div className="content">

          <div className="stats-row">
            <div className="stat-card c-green">
              <div className="stat-label">Materias activas</div>
              <div className="stat-value">{cargando ? '…' : inscripciones.length}</div>
              <div className="stat-meta">
                <span className="status-dot dot-green" />
                Este cuatrimestre
              </div>
            </div>
            <div className="stat-card c-yellow">
              <div className="stat-label">Promedio actual</div>
              <div className="stat-value">{cargando ? '…' : promedio}</div>
              <div className="stat-meta">
                <span className="status-dot dot-yellow" />
                {notas.length} notas cargadas
              </div>
            </div>
            <div className="stat-card c-blue">
              <div className="stat-label">Materias aprobadas</div>
              <div className="stat-value">{cargando ? '…' : materiasAprobadas}</div>
              <div className="stat-meta">
                <span className="status-dot dot-blue" />
                {totalCarrera > 0 ? `de ${totalCarrera} totales` : 'en la carrera'}
              </div>
            </div>
            <div className="stat-card c-red">
              <div className="stat-label">Próxima clase</div>
              <div className={`stat-value${proximaClase ? ' small' : ''}`}>
                {cargando ? '…' : (proximaClase ? `${proximaClase.diaAbrev} ${proximaClase.horaInicio}` : '—')}
              </div>
              <div className="stat-meta">
                <span className="status-dot dot-red" />
                {proximaClase
                  ? `${proximaClase.materiaNombre || proximaClase.materiaId}${proximaClase.sede ? ' · ' + proximaClase.sede : ''}${proximaClase.aula ? ' · Aula ' + proximaClase.aula : ''}`
                  : 'Sin clases programadas'}
              </div>
            </div>
          </div>

          <div className="view-section">
            <div className="section-head">
              <h2>Mis materias</h2>
            </div>
            <div className="card">
              <div className="table-head cols-alumno">
                <div>Materia</div><div>Docente</div>
                <div>P1</div><div>Rec P1</div><div>P2</div><div>Rec P2</div><div>Final</div><div>Estado</div>
              </div>
              {cargando ? (
                <div className="empty-state"><p>Cargando materias…</p></div>
              ) : materiasConNotas.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📚</div>
                  <p>No tenés materias inscriptas este cuatrimestre.</p>
                </div>
              ) : (
                materiasConNotas.map(m => (
                  <div key={m.id} className="table-row cols-alumno">
                    <div>
                      <div className="materia-name">{m.materiaNombre || m.materiaId}</div>
                      <div className="materia-code">{m.comisionNumero ? 'Com. ' + m.comisionNumero : ''}{m.dia ? ` · ${m.dia}` : ''}{m.horario ? ` ${m.horario}` : ''}</div>
                    </div>
                    <div>
                      <input
                        type="text"
                        defaultValue={m.docente || ''}
                        placeholder="Agregar docente"
                        onBlur={async e => {
                          const val = e.target.value.trim();
                          if (val === (m.docente || '')) return;
                          try {
                            const { doc, updateDoc } = await import('firebase/firestore');
                            const { db } = await import('../../firebase');
                            await updateDoc(doc(db, 'inscripciones', m.id), { docente: val });
                          } catch(err) { console.error(err); }
                        }}
                        style={{width:'100%',background:'none',border:'none',borderBottom:'1px solid var(--border)',color:'var(--text-1)',fontSize:'0.82rem',padding:'2px 0',outline:'none',cursor:'text'}}
                      />
                    </div>
                    <div><NotaPill nota={m.parcial1} /></div>
                    <div>{m.parcial1 != null && Number(m.parcial1) < 4 ? <NotaPill nota={m.recup1} /> : <span style={{color:'var(--text-3)'}}>—</span>}</div>
                    <div><NotaPill nota={m.parcial2} /></div>
                    <div>{m.parcial2 != null && Number(m.parcial2) < 4 ? <NotaPill nota={m.recup2} /> : <span style={{color:'var(--text-3)'}}>—</span>}</div>
                    <div><NotaPill nota={m.final} /></div>
                    <div><StatusBadge estado={m.estado} /></div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid-2">
            <div>
              <div className="section-head" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h2>Próximos eventos</h2>
                <button onClick={() => { setSeccion && setSeccion('parciales'); setModalEventoAbierto(true); }}
                  style={{padding:'4px 12px',background:'#2e7d32',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:600,fontSize:'0.8rem'}}>
                  + Agregar
                </button>
              </div>
              <div className="side-card">
                {cargando ? (
                  <div className="empty-state"><p>Cargando…</p></div>
                ) : eventosTotales.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📅</div>
                    <p>Sin eventos próximos</p>
                  </div>
                ) : (
                  eventosTotales.slice(0, 4).map(ev => <EventoItem key={ev.id} ev={ev} diasAviso={diasAviso} />)
                )}
              </div>
            </div>

            <div>
              <div className="section-head"><h2>Avance de carrera</h2></div>
              <div className="side-card">
                {totalCarrera > 0 ? (
                  <div className="progress-block">
                    <div className="progress-item">
                      <div className="progress-label">
                        <span className="pl-name">Materias aprobadas</span>
                        <span className="pl-val">{materiasAprobadas} / {totalCarrera}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill green" style={{
                          width: totalCarrera ? `${(materiasAprobadas / totalCarrera) * 100}%` : '0%'
                        }} />
                      </div>
                    </div>
                    <div className="progress-item">
                      <div className="progress-label">
                        <span className="pl-name">Promedio histórico</span>
                        <span className="pl-val">{promedio} / 10</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill orange" style={{
                          width: promedio !== '—' ? `${(Number(promedio) / 10) * 100}%` : '0%'
                        }} />
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="icon">🎓</div>
                    <p>Plan de carrera no disponible aún</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </>
    );
  }

  // ── MATERIAS ────────────────────────────────────────────────────
  if (seccion === 'materias') {
    return (
      <>
        <Topbar titulo="Mis materias" subtitulo={carreraActual} />
        <SeccionMaterias perfil={perfil} notasHistorial={notas} setSeccion={setSeccion} />
      </>
    );
  }

  // ── OFERTA ACADEMICA (todas las carreras, solo lectura) ──────────
  if (seccion === 'oferta') {
    return (
      <>
        <Topbar titulo="Oferta académica" subtitulo="Todas las carreras y comisiones del cuatrimestre" />
        <SeccionOfertaAcademica />
      </>
    );
  }

  if (seccion === 'materias_VIEJO') {
    return (
      <>
        <Topbar
          titulo="Mis materias"
          subtitulo={`${inscripciones.length} inscriptas este cuatrimestre`}
        />
        <div className="content">
          <div className="card">
            <div className="table-head cols-materias">
              <div>Materia</div><div>Asistencia</div><div>Docente</div>
              <div>Parcial 1</div><div>Parcial 2</div><div>Final</div><div>Estado</div>
            </div>
            {cargando ? (
              <div className="empty-state"><p>Cargando materias…</p></div>
            ) : materiasConNotas.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📚</div>
                <p>No tenés materias inscriptas este cuatrimestre.<br />Cuando el administrador cargue la oferta, podrás inscribirte.</p>
              </div>
            ) : (
              materiasConNotas.map(m => (
                <div key={m.id} className="table-row cols-materias">
                  <div>
                    <div className="materia-name">{m.materiaNombre || m.materiaId}</div>
                    <div className="materia-code">
                      {[m.comisionId, m.horario, m.aula ? `Aula ${m.aula}` : ''].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)' }}>
                    {m.asistencia != null ? `${m.asistencia}%` : '—'}
                  </div>
                  <div className="materia-prof">{m.docente || '—'}</div>
                  <div><NotaPill nota={m.parcial1} /></div>
                  <div><NotaPill nota={m.parcial2} /></div>
                  <div><NotaPill nota={m.final} /></div>
                  <div><StatusBadge estado={m.estado} /></div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  }

  // ── HORARIOS ────────────────────────────────────────────────────
  if (seccion === 'horarios') {
    const hoy = DIAS_SEMANA[new Date().getDay() - 1] || '';
    return (
      <>
        <Topbar titulo="Horario semanal" subtitulo="Tu grilla de clases" />
        <div className="content">
          {cargando ? (
            <div className="empty-state"><p>Cargando horarios…</p></div>
          ) : inscripciones.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🗓️</div>
              <p>No hay materias inscriptas para mostrar en el horario.</p>
            </div>
          ) : (
            <div className="schedule-wrap">
              <div className="sch-header">
                <div style={{ border: 'none' }} />
                {DIAS_SEMANA.map(d => (
                  <div key={d} className={`sch-day${d === hoy ? ' today' : ''}`}>{d}</div>
                ))}
              </div>
              <div className="sch-grid">
                <div style={{ height: `${HORAS.length * 52}px` }}>
                  {HORAS.map(h => <div key={h} className="sch-time-cell">{h}</div>)}
                </div>
                {DIAS_SEMANA.map(dia => (
                  <div key={dia} className="sch-day-col">
                    {HORAS.map(h => {
                      const ev = inscripciones.find(
                        insc => DIA_ABREV[String(insc.dia).toLowerCase()] === dia && parseHoraInicio(insc.horario) === h
                      );
                      const duracion = ev ? parseDuracion(ev.horario) : 1;
                      return (
                        <div key={h} className="sch-cell">
                          {ev && (
                            <div className="abs-event ev-blue" style={{ height: `calc(${duracion} * 52px - 2px)` }}>
                              <div className="ev-name-sch">{ev.materiaNombre || ev.materiaId}</div>
                              <div className="ev-room-sch">Com. {ev.comisionNumero || '—'} · Aula {ev.aula || '—'}</div>
                              <div className="ev-room-sch">{ev.sede || '—'}</div>
                              {ev.docente && <div className="ev-room-sch">👤 {ev.docente}</div>}
                              <div className="ev-room-sch" style={{ marginTop: 4, opacity: 0.6 }}>{ev.horario}hs</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── NOTAS
  if (seccion === 'notas') {
    return (
      <>
        <Topbar titulo="Mis notas" subtitulo="Carga y seguimiento de tus calificaciones" />
        <div className="content">
          <SeccionNotas perfil={perfil} />
        </div>
      </>
    );
  }

  // ── PARCIALES ───────────────────────────────────────────────────
  if (seccion === 'parciales') {
    const parciales = eventosTotales.filter(ev => ev.tipo === 'Parcial');
    const tps       = eventosTotales.filter(ev => ev.tipo === 'TP');
    return (
      <>
        <Topbar titulo="Parciales y TPs" subtitulo="Próximas fechas de evaluación" />
        <div className="content">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
            <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'0.85rem',color:'var(--text-2)'}}>
              ⚠️ Avisarme
              <input type="number" min="0" max="30" value={diasAviso}
                onChange={e => guardarDiasAviso(Number(e.target.value))}
                disabled={guardandoDiasAviso}
                style={{width:'50px',padding:'4px 6px',borderRadius:'6px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)',textAlign:'center'}} />
              dias antes de la fecha
            </label>
            <button onClick={() => setModalEventoAbierto(true)}
              style={{padding:'8px 18px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
              + Agregar evento
            </button>
          </div>
          <div className="grid-2">
            <div>
              <div className="section-head"><h2>Parciales</h2></div>
              <div className="side-card">
                {cargando ? (
                  <div className="empty-state"><p>Cargando…</p></div>
                ) : parciales.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📝</div>
                    <p>Sin parciales próximos</p>
                  </div>
                ) : (
                  parciales.map(ev => (
                    <div key={ev.id} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <div style={{flex:1}}><EventoItem ev={ev} diasAviso={diasAviso} /></div>
                      {ev.alumnoUid === perfil.uid && (
                        <button onClick={() => eliminarEvento(ev.id)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#c0392b',fontSize:'0.85rem',fontWeight:700}}>
                          x
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="section-head"><h2>Trabajos Prácticos</h2></div>
              <div className="side-card">
                {cargando ? (
                  <div className="empty-state"><p>Cargando…</p></div>
                ) : tps.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📋</div>
                    <p>Sin TPs próximos</p>
                  </div>
                ) : (
                  tps.map(ev => (
                    <div key={ev.id} style={{display:'flex',alignItems:'center',gap:'6px'}}>
                      <div style={{flex:1}}><EventoItem ev={ev} diasAviso={diasAviso} /></div>
                      {ev.alumnoUid === perfil.uid && (
                        <button onClick={() => eliminarEvento(ev.id)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#c0392b',fontSize:'0.85rem',fontWeight:700}}>
                          x
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {modalEventoAbierto && (
          <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
            <div style={{background:'var(--surface)',borderRadius:'12px',padding:'28px',width:'440px',maxWidth:'90vw'}}>
              <h3 style={{marginBottom:'16px',color:'var(--text-1)'}}>Agregar evento</h3>

              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px',color:'var(--text-1)'}}>Materia *</label>
                <select value={nuevoEvento.materiaId}
                  onChange={e => setNuevoEvento(prev => ({...prev, materiaId: e.target.value, materiaManual: e.target.value === 'otro' ? prev.materiaManual : ''}))}
                  style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-1)',background:'var(--surface-2)'}}>
                  <option value="">Seleccionar materia</option>
                  {inscripciones.map(i => (
                    <option key={i.id} value={i.materiaId}>{i.materiaNombre || i.materiaId}</option>
                  ))}
                  <option value="otro">Otra (cargar a mano)</option>
                </select>
                {nuevoEvento.materiaId === 'otro' && (
                  <input type="text" value={nuevoEvento.materiaManual || ''}
                    onChange={e => setNuevoEvento(prev => ({...prev, materiaManual: e.target.value}))}
                    placeholder="Nombre de la materia"
                    style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-1)',background:'var(--surface-2)',boxSizing:'border-box',marginTop:'8px'}} />
                )}
              </div>

              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px',color:'var(--text-1)'}}>Tipo *</label>
                <select value={nuevoEvento.tipo}
                  onChange={e => setNuevoEvento(prev => ({...prev, tipo: e.target.value}))}
                  style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-1)',background:'var(--surface-2)'}}>
                  <option value="Parcial">Parcial</option>
                  <option value="TP">Trabajo Práctico</option>
                  <option value="Final">Final</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px',color:'var(--text-1)'}}>Fecha *</label>
                <input type="date" value={nuevoEvento.fecha}
                  onChange={e => setNuevoEvento(prev => ({...prev, fecha: e.target.value}))}
                  style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-1)',background:'var(--surface-2)',boxSizing:'border-box'}} />
              </div>

              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px',color:'var(--text-1)'}}>Hora (opcional)</label>
                <input type="time" value={nuevoEvento.hora}
                  onChange={e => setNuevoEvento(prev => ({...prev, hora: e.target.value}))}
                  style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-1)',background:'var(--surface-2)',boxSizing:'border-box'}} />
              </div>

              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px',color:'var(--text-1)'}}>Aula (opcional)</label>
                <input type="text" value={nuevoEvento.aula}
                  onChange={e => setNuevoEvento(prev => ({...prev, aula: e.target.value}))}
                  placeholder="Ej: 4"
                  style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-1)',background:'var(--surface-2)',boxSizing:'border-box'}} />
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px',color:'var(--text-1)'}}>Descripción (opcional)</label>
                <input type="text" value={nuevoEvento.descripcion}
                  onChange={e => setNuevoEvento(prev => ({...prev, descripcion: e.target.value}))}
                  placeholder="Ej: Clase virtual de repaso"
                  style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid var(--border)',color:'var(--text-1)',background:'var(--surface-2)',boxSizing:'border-box'}} />
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',gap:'10px'}}>
                <button onClick={() => setModalEventoAbierto(false)}
                  style={{padding:'8px 18px',border:'1px solid var(--border)',borderRadius:'6px',cursor:'pointer',background:'var(--surface-2)',color:'var(--text-1)'}}>
                  Cancelar
                </button>
                <button onClick={guardarEvento} disabled={guardandoEvento || nuevoEvento.materiaId === '' || nuevoEvento.fecha === ''}
                  style={{padding:'8px 18px',background:'#2e7d32',color:'white',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:600}}>
                  {guardandoEvento ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── CORRELATIVAS ────────────────────────────────────────────────
  if (seccion === 'correlativas') {
    const ESTADOS_APROBADA = ['promocionado', 'equivalencia'];
    const aprobadasIds = new Set();
    const cursadasIds = new Set();
    notas.forEach(n => {
      const est = n.estado;
      const notaFinal = n.definitiva != null ? Number(n.definitiva) : (n.nota != null ? Number(n.nota) : null);
      const aprobada = ESTADOS_APROBADA.includes(est) ||
        (est === 'regular_con_final' && notaFinal != null && notaFinal >= 4) ||
        (est === 'libre' && notaFinal != null && notaFinal >= 4);
      const cursada = aprobada || est === 'regular_sin_final';
      if (aprobada) aprobadasIds.add(n.materiaId);
      if (cursada) cursadasIds.add(n.materiaId);
    });

    const materiasDelPlan = planInfo?.materias || [];
    const nombrePorCodigo = {};
    materiasDelPlan.forEach(m => { nombrePorCodigo[m.codigo] = m.nombre; });

    const materiasConEstado = materiasDelPlan.map(m => {
      const aprobada = aprobadasIds.has(m.nombre) || aprobadasIds.has(m.codigo || '');
      const reqsCursar = m.correlativas?.para_cursar || [];
      const correlativasOk = !reqsCursar.length ||
        reqsCursar.every(c => cursadasIds.has(c) || cursadasIds.has(nombrePorCodigo[c]));
      let estado = 'Bloqueada';
      if (aprobada) estado = 'Aprobada';
      else if (correlativasOk) estado = 'Disponible';
      return { ...m, estado };
    });

    const byAnio = materiasConEstado.reduce((acc, m) => {
      const k = String(m.anio || 1);
      if (!acc[k]) acc[k] = [];
      acc[k].push(m);
      return acc;
    }, {});

    return (
      <>
        <Topbar
          titulo="Correlativas"
          subtitulo={`${materiasAprobadas} de ${totalCarrera} materias aprobadas`}
        />
        <div className="content">
          {cargando ? (
            <div className="empty-state"><p>Cargando…</p></div>
          ) : materiasDelPlan.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔗</div>
              <p>El plan de estudios de tu carrera aún no está cargado en el sistema.</p>
            </div>
          ) : (
            Object.keys(byAnio).sort((a, b) => Number(a) - Number(b)).map(anio => (
              <div key={anio} style={{ marginBottom: 28 }}>
                <div className="section-head"><h2>{anio}° año</h2></div>
                <div className="card">
                  <div className="table-head cols-corr">
                    <div>Materia</div>
                    <div>Cuatrimestre</div>
                    <div style={{textAlign:'center'}}>Cursado</div>
                    <div style={{textAlign:'center'}}>Aprobado</div>
                    <div style={{textAlign:'center'}}>Estado</div>
                  </div>
                  {byAnio[anio].map((m, i) => (
                    <div key={i} className="table-row cols-corr">
                      <div>
                        <div className="materia-name">{m.codigo} · {m.nombre}</div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {m.cuatrimestre}° cuatrimestre
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-2)', textAlign: 'center' }}>
                        {m.correlativas?.para_cursar?.length
                          ? m.correlativas.para_cursar.join(', ')
                          : <span style={{ opacity: 0.4 }}>—</span>
                        }
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-2)', textAlign: 'center' }}>
                        {m.correlativas?.para_aprobar?.length
                          ? m.correlativas.para_aprobar.join(', ')
                          : <span style={{ opacity: 0.4 }}>—</span>
                        }
                      </div>
                      <div><StatusBadge estado={m.estado} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  }


  // TAREAS
  if (seccion === 'tareas') {
    return (
      <>
        <Topbar titulo="Tareas" subtitulo="Tu tablero personal, compartilo con tus compañeros" />
        <SeccionTareas perfil={perfil} />
      </>
    );
  }

  // CHAT
  if (seccion === 'chat') {
    return (
      <>
        <Topbar titulo="Chat" subtitulo="Hablá con tus profesores por materia" />
        <SeccionChat perfil={perfil} />
      </>
    );
  }

  // CONFIG
  if (seccion === 'config') {
    return (
      <>
        <Topbar titulo="Configuracion" subtitulo="Gestion de tu cuenta y historial" />
        <SeccionConfiguracion perfil={perfil} onBaja={() => window.location.reload()} />
      </>
    );
  }

  // FALLBACK
  return (
    <>
      <Topbar titulo="Seccion en construccion" />
      <div className="content">
        <div className="empty-state">
          <div className="icon">🚧</div>
          <p>Esta seccion estara disponible proximamente.</p>
        </div>
      </div>
    </>
  );
}

export default PanelAlumno;
