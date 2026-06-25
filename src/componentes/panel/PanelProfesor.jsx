import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Profesor from '../../models/Profesor';
import Cronograma from '../../models/Cronograma';
import ImportService from '../../services/ImportService';
import SeccionConfiguracion from './SeccionConfiguracion';
import SeccionTareas from './SeccionTareas';
import SeccionChat from './SeccionChat';
import SeccionOfertaAcademica from './SeccionOfertaAcademica';
import CARRERAS_DISPONIBLES from '../../carrerasData';
import { carreraEnOferta } from '../../utils/matchCarrera';
import { slugTexto } from '../../utils/slugTexto';

const importService = new ImportService();

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const PLANTILLA_CRONOGRAMA_CSV =
  'Fecha,Unidad/Tema,Modalidad,Fecha clave\n' +
  '17/03/2026,Presentacion e introduccion a la materia,Presencial,\n' +
  '24/03/2026,Feriado - Dia Nacional de la Memoria por la Verdad y la Justicia,Presencial,\n' +
  '31/03/2026,Ingenieria de Software / Ciclo de vida de Desarrollo de SW,Presencial,\n' +
  '14/04/2026,Gestion de Requerimientos,Presencial,Comienzo TP\n' +
  '21/04/2026,Fundamentos de la Programacion,Virtual,\n' +
  '09/06/2026,Examen parcial,Presencial,\n' +
  '16/06/2026,Entrega TP - COMPLETO y presentacion,Presencial,TP Grupal\n';

