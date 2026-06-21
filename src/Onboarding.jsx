import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { db } from './firebase';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

const ESTADOS = [
  { key: 'sin_cursar',        label: 'Sin cursar',          color: '#999',    bg: '#f5f5f5' },
  { key: 'promocionado',      label: 'Promocionado',        color: '#1a5c8a', bg: '#e0f0ff' },
  { key: 'regular_sin_final', label: 'Regular sin final',   color: '#856404', bg: '#fff3cd' },
  { key: 'regular_con_final', label: 'Regular con final',   color: '#1a7a1a', bg: '#e0ffe0' },
  { key: 'equivalencia',      label: 'Equivalencia',        color: '#6a1a8a', bg: '#f0e0ff' },
  { key: 'libre',             label: 'Libre',               color: '#c0392b', bg: '#ffe0e0' },
];

function agruparPorAnio(materias) {
  return materias.reduce((acc, m) => {
    const anio = String(m.anio || 1);
    if (!acc[anio]) acc[anio] = [];
    acc[anio].push(m);
    return acc;
  }, {});
}

export default function Onboarding({ perfil, onCompletado, onSaltear }) {
  const [paso, setPaso] = useState('bienvenida');
  const [anioActual, setAnioActual] = useState(1);
  const [estadoMaterias, setEstadoMaterias] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [planInfo, setPlanInfo] = useState(null);

  const carreras = Array.isArray(perfil?.carreras) ? perfil.carreras : [perfil?.carrera].filter(Boolean);
  const carreraActual = carreras[0] || '';

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

  const materias = planInfo?.materias || [];
  const porAnio = agruparPorAnio(materias);
  const anios = Object.keys(porAnio).map(Number).sort((a, b) => a - b);
  const totalAnios = anios.length;

  const setEstado = (codigo, campo, valor) => {
    setEstadoMaterias(prev => ({
      ...prev,
      [codigo]: { ...(prev[codigo] || { estado: 'sin_cursar' }), [campo]: valor }
    }));
  };

  const guardarYEntrar = async () => {
    setGuardando(true);
    setError('');
    try {
      const uidBuscar = perfil.uid || perfil.email;
      const snap = await getDocs(query(collection(db, 'usuarios'), where('email', '==', perfil.email)));
      if (snap.empty) throw new Error('Usuario no encontrado');
      const userDocId = snap.docs[0].id;
      const batch = writeBatch(db);

      for (const [codigo, datos] of Object.entries(estadoMaterias)) {
        if (datos.estado === 'sin_cursar') continue;
        const notaDocId = perfil.uid + '_' + codigo + '_historial';
        const notaRef = doc(db, 'notas', notaDocId);
        const notaData = {
          alumnoUid: perfil.uid,
          materiaId: codigo,
          tipo: 'historial',
          estado: datos.estado,
        };
        if (datos.p1 != null && datos.p1 !== '') notaData.p1 = Number(datos.p1);
        if (datos.rec1 != null && datos.rec1 !== '') notaData.rec1 = Number(datos.rec1);
        if (datos.p2 != null && datos.p2 !== '') notaData.p2 = Number(datos.p2);
        if (datos.rec2 != null && datos.rec2 !== '') notaData.rec2 = Number(datos.rec2);
        if (datos.final != null && datos.final !== '') notaData.final = Number(datos.final);
        if (datos.definitiva != null && datos.definitiva !== '') notaData.definitiva = Number(datos.definitiva);
        if (datos.nota != null && datos.nota !== '') notaData.nota = Number(datos.nota);
        batch.set(notaRef, notaData);
      }
      await batch.commit();
      await updateDoc(doc(db, 'usuarios', userDocId), { onboardingCompleto: true });
      onCompletado();
    } catch (e) {
      setError('Ocurrio un error al guardar. Intenta de nuevo.');
      console.error(e);
    } finally {
      setGuardando(false);
    }
  };

  if (paso === 'bienvenida') {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f8f9fa'}}>
        <div style={{background:'white',borderRadius:'16px',padding:'40px',maxWidth:'520px',width:'90%',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'16px'}}>🎓</div>
          <h2 style={{color:'#2e7d32',marginBottom:'12px'}}>Bienvenido a Mi Cursada</h2>
          <p style={{color:'#555',marginBottom:'8px',lineHeight:1.6}}>
            Para darte la mejor experiencia, te recomendamos completar tu historial academico.
          </p>
          <p style={{color:'#856404',background:'#fff3cd',border:'1px solid #ffc107',borderRadius:'8px',padding:'10px 14px',fontSize:'0.85rem',marginBottom:'24px'}}>
            ⚠️ Sin completar tu historial, la informacion de correlativas, avance de carrera y promedio estara incompleta.
          </p>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <button
              onClick={() => setPaso('historial')}
              style={{padding:'12px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',fontWeight:600,fontSize:'0.95rem',cursor:'pointer'}}>
              Completar mi historial ahora
            </button>
            <button
              onClick={() => { setPaso('historial'); }}
              style={{padding:'12px',background:'#f5f5f5',color:'#333',border:'1px solid #ddd',borderRadius:'8px',fontWeight:600,fontSize:'0.95rem',cursor:'pointer'}}
              disabled>
              Soy ingresante (primer cuatrimestre)
            </button>
            <button
              onClick={onSaltear}
              style={{padding:'10px',background:'white',color:'#999',border:'1px solid #ddd',borderRadius:'8px',fontSize:'0.85rem',cursor:'pointer'}}>
              Completar mas tarde
            </button>
          </div>
          <button
            onClick={() => signOut(auth)}
            style={{background:'none',border:'none',color:'#999',fontSize:'0.82rem',cursor:'pointer',textDecoration:'underline',marginTop:'8px'}}>
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  const materiasAnio = porAnio[String(anioActual)] || [];
  const esUltimoAnio = anioActual === anios[anios.length - 1];

  return (
    <div style={{minHeight:'100vh',background:'#f8f9fa',padding:'24px'}}>
      <div style={{maxWidth:'860px',margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px'}}>
          <div>
            <h2 style={{color:'#2e7d32',margin:0}}>Mi historial academico</h2>
            <p style={{color:'#666',margin:'4px 0 0',fontSize:'0.88rem'}}>{carreraActual}</p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            {anios.map(a => (
              <button key={a} onClick={() => setAnioActual(a)}
                style={{padding:'6px 14px',borderRadius:'20px',border:'1px solid #ddd',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',
                  background: anioActual === a ? '#2e7d32' : 'white',
                  color: anioActual === a ? 'white' : '#333'}}>
                {a}° año
              </button>
            ))}
          </div>
        </div>

        <div style={{background:'white',borderRadius:'12px',padding:'24px',boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
          <h3 style={{marginBottom:'16px',color:'#333'}}>{anioActual}° año</h3>
          {materiasAnio.map(m => {
            const datos = estadoMaterias[m.codigo] || { estado: 'sin_cursar' };
            const estado = datos.estado;
            const estadoConf = ESTADOS.find(e => e.key === estado) || ESTADOS[0];
            return (
              <div key={m.codigo} style={{borderBottom:'1px solid #f0f0f0',paddingBottom:'16px',marginBottom:'16px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:'0.9rem'}}>{m.nombre}</div>
                    <div style={{fontSize:'0.75rem',color:'#999'}}>{m.cuatrimestre}° cuatrimestre · {m.horas}hs</div>
                  </div>
                  <select
                    value={estado}
                    onChange={e => setEstado(m.codigo, 'estado', e.target.value)}
                    style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'0.82rem',
                      background: estadoConf.bg, color: estadoConf.color, fontWeight:600, cursor:'pointer'}}>
                    {ESTADOS.map(e => (
                      <option key={e.key} value={e.key}>{e.label}</option>
                    ))}
                  </select>
                </div>

                {(estado === 'promocionado' || estado === 'regular_sin_final' || estado === 'regular_con_final') && (
                  <div style={{marginTop:'8px',display:'flex',flexWrap:'wrap',gap:'10px'}}>
                    {[
                      {key:'p1',   label:'Parcial 1'},
                      {key:'rec1', label:'Recup. P1'},
                      {key:'p2',   label:'Parcial 2'},
                      {key:'rec2', label:'Recup. P2'},
                      ...(estado === 'regular_sin_final' || estado === 'regular_con_final' ? [{key:'final', label:'Final'}] : []),
                      {key:'definitiva', label:'Nota definitiva'},
                    ].map(campo => (
                      <div key={campo.key} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                        <label style={{fontSize:'0.72rem',color:'#555',whiteSpace:'nowrap'}}>{campo.label}</label>
                        <input type="number" min="1" max="10" step="0.5"
                          value={datos[campo.key] || ''}
                          onChange={e => setEstado(m.codigo, campo.key, e.target.value)}
                          style={{width:'52px',padding:'4px 6px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'0.82rem',textAlign:'center'}} />
                      </div>
                    ))}
                  </div>
                )}

                {estado === 'libre' && (
                  <div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'8px'}}>
                    <label style={{fontSize:'0.82rem',color:'#555'}}>Nota:</label>
                    <input type="number" min="1" max="10" step="0.5"
                      value={datos.nota || ''}
                      onChange={e => setEstado(m.codigo, 'nota', e.target.value)}
                      style={{width:'70px',padding:'5px 8px',borderRadius:'6px',border:'1px solid #ddd',fontSize:'0.82rem'}} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{background:'#ffe0e0',color:'#c0392b',border:'1px solid #e74c3c',borderRadius:'8px',padding:'10px 14px',marginTop:'16px',fontSize:'0.88rem'}}>
            {error}
          </div>
        )}

        <div style={{display:'flex',justifyContent:'space-between',marginTop:'20px'}}>
          <button
            onClick={() => setAnioActual(prev => Math.max(anios[0], prev - 1))}
            disabled={anioActual === anios[0]}
            style={{padding:'10px 20px',borderRadius:'8px',border:'1px solid #ddd',cursor:'pointer',background:'white',fontWeight:600,opacity: anioActual === anios[0] ? 0.4 : 1}}>
            Año anterior
          </button>
          {!esUltimoAnio ? (
            <button
              onClick={() => setAnioActual(prev => Math.min(anios[anios.length-1], prev + 1))}
              style={{padding:'10px 20px',borderRadius:'8px',border:'none',background:'#2e7d32',color:'white',cursor:'pointer',fontWeight:600}}>
              Siguiente año
            </button>
          ) : (
            <button
              onClick={guardarYEntrar}
              disabled={guardando}
              style={{padding:'10px 24px',borderRadius:'8px',border:'none',background:'#2e7d32',color:'white',cursor:'pointer',fontWeight:600}}>
              {guardando ? 'Guardando...' : 'Guardar y entrar al panel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
