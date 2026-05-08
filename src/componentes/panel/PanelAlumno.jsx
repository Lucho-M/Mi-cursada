import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import Alumno from '../../models/Alumno';

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie'];
const HORAS = ['8:00','9:00','10:00','11:00','12:00','13:00'];

function NotaPill({ nota }) {
  if (!nota && nota !== 0) return <span className="nota-pill nota-empty">—</span>;
  const n = Number(nota);
  const cls = n >= 7 ? 'nota-high' : n >= 4 ? 'nota-mid' : 'nota-low';
  return <span className={`nota-pill ${cls}`}>{n}</span>;
}

function EstadoBadge({ estado }) {
  const conf = {
    Regular:  { dot: 'dot-green',  label: 'Regular' },
    Cursando: { dot: 'dot-yellow', label: 'Cursando' },
    Libre:    { dot: 'dot-red',    label: 'Libre' },
    Presente: { dot: 'dot-green',  label: 'Presente' },
  }[estado] || { dot: 'dot-yellow', label: estado || 'Cursando' };
  return (
    <div className="status-wrap">
      <span className={`status-dot ${conf.dot}`}></span>
      {conf.label}
    </div>
  );
}

function PanelAlumno({ perfil, seccion }) {
  const [tabActiva, setTabActiva] = useState('lista');
  const [inscripciones, setInscripciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [planInfo, setPlanInfo] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!perfil?.uid) return;
    const cargar = async () => {
      setCargando(true);
      try {
        // Inscripciones del alumno (comisiones en las que está)
        const inscSnap = await getDocs(
          query(collection(db, 'inscripciones'), where('alumnoUid', '==', perfil.uid))
        );
        const inscData = inscSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setInscripciones(inscData);

        // Notas del alumno
        const notasSnap = await getDocs(
          query(collection(db, 'notas'), where('alumnoUid', '==', perfil.uid))
        );
        const notasData = notasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotas(notasData);

        // Próximos eventos (parciales/TPs)
        const hoy = new Date().toISOString().split('T')[0];
        const evSnap = await getDocs(
          query(collection(db, 'eventos'), where('fecha', '>=', hoy), limit(4))
        );
        setEventos(evSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Plan de carrera
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

  // Calcular stats usando el modelo Alumno
  const alumnoObj = new Alumno(perfil?.nombre, perfil?.dni, perfil?.email, '', perfil?.carrera);
  alumnoObj.cargarHistorial(
    notas.filter(n => n.parcial === 'final' || n.parcial === 'aprobacion').map(n => ({
      materiaId: n.materiaId,
      nota: n.nota,
    }))
  );

  const materiasAprobadas = alumnoObj.obtenerMateriasAprobadas().length;
  const promedio = notas.length ? alumnoObj.obtenerPromedio() : '—';
  const totalCarrera = planInfo?.materias?.length || 0;

  // Próximo evento
  const proximoEvento = eventos[0];
  let proximoLabel = '—';
  if (proximoEvento) {
    const d = new Date(proximoEvento.fecha + 'T00:00:00');
    proximoLabel = `${DIAS_SEMANA[d.getDay() - 1] || ''} ${d.getDate()}`;
  }

  // Enriquecer inscripciones con notas
  const materiasConNotas = inscripciones.map(insc => {
    const parcial1 = notas.find(n => n.materiaId === insc.materiaId && n.parcial === '1')?.nota;
    const parcial2 = notas.find(n => n.materiaId === insc.materiaId && n.parcial === '2')?.nota;
    let estado = 'Cursando';
    if (parcial1 >= 4 && parcial2 >= 4) estado = 'Regular';
    else if (parcial1 < 4 && parcial1 !== undefined) estado = 'Libre';
    return { ...insc, parcial1, parcial2, estado };
  });

  const topbar = (
    <div className="topbar">
      <div className="page-title">
        <h1>Panel general</h1>
        <p>{perfil?.carrera || 'Mi carrera'} · {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  if (seccion !== 'panel' && seccion !== 'materias' && seccion !== 'horarios' && seccion !== 'notas') {
    return (
      <>
        {topbar}
        <div className="content">
          <div className="empty-state">
            <div className="icon">🚧</div>
            <p>Sección en construcción</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {topbar}
      <div className="content">

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Materias activas</div>
            <div className="stat-value">{cargando ? '…' : inscripciones.length}</div>
            <span className="stat-badge badge-green">Este cuatrimestre</span>
          </div>
          <div className="stat-card">
            <div className="stat-label">Promedio actual</div>
            <div className="stat-value">{cargando ? '…' : promedio}</div>
            <span className="stat-badge badge-yellow">{notas.length} notas cargadas</span>
          </div>
          <div className="stat-card">
            <div className="stat-label">Materias aprobadas</div>
            <div className="stat-value">{cargando ? '…' : materiasAprobadas}</div>
            {totalCarrera > 0 && <span className="stat-badge badge-blue">de {totalCarrera} totales</span>}
          </div>
          <div className="stat-card">
            <div className="stat-label">Próximo evento</div>
            <div className={`stat-value${proximoLabel !== '—' ? ' small' : ''}`}>
              {cargando ? '…' : proximoLabel}
            </div>
            {proximoEvento && (
              <span className="stat-badge badge-red">{proximoEvento.titulo || proximoEvento.tipo}</span>
            )}
          </div>
        </div>

        {/* Materias + horario */}
        <div className="view-section">
          <div className="tabs">
            <button className={`tab${tabActiva === 'lista' ? ' active' : ''}`} onClick={() => setTabActiva('lista')}>
              Lista de materias
            </button>
            <button className={`tab${tabActiva === 'horario' ? ' active' : ''}`} onClick={() => setTabActiva('horario')}>
              Horario semanal
            </button>
          </div>

          {tabActiva === 'lista' && (
            <>
              <div className="section-head">
                <h2>Materias del cuatrimestre</h2>
              </div>
              <div className="card">
                <div className="table-head cols-alumno">
                  <div>Materia</div><div>Asistencia</div><div>Docente</div>
                  <div>Parcial 1</div><div>Parcial 2</div><div>Estado</div>
                </div>
                {cargando ? (
                  <div className="empty-state"><p>Cargando materias…</p></div>
                ) : materiasConNotas.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📚</div>
                    <p>No tenés materias inscriptas este cuatrimestre.<br/>Cuando el administrador cargue la oferta, podrás inscribirte.</p>
                  </div>
                ) : (
                  materiasConNotas.map(m => (
                    <div key={m.id} className="table-row cols-alumno">
                      <div>
                        <div className="materia-name">{m.materiaNombre || m.materiaId}</div>
                        <div className="materia-code">{m.comisionId || ''} · {m.horario || ''}</div>
                      </div>
                      <div style={{ fontSize: '0.82rem' }}>{m.asistencia ?? '—'}%</div>
                      <div className="materia-prof">{m.docente || '—'}</div>
                      <div><NotaPill nota={m.parcial1} /></div>
                      <div><NotaPill nota={m.parcial2} /></div>
                      <div><EstadoBadge estado={m.estado} /></div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tabActiva === 'horario' && (
            <>
              <div className="section-head"><h2>Esta semana</h2></div>
              <div className="schedule-wrap">
                <div className="sch-header">
                  <div style={{ border: 'none' }}></div>
                  {DIAS_SEMANA.map(d => (
                    <div key={d} className="sch-day">{d}</div>
                  ))}
                </div>
                <div className="sch-grid">
                  <div>
                    {HORAS.map(h => <div key={h} className="sch-time-cell">{h}</div>)}
                  </div>
                  {DIAS_SEMANA.map(dia => (
                    <div key={dia} className="sch-day-col">
                      {HORAS.map(h => {
                        const evento = inscripciones.find(
                          insc => insc.dia === dia && insc.horaInicio === h
                        );
                        return (
                          <div key={h} className="sch-cell">
                            {evento && (
                              <div className="abs-event ev-blue">
                                <div className="ev-name-sch">{evento.materiaNombre || evento.materiaId}</div>
                                <div className="ev-room-sch">Aula {evento.aula || '—'}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Grid lateral */}
        <div className="grid-2">
          {/* Próximos eventos */}
          <div>
            <div className="section-head"><h2>Próximos eventos</h2></div>
            <div className="side-card">
              {cargando ? (
                <div className="empty-state"><p>Cargando…</p></div>
              ) : eventos.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📅</div>
                  <p>Sin eventos próximos</p>
                </div>
              ) : (
                eventos.map(ev => {
                  const d = new Date(ev.fecha + 'T00:00:00');
                  return (
                    <div key={ev.id} className="prox-item">
                      <div className="prox-date">
                        <div className="day">{d.getDate()}</div>
                        <div className="mon">{MESES[d.getMonth()]}</div>
                      </div>
                      <div className="prox-info">
                        <div className="ev-title">{ev.titulo}</div>
                        <div className="ev-sub">{ev.hora || ''} {ev.aula ? `· ${ev.aula}` : ''}</div>
                        <span className="ev-type" style={{
                          background: ev.tipo === 'Parcial' ? 'var(--red-soft)' : 'var(--yellow-soft)',
                          color: ev.tipo === 'Parcial' ? 'var(--red)' : 'var(--yellow)',
                        }}>
                          {ev.tipo || 'Evento'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Avance de carrera */}
          <div>
            <div className="section-head"><h2>Avance de carrera</h2></div>
            <div className="side-card" style={{ padding: '18px' }}>
              {planInfo ? (
                <>
                  <div className="progress-item">
                    <div className="progress-label">
                      <span>Materias aprobadas</span>
                      <span>{materiasAprobadas} / {totalCarrera}</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{
                        width: totalCarrera ? `${(materiasAprobadas / totalCarrera) * 100}%` : '0%',
                        background: 'var(--teal)',
                      }} />
                    </div>
                  </div>
                  <div className="progress-item">
                    <div className="progress-label">
                      <span>Promedio histórico</span>
                      <span>{promedio}</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{
                        width: promedio !== '—' ? `${(Number(promedio) / 10) * 100}%` : '0%',
                        background: 'var(--orange)',
                      }} />
                    </div>
                  </div>
                </>
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

export default PanelAlumno;