function descargarPlantillaCronograma() {
  const blob = new Blob([PLANTILLA_CRONOGRAMA_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_cronograma.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const normTexto = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
      style={{width:'52px',padding:'4px 6px',borderRadius:'6px',border:'1px solid var(--border-2)',fontSize:'0.82rem',textAlign:'center',background:'var(--surface-2)',color:'var(--text-1)'}}
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
  const [filtroAlumno, setFiltroAlumno] = useState('');

  const [cronogramaComSel, setCronogramaComSel] = useState(null);
  const [cronogramaClases, setCronogramaClases] = useState([]);
  const [cargandoCronograma, setCargandoCronograma] = useState(false);
  const [guardandoCronograma, setGuardandoCronograma] = useState(false);
  const [reemplazarCronograma, setReemplazarCronograma] = useState(false);
  const [dragOverCronograma, setDragOverCronograma] = useState(false);
  const [mensajeCronograma, setMensajeCronograma] = useState(null);
  const inputCronogramaRef = useRef();

  const [ofertaComisiones, setOfertaComisiones] = useState([]);
  const [todasComisiones, setTodasComisiones] = useState([]);
  const [cargandoOferta, setCargandoOferta] = useState(false);
  const [carreraBrowse, setCarreraBrowse] = useState('');
  const [materiaBrowse, setMateriaBrowse] = useState('');
  const [anotandoId, setAnotandoId] = useState(null);
  const [mensajeComisiones, setMensajeComisiones] = useState(null);
  const [cronogramasPropios, setCronogramasPropios] = useState([]);

  const cargarComisionesPropias = async () => {
    if (!perfil?.uid) return;
    const comSnap = await getDocs(
      query(collection(db, 'comisiones'), where('profesorUid', '==', perfil.uid))
    );
    setComisiones(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    if (!perfil?.uid) return;
    const cargar = async () => {
      setCargando(true);
      try {
        await cargarComisionesPropias();
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

  useEffect(() => {
    if (comisiones.length === 0) { setCronogramasPropios([]); return; }
    const cargarCronogramas = async () => {
      try {
        const snaps = await Promise.all(
          comisiones.map(com => getDoc(doc(db, 'cronogramas', com.id)))
        );
        setCronogramasPropios(
          snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }))
        );
      } catch (e) {
        console.error('Error cargando cronogramas:', e);
      }
    };
    cargarCronogramas();
  }, [comisiones]);

  useEffect(() => {
    if (seccion !== 'comisiones') return;
    const cargarBrowse = async () => {
      setCargandoOferta(true);
      try {
        const [ofertaSnap, comSnap] = await Promise.all([
          getDocs(collection(db, 'comisionesOferta')),
          getDocs(collection(db, 'comisiones')),
        ]);
        setOfertaComisiones(ofertaSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTodasComisiones(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando oferta para anotarse:', e);
      } finally {
        setCargandoOferta(false);
      }
    };
    cargarBrowse();
  }, [seccion]);

  const carrerasBrowse = CARRERAS_DISPONIBLES.map(c => c.nombre);
  const ofertaCarreraBrowse = carreraBrowse
    ? ofertaComisiones.filter(o => carreraEnOferta(o.carrera_ref, carreraBrowse))
    : [];
  const materiasBrowse = [...new Set(ofertaCarreraBrowse.map(o => o.materia_nombre))].filter(Boolean).sort();
  const comisionesAgrupadas = (() => {
    if (!carreraBrowse || !materiaBrowse) return [];
    const filas = ofertaCarreraBrowse.filter(o => o.materia_nombre === materiaBrowse);
    const mapa = new Map();
    filas.forEach(f => {
      const key = f.comision || '1';
      if (!mapa.has(key)) {
        mapa.set(key, { numero: key, codigo: f.codigo_asignatura, materiaNombre: f.materia_nombre, carrera: carreraBrowse, sesiones: [] });
      }
      mapa.get(key).sesiones.push({ dia: f.dia, horario: f.hora_rango, aula: f.aula, modalidad: f.modalidad, sede: f.sede, turno: f.turno });
    });
    return [...mapa.values()].sort((a, b) => String(a.numero).localeCompare(String(b.numero)));
  })();

  const materiaIdGrupo = (g) => g.codigo || slugTexto(g.materiaNombre);
  const comisionAsignada = (g) => todasComisiones.find(
    c => c.materiaId === materiaIdGrupo(g) && String(c.numero) === String(g.numero)
  );

  const anotarseComision = async (g) => {
    const materiaId = materiaIdGrupo(g);
    const docId = slugTexto(materiaId + '_' + g.numero);
    setAnotandoId(docId);
    setMensajeComisiones(null);
    try {
      await setDoc(doc(db, 'comisiones', docId), {
        profesorUid: perfil.uid,
        materiaId,
        materiaNombre: g.materiaNombre,
        carrera: g.carrera,
        numero: g.numero,
        dia: [...new Set(g.sesiones.map(s => s.dia).filter(Boolean))].join(', '),
        horario: g.sesiones.map(s => s.horario).filter(Boolean).join(' / '),
        aula: [...new Set(g.sesiones.map(s => s.aula).filter(Boolean))].join(', '),
        modalidad: g.sesiones[0]?.modalidad || 'presencial',
        sesiones: g.sesiones,
        alumnos: [],
      });
      setMensajeComisiones({ tipo: 'ok', msg: 'Te anotaste como docente de esta comision.' });
      await cargarComisionesPropias();
      const comSnap = await getDocs(collection(db, 'comisiones'));
      setTodasComisiones(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setMensajeComisiones({ tipo: 'error', msg: 'Error: ' + e.message });
      console.error(e);
    } finally {
      setAnotandoId(null);
    }
  };

  const darseDeBajaComision = async (com) => {
    if (!window.confirm('Darte de baja de esta comision? Vas a perder el acceso a sus alumnos y notas.')) return;
    setAnotandoId(com.id);
    setMensajeComisiones(null);
    try {
      await deleteDoc(doc(db, 'comisiones', com.id));
      setMensajeComisiones({ tipo: 'ok', msg: 'Te diste de baja de la comision.' });
      await cargarComisionesPropias();
      const comSnap = await getDocs(collection(db, 'comisiones'));
      setTodasComisiones(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setMensajeComisiones({ tipo: 'error', msg: 'Error: ' + e.message });
      console.error(e);
    } finally {
      setAnotandoId(null);
    }
  };

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

  const seleccionarComisionCronograma = async (com) => {
    setCronogramaComSel(com);
    setMensajeCronograma(null);
    setCargandoCronograma(true);
    try {
      const snap = await getDoc(doc(db, 'cronogramas', com.id));
      setCronogramaClases(snap.exists() ? (snap.data().clases || []) : []);
    } catch (e) {
      console.error('Error cargando cronograma:', e);
      setCronogramaClases([]);
    } finally {
      setCargandoCronograma(false);
    }
  };

  const actualizarClaseCronograma = (idx, campo, valor) => {
    setCronogramaClases(prev => prev.map((c, i) => i === idx ? { ...c, [campo]: valor } : c));
  };

  const agregarClaseCronograma = () => {
    setCronogramaClases(prev => [...prev, { fecha: '', tema: '', modalidad: 'presencial', fechaClave: '' }]);
  };

  const eliminarClaseCronograma = (idx) => {
    setCronogramaClases(prev => prev.filter((_, i) => i !== idx));
  };

  const guardarCronograma = async () => {
    if (!cronogramaComSel) return;
    setGuardandoCronograma(true);
    setMensajeCronograma(null);
    try {
      const clasesOrdenadas = [...cronogramaClases]
        .filter(c => c.fecha && c.tema)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      const cronograma = new Cronograma({
        comisionId: cronogramaComSel.id,
        materiaId: cronogramaComSel.materiaId,
        materiaNombre: cronogramaComSel.materiaNombre,
        profesorUid: perfil.uid,
        clases: clasesOrdenadas,
      });
      await setDoc(doc(db, 'cronogramas', cronogramaComSel.id), cronograma.toFirestore());
      setCronogramaClases(clasesOrdenadas);
      setMensajeCronograma({ tipo: 'ok', msg: 'Cronograma guardado correctamente.' });
    } catch (e) {
      setMensajeCronograma({ tipo: 'error', msg: 'Error al guardar: ' + e.message });
      console.error(e);
    } finally {
      setGuardandoCronograma(false);
    }
  };

  const importarArchivoCronograma = async (archivo) => {
    if (!archivo || !cronogramaComSel) return;
    if (reemplazarCronograma && !window.confirm(
      'Esto va a BORRAR el cronograma actual de esta comision antes de cargar el archivo nuevo. Esta accion no se puede deshacer. Continuar?'
    )) return;
    setCargandoCronograma(true);
    setMensajeCronograma(null);
    try {
      const cantidad = await importService.importarCronograma(archivo, {
        comisionId: cronogramaComSel.id,
        materiaId: cronogramaComSel.materiaId,
        materiaNombre: cronogramaComSel.materiaNombre,
        profesorUid: perfil.uid,
      }, reemplazarCronograma);
      const snap = await getDoc(doc(db, 'cronogramas', cronogramaComSel.id));
      setCronogramaClases(snap.exists() ? (snap.data().clases || []) : []);
      setMensajeCronograma({ tipo: 'ok', msg: cantidad + ' clases importadas correctamente' + (reemplazarCronograma ? ' (cronograma anterior reemplazado)' : '') });
    } catch (e) {
      setMensajeCronograma({ tipo: 'error', msg: 'Error: ' + e.message });
      console.error(e);
    } finally {
      setCargandoCronograma(false);
    }
  };

  const profObj = new Profesor(perfil?.nombre, perfil?.dni, perfil?.email, '', perfil?.carrera);
  comisiones.forEach(c => profObj.asignarComision(c));
  const alumnosTotales = profObj.obtenerAlumnosTotales();
  const materiasDictadas = profObj.obtenerMateriasDictadas();

  const inferirTipoEvento = (texto) => {
    const t = (texto || '').toLowerCase();
    if (t.includes('parcial') || t.includes('examen')) return 'Parcial';
    if (t.includes('tp') || t.includes('entrega') || t.includes('trabajo')) return 'TP';
    return 'Evento';
  };

  const hoyStr = new Date().toISOString().split('T')[0];
  const eventosCronogramaTodos = cronogramasPropios.flatMap(c =>
    (c.clases || [])
      .filter(cl => cl.fechaClave)
      .map(cl => ({
        id: `cron_${c.id}_${cl.fecha}`,
        titulo: `${c.materiaNombre || ''}: ${cl.fechaClave}`,
        tipo: inferirTipoEvento(cl.fechaClave),
        fecha: cl.fecha,
        hora: '',
        aula: '',
        materiaId: c.materiaId,
      }))
  );
  const eventosCronograma = eventosCronogramaTodos.filter(ev => ev.fecha >= hoyStr);

  const materiaIdsPropias = new Set(comisiones.map(c => c.materiaId));
  const eventosPropios = [
    ...eventos.filter(ev => materiaIdsPropias.has(ev.materiaId)),
    ...eventosCronograma,
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Calendario muestra todo el cuatrimestre (pasado y futuro), no solo lo que falta
  const eventosCalendario = [
    ...eventos.filter(ev => materiaIdsPropias.has(ev.materiaId)),
    ...eventosCronogramaTodos,
  ].sort((a, b) => a.fecha.localeCompare(b.fecha));

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
              <div className="stat-value">{cargando ? '...' : eventosPropios.filter(e => e.tipo === 'Parcial').length}</div>
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
                {eventosPropios.length === 0 ? (
                  <div className="empty-state"><div className="icon">📅</div><p>Sin eventos proximos</p></div>
                ) : (
                  eventosPropios.slice(0,4).map(ev => {
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

  if (seccion === 'alumnos' || seccion === 'notas') {
    return (
      <>
        {topbar(
          seccion === 'alumnos' ? 'Alumnos por comision' : 'Cargar notas',
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
                style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid var(--border-2)',cursor:'pointer',
                  background: comSeleccionada?.id === com.id ? '#2e7d32' : 'var(--surface-2)',
                  color: comSeleccionada?.id === com.id ? 'white' : 'var(--text-1)',
                  fontWeight: 600, fontSize:'0.85rem', textAlign:'center'}}>
                <><div>{com.materiaNombre || com.materiaId}</div><div style={{fontSize:'0.72rem',opacity:0.8,marginTop:'2px'}}>Comisión {com.numero || com.id.slice(0,4)}</div></>
              </button>
            ))}
          </div>

          {comSeleccionada && (() => {
            const alumnosFiltrados = alumnos.filter(a => normTexto(a.nombre).includes(normTexto(filtroAlumno)));
            return (
            <>
              {mensaje && (
                <div style={{background:mensaje.startsWith('ok:')?'#e0ffe0':'#ffe0e0',color:mensaje.startsWith('ok:')?'#1a7a1a':'#c0392b',border:'1px solid '+(mensaje.startsWith('ok:')?'#2ecc71':'#e74c3c'),borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'0.88rem'}}>
                  {mensaje.split(':')[1]}
                </div>
              )}
              <div style={{marginBottom:'14px'}}>
                <input type="text" placeholder="Buscar alumno por nombre..." value={filtroAlumno}
                  onChange={e => setFiltroAlumno(e.target.value)}
                  style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid var(--border)',fontSize:'0.85rem',width:'280px',background:'var(--surface-2)',color:'var(--text-1)'}} />
              </div>
              {seccion === 'alumnos' ? (
                <div className="card" style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                    <thead>
                      <tr style={{background:'var(--surface-2)'}}>
                        <th style={{padding:'10px 12px',textAlign:'left',fontWeight:600}}>Alumno</th>
                        <th style={{padding:'10px 12px',textAlign:'left',fontWeight:600}}>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnosFiltrados.length === 0 ? (
                        <tr><td colSpan={2} style={{textAlign:'center',padding:'24px',color:'#999'}}>
                          {alumnos.length === 0 ? 'No hay alumnos inscriptos en esta comision.' : 'Ningun alumno coincide con la busqueda.'}
                        </td></tr>
                      ) : (
                        alumnosFiltrados.map(a => (
                          <tr key={a.uid} style={{borderBottom:'1px solid #f0f0f0'}}>
                            <td style={{padding:'10px 12px',fontWeight:600}}>{a.nombre}</td>
                            <td style={{padding:'10px 12px',color:'#999'}}>{a.email}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <>
                  <div className="card" style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                      <thead>
                        <tr style={{background:'var(--surface-2)'}}>
                          <th style={{padding:'10px 12px',textAlign:'left',fontWeight:600}}>Alumno</th>
                          {PARCIALES.map(p => (
                            <th key={p.key} style={{padding:'10px 8px',textAlign:'center',fontWeight:600,whiteSpace:'nowrap'}}>{p.label}</th>
                          ))}
                          <th style={{padding:'10px 12px',textAlign:'center',fontWeight:600}}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumnosFiltrados.length === 0 ? (
                          <tr><td colSpan={PARCIALES.length + 2} style={{textAlign:'center',padding:'24px',color:'#999'}}>
                            {alumnos.length === 0 ? 'No hay alumnos inscriptos en esta comision.' : 'Ningun alumno coincide con la busqueda.'}
                          </td></tr>
                        ) : (
                          alumnosFiltrados.map(a => {
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
                                    <td key={p.key} style={{padding:'6px 8px',textAlign:'center',background:'var(--surface-2)',color:'var(--text-1)'}}>
                                      <NotaInput
                                        valor={notaObj?.nota ?? null}
                                        onChange={val => actualizarNota(a.uid, p.key, val)}
                                      />
                                    </td>
                                  );
                                })}
                                <td style={{padding:'10px 12px',textAlign:'center',background:'var(--surface-2)',color:'var(--text-1)'}}>
                                  <BadgeEstado estado={estado} />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={{marginTop:'16px',textAlign:'right'}}>
                    <button onClick={guardarNotas} disabled={guardando}
                      style={{padding:'10px 24px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600,fontSize:'0.9rem'}}>
                      {guardando ? 'Guardando...' : 'Guardar notas'}
                    </button>
                  </div>
                </>
              )}
            </>
            );
          })()}
        </div>
      </>
    );
  }

  if (seccion === 'comisiones') {
    return (
      <>
        {topbar('Mis comisiones', 'Gestiona tus comisiones asignadas y anotate en nuevas')}
        <div className="content">
          <div className="section-head" style={{marginBottom:'12px'}}>
            <h2>Comisiones donde sos docente</h2>
          </div>
          <div className="card" style={{marginBottom:'28px'}}>
            <div className="table-head cols-profesor">
              <div>Materia</div><div>Horario</div><div>Aula</div><div>Alumnos</div><div></div>
            </div>
            {comisiones.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📋</div>
                <p>Todavia no estas anotado en ninguna comision.</p>
              </div>
            ) : (
              comisiones.map(com => (
                <div key={com.id} className="table-row cols-profesor">
                  <div>
                    <div className="materia-name">{com.materiaNombre || com.materiaId}</div>
                    <div className="materia-code">Comision {com.numero || com.id.slice(0, 4)}</div>
                  </div>
                  <div className="materia-prof">{com.horario || '-'}</div>
                  <div style={{fontSize:'0.82rem'}}>{com.aula || '-'}</div>
                  <div><span className="nota-pill nota-empty">{com.alumnos?.length || 0}</span></div>
                  <div>
                    <button onClick={() => darseDeBajaComision(com)} disabled={anotandoId === com.id}
                      style={{background:'none',border:'1px solid #e74c3c',color:'#e74c3c',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'0.75rem',fontWeight:600}}>
                      Darme de baja
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="section-head" style={{marginBottom:'12px'}}>
            <h2>Anotarme en una comision</h2>
          </div>
          {mensajeComisiones && (
            <div style={{background:mensajeComisiones.tipo==='ok'?'#e0ffe0':'#ffe0e0',color:mensajeComisiones.tipo==='ok'?'#1a7a1a':'#c0392b',border:'1px solid '+(mensajeComisiones.tipo==='ok'?'#2ecc71':'#e74c3c'),borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'0.88rem'}}>
              {mensajeComisiones.msg}
            </div>
          )}
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'20px'}}>
            <div>
              <label style={{display:'block',fontSize:'0.8rem',fontWeight:600,marginBottom:'6px'}}>Carrera</label>
              <select value={carreraBrowse} onChange={e => { setCarreraBrowse(e.target.value); setMateriaBrowse(''); }}
                style={{padding:'8px',borderRadius:'6px',border:'1px solid var(--border-color)',minWidth:'260px',background:'var(--surface-2)',color:'var(--text-1)'}}>
                <option value="">Selecciona una carrera</option>
                {carrerasBrowse.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:'0.8rem',fontWeight:600,marginBottom:'6px'}}>Materia</label>
              <select value={materiaBrowse} onChange={e => setMateriaBrowse(e.target.value)} disabled={!carreraBrowse}
                style={{padding:'8px',borderRadius:'6px',border:'1px solid var(--border-color)',minWidth:'260px',background:'var(--surface-2)',color:'var(--text-1)'}}>
                <option value="">Selecciona una materia</option>
                {materiasBrowse.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {cargandoOferta ? (
            <div className="empty-state"><p>Cargando oferta academica...</p></div>
          ) : !carreraBrowse || !materiaBrowse ? (
            <div className="empty-state">
              <div className="icon">🔍</div>
              <p>Elegi una carrera y una materia para ver las comisiones disponibles.</p>
            </div>
          ) : comisionesAgrupadas.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📭</div>
              <p>No hay comisiones cargadas para esta materia este cuatrimestre.</p>
            </div>
          ) : (
            comisionesAgrupadas.map(g => {
              const asignada = comisionAsignada(g);
              const esMia = asignada?.profesorUid === perfil.uid;
              const deOtro = asignada && !esMia;
              const docId = slugTexto(materiaIdGrupo(g) + '_' + g.numero);
              return (
                <div key={g.numero} style={{border:'1px solid var(--border)',borderRadius:'10px',padding:'14px',marginBottom:'12px',background:'var(--surface)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'10px'}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--text-1)'}}>Comision {g.numero}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'4px',marginTop:'6px'}}>
                        {g.sesiones.map((s, i) => (
                          <div key={i} style={{fontSize:'0.78rem',color:'var(--text-2)'}}>
                            {s.dia} · {s.horario}hs · {s.sede || s.modalidad}{s.aula ? ' · Aula ' + s.aula : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      {esMia ? (
                        <span className="status-badge badge-green">Ya estas anotado</span>
                      ) : deOtro ? (
                        <span className="status-badge badge-red">Asignada a otro docente</span>
                      ) : (
                        <button onClick={() => anotarseComision(g)} disabled={anotandoId !== null}
                          style={{padding:'8px 16px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600,fontSize:'0.82rem'}}>
                          {anotandoId === docId ? 'Procesando...' : 'Anotarme'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </>
    );
  }

  if (seccion === 'calendario') {
    return (
      <>
        {topbar('Calendario', 'Parciales, TPs y fechas clave de tus comisiones')}
        <div className="content">
          <div className="card">
            <div className="table-head calendario-profesor" style={{gridTemplateColumns:'60px 2fr 1fr 1fr 1fr'}}>
              <div>Fecha</div><div>Materia</div><div>Tipo</div><div>Hora</div><div>Aula</div>
            </div>
            {cargando ? (
              <div className="empty-state"><p>Cargando...</p></div>
            ) : eventosCalendario.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📅</div>
                <p>No hay eventos en tus comisiones todavia.</p>
              </div>
            ) : (
              eventosCalendario.map(ev => {
                const d = new Date(ev.fecha + 'T00:00:00');
                const pasado = ev.fecha < hoyStr;
                return (
                  <div key={ev.id} className="table-row calendario-profesor" style={{gridTemplateColumns:'60px 2fr 1fr 1fr 1fr', opacity: pasado ? 0.5 : 1}}>
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

  if (seccion === 'cronograma') {
    return (
      <>
        {topbar('Cronograma', cronogramaComSel ? (cronogramaComSel.materiaNombre || cronogramaComSel.materiaId) : 'Selecciona una comision')}
        <div className="content">
          <div className="section-head" style={{marginBottom:'12px'}}>
            <h2>Selecciona una comision</h2>
          </div>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'24px'}}>
            {comisiones.map(com => (
              <button key={com.id}
                onClick={() => seleccionarComisionCronograma(com)}
                style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid var(--border-2)',cursor:'pointer',
                  background: cronogramaComSel?.id === com.id ? '#2e7d32' : 'var(--surface-2)',
                  color: cronogramaComSel?.id === com.id ? 'white' : 'var(--text-1)',
                  fontWeight: 600, fontSize:'0.85rem', textAlign:'center'}}>
                {com.materiaNombre || com.materiaId} · Com. {com.numero || com.id.slice(0,4)}
              </button>
            ))}
          </div>

          {cronogramaComSel && (
            <>
              <div className="import-card" style={{marginBottom:'24px',maxWidth:'520px'}}>
                <h3>Importar cronograma</h3>
                <p>Subi un CSV con las clases de esta comision: Fecha, Unidad/Tema, Modalidad, Fecha clave.</p>
                <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'0.82rem',marginBottom:'10px',cursor:'pointer'}}>
                  <input type="checkbox" checked={reemplazarCronograma} onChange={e => setReemplazarCronograma(e.target.checked)} />
                  Reemplazar todo (borra el cronograma actual antes de importar)
                </label>
                <div
                  className={"import-dropzone" + (dragOverCronograma ? " drag-over" : "")}
                  onDragOver={e => { e.preventDefault(); setDragOverCronograma(true); }}
                  onDragLeave={() => setDragOverCronograma(false)}
                  onDrop={e => { e.preventDefault(); setDragOverCronograma(false); importarArchivoCronograma(e.dataTransfer.files[0]); }}
                  onClick={() => inputCronogramaRef.current.click()}
                >
                  <input ref={inputCronogramaRef} type="file" accept=".csv,.json" style={{display:'none'}} onChange={e => importarArchivoCronograma(e.target.files[0])} />
                  <div className="drop-icon">📂</div>
                  <div className="drop-label">{cargandoCronograma ? 'Procesando...' : 'Arrastra un archivo o haz clic'}</div>
                  <div className="drop-sub">Formatos admitidos: CSV · JSON</div>
                </div>
                {mensajeCronograma && (
                  <div className={"import-result " + mensajeCronograma.tipo}>{mensajeCronograma.msg}</div>
                )}
                <button onClick={descargarPlantillaCronograma}
                  style={{marginTop:'12px',padding:'8px 14px',background:'none',border:'1px solid var(--border)',borderRadius:'8px',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',color:'var(--text-1)'}}>
                  ⬇ Descargar plantilla CSV
                </button>
              </div>

              <div className="section-head" style={{marginBottom:'12px'}}>
                <h2>Clases</h2>
              </div>
              {cargandoCronograma ? (
                <div className="empty-state"><p>Cargando...</p></div>
              ) : (
                <>
                  <div className="card">
                    <div className="table-head cronograma-profesor" style={{gridTemplateColumns:'150px 2fr 1fr 1fr 60px'}}>
                      <div>Fecha</div><div>Unidad / Tema</div><div>Modalidad</div><div>Fecha clave</div><div>Acciones</div>
                    </div>
                    {cronogramaClases.length === 0 ? (
                      <div className="empty-state">
                        <div className="icon">🗓</div>
                        <p>Todavia no hay clases cargadas para esta comision.</p>
                      </div>
                    ) : (
                      cronogramaClases.map((c, i) => (
                        <div key={i} className="table-row cronograma-profesor" style={{gridTemplateColumns:'150px 2fr 1fr 1fr 60px'}}>
                          <div>
                            <input type="date" value={c.fecha || ''} onChange={e => actualizarClaseCronograma(i, 'fecha', e.target.value)}
                              style={{width:'100%',padding:'6px',borderRadius:'6px',border:'1px solid var(--border-2)',background:'var(--surface-2)',color:'var(--text-1)'}} />
                          </div>
                          <div>
                            <input type="text" value={c.tema || ''} onChange={e => actualizarClaseCronograma(i, 'tema', e.target.value)}
                              placeholder="Unidad / tema de la clase"
                              style={{width:'100%',padding:'6px',borderRadius:'6px',border:'1px solid var(--border-2)',boxSizing:'border-box',background:'var(--surface-2)',color:'var(--text-1)',display:'block',margin:'0 auto'}} />
                          </div>
                          <div>
                            <select value={c.modalidad || 'presencial'} onChange={e => actualizarClaseCronograma(i, 'modalidad', e.target.value)}
                              style={{width:'125px',padding:'6px',borderRadius:'6px',border:'1px solid var(--border-2)',background:'var(--surface-2)',color:'var(--text-1)',display:'block',margin:'0 auto'}}>
                              <option value="presencial">Presencial</option>
                              <option value="virtual">Virtual</option>
                              <option value="mixta">Híbrida</option>
                            </select>
                          </div>
                          <div>
                            <input type="text" value={c.fechaClave || ''} onChange={e => actualizarClaseCronograma(i, 'fechaClave', e.target.value)}
                              placeholder="-"
                              style={{width:'180px',padding:'6px',borderRadius:'6px',border:'1px solid var(--border-2)',boxSizing:'border-box',background:'var(--surface-2)',color:'var(--text-1)',display:'block',margin:'0 auto',textAlign:'center'}} />
                          </div>
                          <div>
                            <button onClick={() => eliminarClaseCronograma(i)}
                              style={{background:'none',border:'none',cursor:'pointer',color:'#c0392b',fontSize:'0.85rem',fontWeight:700}}>
                              x
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:'16px'}}>
                    <button onClick={agregarClaseCronograma}
                      style={{padding:'8px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)',cursor:'pointer',fontWeight:600}}>
                      + Agregar clase
                    </button>
                    <button onClick={guardarCronograma} disabled={guardandoCronograma}
                      style={{padding:'10px 24px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
                      {guardandoCronograma ? 'Guardando...' : 'Guardar cronograma'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  if (seccion === 'oferta') {
    return (
      <>
        {topbar('Oferta académica', 'Todas las carreras y comisiones del cuatrimestre')}
        <SeccionOfertaAcademica />
      </>
    );
  }

  if (seccion === 'tareas') {
    return (
      <>
        {topbar('Tareas', 'Tu tablero personal, compartilo con tus compañeros')}
        <SeccionTareas perfil={perfil} />
      </>
    );
  }

  if (seccion === 'chat') {
    return (
      <>
        {topbar('Chat', 'Hablá con tus alumnos por comisión')}
        <SeccionChat perfil={perfil} />
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
