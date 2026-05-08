import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Profesor from '../../models/Profesor';

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function PanelProfesor({ perfil, seccion }) {
  const [comisiones, setComisiones] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

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

  // Stats via modelo Profesor
  const profObj = new Profesor(perfil?.nombre, perfil?.dni, perfil?.email, '', perfil?.carrera);
  comisiones.forEach(c => profObj.asignarComision(c));
  const alumnosTotales = profObj.obtenerAlumnosTotales();
  const materiasDictadas = profObj.obtenerMateriasDictadas();

  const topbar = (
    <div className="topbar">
      <div className="page-title">
        <h1>Panel docente</h1>
        <p>{perfil?.nombre || 'Docente'} · {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  if (seccion !== 'panel' && seccion !== 'comisiones' && seccion !== 'alumnos' && seccion !== 'notas') {
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
            <div className="stat-label">Comisiones activas</div>
            <div className="stat-value">{cargando ? '…' : comisiones.length}</div>
            <span className="stat-badge badge-green">Este cuatrimestre</span>
          </div>
          <div className="stat-card">
            <div className="stat-label">Materias</div>
            <div className="stat-value">{cargando ? '…' : materiasDictadas}</div>
            <span className="stat-badge badge-blue">Dictadas</span>
          </div>
          <div className="stat-card">
            <div className="stat-label">Alumnos inscriptos</div>
            <div className="stat-value">{cargando ? '…' : alumnosTotales}</div>
            <span className="stat-badge badge-yellow">Entre todas las comisiones</span>
          </div>
          <div className="stat-card">
            <div className="stat-label">Próximos parciales</div>
            <div className="stat-value">{cargando ? '…' : eventos.filter(e => e.tipo === 'Parcial').length}</div>
            <span className="stat-badge badge-red">Próximas semanas</span>
          </div>
        </div>

        <div className="grid-2">
          <div>
            <div className="section-head"><h2>Mis comisiones</h2></div>
            <div className="card">
              <div className="table-head cols-profesor">
                <div>Materia</div><div>Horario</div><div>Aula</div>
                <div>Alumnos</div><div>Modalidad</div>
              </div>
              {cargando ? (
                <div className="empty-state"><p>Cargando comisiones…</p></div>
              ) : comisiones.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📋</div>
                  <p>No tenés comisiones asignadas aún.<br/>El administrador te asignará comisiones desde la oferta académica.</p>
                </div>
              ) : (
                comisiones.map(com => (
                  <div key={com.id} className="table-row cols-profesor">
                    <div>
                      <div className="materia-name">{com.materiaNombre || com.materiaId}</div>
                      <div className="materia-code">Comisión {com.numero || com.id.slice(0,4)}</div>
                    </div>
                    <div className="materia-prof">{com.horario || '—'}</div>
                    <div style={{ fontSize: '0.82rem' }}>{com.aula || '—'}</div>
                    <div>
                      <span className="nota-pill nota-empty">{com.alumnos?.length || 0}</span>
                    </div>
                    <div>
                      <div className="status-wrap">
                        <span className={`status-dot ${com.modalidad === 'virtual' ? 'dot-yellow' : 'dot-green'}`}></span>
                        {com.modalidad || 'Presencial'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="section-head"><h2>Próximos eventos</h2></div>
            <div className="side-card">
              {eventos.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📅</div>
                  <p>Sin eventos próximos</p>
                </div>
              ) : (
                eventos.slice(0, 4).map(ev => {
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
        </div>

      </div>
    </>
  );
}

export default PanelProfesor;
