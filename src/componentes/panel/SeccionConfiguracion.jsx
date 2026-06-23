import { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const ESTADOS_HISTORIAL = [
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

export default function SeccionConfiguracion({ perfil, onBaja }) {
  const esAlumno = perfil?.rol === 'alumno';
  const [tab, setTab] = useState(esAlumno ? 'historial' : 'password');
  const [anioActual, setAnioActual] = useState(1);
  const [estadoMaterias, setEstadoMaterias] = useState({});
  const [guardandoHistorial, setGuardandoHistorial] = useState(false);
  const [mensajeHistorial, setMensajeHistorial] = useState('');
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [mensajePass, setMensajePass] = useState('');
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [confirmBaja, setConfirmBaja] = useState(false);
  const [passBaja, setPassBaja] = useState('');
  const [mensajeBaja, setMensajeBaja] = useState('');
  const [planInfo, setPlanInfo] = useState(null);

  const carreras = Array.isArray(perfil?.carreras) && perfil.carreras.length > 0
    ? perfil.carreras
    : (perfil?.carrera ? [perfil.carrera] : []);
  const carreraActual = carreras[0] || '';
  const materias = planInfo?.materias || [];

  useEffect(() => {
    if (!carreraActual || !esAlumno) return;
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
  }, [carreraActual, esAlumno]);

  useEffect(() => {
    if (!perfil?.uid || !esAlumno) return;
    const cargarHistorial = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'notas'),
            where('alumnoUid', '==', perfil.uid),
            where('tipo', '==', 'historial'))
        );
        const mapa = {};
        snap.docs.forEach(d => {
          const data = d.data();
          const codigo = data.materiaId;
          if (!mapa[codigo]) mapa[codigo] = { estado: 'sin_cursar' };
          mapa[codigo].estado = data.estado || 'sin_cursar';
          if (data.nota != null) mapa[codigo].nota = data.nota;
          if (data.p1 != null) mapa[codigo].p1 = data.p1;
          if (data.rec1 != null) mapa[codigo].rec1 = data.rec1;
          if (data.p2 != null) mapa[codigo].p2 = data.p2;
          if (data.rec2 != null) mapa[codigo].rec2 = data.rec2;
          if (data.final != null) mapa[codigo].final = data.final;
          if (data.definitiva != null) mapa[codigo].definitiva = data.definitiva;
        });
        setEstadoMaterias(mapa);
      } catch (e) {
        console.error('Error cargando historial:', e);
      }
    };
    cargarHistorial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.uid, esAlumno]);

  const porAnio = agruparPorAnio(materias);
  const anios = Object.keys(porAnio).map(Number).sort((a, b) => a - b);

  const setEstadoMateria = (codigo, campo, valor) => {
    setEstadoMaterias(prev => ({
      ...prev,
      [codigo]: { ...(prev[codigo] || { estado: 'sin_cursar' }), [campo]: valor }
    }));
  };

  const guardarHistorial = async () => {
    setGuardandoHistorial(true);
    setMensajeHistorial('');
    try {
      const { writeBatch, doc: firestoreDoc } = await import('firebase/firestore');
      const batch = writeBatch(db);
      for (const [codigo, datos] of Object.entries(estadoMaterias)) {
        if (datos.estado === 'sin_cursar') continue;
        const docId = perfil.uid + '_' + codigo + '_historial';
        const notaRef = firestoreDoc(db, 'notas', docId);
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
      setMensajeHistorial('ok:Historial guardado correctamente.');
    } catch (e) {
      setMensajeHistorial('error:Error al guardar. Intenta de nuevo.');
      console.error(e);
    } finally {
      setGuardandoHistorial(false);
    }
  };

  const cambiarPassword = async () => {
    setMensajePass('');
    if (!passActual || !passNueva || !passConfirm) {
      setMensajePass('error:Completa todos los campos.');
      return;
    }
    if (passNueva !== passConfirm) {
      setMensajePass('error:Las contraseñas nuevas no coinciden.');
      return;
    }
    if (passNueva.length < 6) {
      setMensajePass('error:La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setGuardandoPass(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passActual);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passNueva);
      setMensajePass('ok:Contraseña actualizada correctamente.');
      setPassActual('');
      setPassNueva('');
      setPassConfirm('');
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setMensajePass('error:La contraseña actual es incorrecta.');
      } else {
        setMensajePass('error:Error al cambiar la contraseña. Intenta de nuevo.');
      }
      console.error(e);
    } finally {
      setGuardandoPass(false);
    }
  };

  const darDeBaja = async () => {
    setMensajeBaja('');
    if (!passBaja) {
      setMensajeBaja('error:Ingresa tu contraseña para confirmar.');
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, passBaja);
      await reauthenticateWithCredential(auth.currentUser, credential);
      const snap = await getDocs(query(collection(db, 'usuarios'), where('uid', '==', perfil.uid)));
      if (!snap.empty) await deleteDoc(doc(db, 'usuarios', snap.docs[0].id));
      await deleteUser(auth.currentUser);
      if (onBaja) onBaja();
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setMensajeBaja('error:Contraseña incorrecta.');
      } else {
        setMensajeBaja('error:Error al dar de baja. Intenta de nuevo.');
      }
      console.error(e);
    }
  };

  const materiasAnio = porAnio[String(anioActual)] || [];
  const esUltimoAnio = anioActual === anios[anios.length - 1];

  return (
    <div className="content">
      <div style={{display:'flex',gap:'10px',marginBottom:'24px',borderBottom:'1px solid var(--border)',paddingBottom:'12px'}}>
        {[
          ...(esAlumno ? [{key:'historial',label:'Mi historial'}] : []),
          {key:'password',label:'Cambiar contraseña'},
          {key:'baja',label:'Dar de baja'},
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{padding:'8px 18px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:600,fontSize:'0.88rem',
              background: tab === t.key ? '#2e7d32' : '#f5f5f5',
              color: tab === t.key ? 'white' : '#555'}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'historial' && (
        <div>
          <p style={{color:'var(--text-2)',marginBottom:'16px',fontSize:'0.88rem'}}>
            Carga tus materias de cuatrimestres anteriores. Esto mejora el calculo de correlativas y avance de carrera.
          </p>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'20px'}}>
            {anios.map(a => (
              <button key={a} onClick={() => setAnioActual(a)}
                style={{padding:'6px 14px',borderRadius:'20px',border:'1px solid #ddd',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',
                  background: anioActual === a ? '#2e7d32' : '#f5f5f5',
                  color: anioActual === a ? 'white' : '#333'}}>
                {a} año
              </button>
            ))}
          </div>
          <div style={{background:'var(--surface)',borderRadius:'12px',padding:'20px',border:'1px solid var(--border)'}}>
            <h3 style={{marginBottom:'16px',color:'var(--text-1)',fontWeight:700,fontSize:'1rem'}}>{anioActual}° año</h3>
            {materiasAnio.map(m => {
              const datos = estadoMaterias[m.codigo] || { estado: 'sin_cursar' };
              const estado = datos.estado;
              const sangriaNombre = '8px';
              const sangriaInfo = '40px';
              return (
                <div key={m.codigo} style={{borderBottom:'1px solid #f0f0f0',paddingBottom:'10px',marginBottom:'10px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{flex:1,textAlign:'left'}}>
                      <div style={{fontWeight:600,fontSize:'0.88rem',color:'var(--text-1)',paddingLeft:sangriaNombre}}>{m.nombre}</div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-3)',marginTop:'2px',paddingLeft:sangriaInfo}}>{m.cuatrimestre}° cuatrimestre</div>
                    </div>
                    <select value={estado} onChange={e => setEstadoMateria(m.codigo, 'estado', e.target.value)}
                      style={{marginLeft:'12px',padding:'5px 8px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'0.8rem',background:'var(--surface-2)',color:'var(--text-1)',fontWeight:600,cursor:'pointer',flexShrink:0}}>
                      {ESTADOS_HISTORIAL.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                    </select>
                  </div>
                  {(estado === 'promocionado' || estado === 'regular_sin_final' || estado === 'regular_con_final') && (
                    <div style={{marginTop:'8px',display:'flex',flexWrap:'wrap',gap:'10px',paddingLeft:'8px'}}>
                      {[
                        {key:'p1',   label:'Parcial 1'},
                        {key:'rec1', label:'Recup. P1'},
                        {key:'p2',   label:'Parcial 2'},
                        {key:'rec2', label:'Recup. P2'},
                        ...(estado === 'regular_sin_final' || estado === 'regular_con_final' ? [{key:'final', label:'Final'}] : []),
                        {key:'definitiva', label:'Nota definitiva'},
                      ].map(campo => (
                        <div key={campo.key} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                          <label style={{fontSize:'0.72rem',color:'var(--text-2)',whiteSpace:'nowrap'}}>{campo.label}</label>
                          <input type="number" min="1" max="10" step="0.5"
                            value={datos[campo.key] || ''}
                            onChange={e => setEstadoMateria(m.codigo, campo.key, e.target.value)}
                            style={{width:'52px',padding:'4px 6px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'0.82rem',textAlign:'center',background:'var(--surface-2)',color:'var(--text-1)'}} />
                        </div>
                      ))}
                    </div>
                  )}
                  {estado === 'libre' && (
                    <div style={{marginTop:'6px',display:'flex',alignItems:'center',gap:'8px',paddingLeft:'8px'}}>
                      <label style={{fontSize:'0.8rem',color:'var(--text-2)'}}>Nota:</label>
                      <input type="number" min="1" max="10" step="0.5" value={datos.nota || ''}
                        onChange={e => setEstadoMateria(m.codigo, 'nota', e.target.value)}
                        style={{width:'65px',padding:'4px 8px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'0.82rem',background:'var(--surface-2)',color:'var(--text-1)'}} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {mensajeHistorial && (
            <div style={{background:mensajeHistorial.startsWith('ok:')?'#e0ffe0':'#ffe0e0',color:mensajeHistorial.startsWith('ok:')?'#1a7a1a':'#c0392b',border:'1px solid '+(mensajeHistorial.startsWith('ok:')?'#2ecc71':'#e74c3c'),borderRadius:'8px',padding:'10px 14px',marginTop:'12px',fontSize:'0.88rem'}}>
              {mensajeHistorial.split(':')[1]}
            </div>
          )}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'16px'}}>
            <button onClick={() => setAnioActual(prev => Math.max(anios[0], prev - 1))} disabled={anioActual === anios[0]}
              style={{padding:'8px 18px',borderRadius:'8px',border:'1px solid var(--border)',cursor:'pointer',background:'var(--surface-2)',color:'var(--text-1)',fontWeight:600,opacity:anioActual===anios[0]?0.4:1}}>
              Año anterior
            </button>
            <button onClick={esUltimoAnio ? guardarHistorial : () => setAnioActual(prev => Math.min(anios[anios.length-1], prev+1))}
              disabled={guardandoHistorial}
              style={{padding:'8px 20px',borderRadius:'8px',border:'none',background:'#2e7d32',color:'white',cursor:'pointer',fontWeight:600}}>
              {esUltimoAnio ? (guardandoHistorial ? 'Guardando...' : 'Guardar historial') : 'Siguiente año'}
            </button>
          </div>
        </div>
      )}

      {tab === 'password' && (
        <div style={{maxWidth:'400px'}}>
          <h3 style={{marginBottom:'16px'}}>Cambiar contraseña</h3>
          {['Contraseña actual','Nueva contraseña','Confirmar nueva contraseña'].map((label, i) => (
            <div key={i} style={{marginBottom:'14px'}}>
              <label style={{display:'block',fontSize:'0.85rem',fontWeight:600,marginBottom:'6px'}}>{label}</label>
              <input type="password" value={[passActual,passNueva,passConfirm][i]}
                onChange={e => [setPassActual,setPassNueva,setPassConfirm][i](e.target.value)}
                style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #ddd',boxSizing:'border-box'}} />
            </div>
          ))}
          {mensajePass && (
            <div style={{background:mensajePass.startsWith('ok:')?'#e0ffe0':'#ffe0e0',color:mensajePass.startsWith('ok:')?'#1a7a1a':'#c0392b',border:'1px solid '+(mensajePass.startsWith('ok:')?'#2ecc71':'#e74c3c'),borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',fontSize:'0.88rem'}}>
              {mensajePass.split(':')[1]}
            </div>
          )}
          <button onClick={cambiarPassword} disabled={guardandoPass}
            style={{padding:'10px 24px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
            {guardandoPass ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </div>
      )}

      {tab === 'baja' && (
        <div style={{maxWidth:'420px'}}>
          <h3 style={{marginBottom:'8px',color:'#c0392b'}}>Dar de baja mi cuenta</h3>
          <p style={{color:'var(--text-2)',fontSize:'0.88rem',marginBottom:'16px'}}>
            Esta accion es irreversible. Se eliminaran todos tus datos de la aplicacion.
          </p>
          {!confirmBaja ? (
            <button onClick={() => setConfirmBaja(true)}
              style={{padding:'10px 24px',background:'#e74c3c',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
              Quiero dar de baja mi cuenta
            </button>
          ) : (
            <div>
              <p style={{color:'#c0392b',fontWeight:600,marginBottom:'12px',fontSize:'0.88rem'}}>
                Ingresa tu contraseña para confirmar la baja:
              </p>
              <input type="password" value={passBaja} onChange={e => setPassBaja(e.target.value)}
                placeholder="Tu contraseña actual"
                style={{width:'100%',padding:'8px',borderRadius:'6px',border:'1px solid #e74c3c',marginBottom:'12px',boxSizing:'border-box'}} />
              {mensajeBaja && (
                <div style={{background:'#ffe0e0',color:'#c0392b',border:'1px solid #e74c3c',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',fontSize:'0.88rem'}}>
                  {mensajeBaja.split(':')[1]}
                </div>
              )}
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={() => {setConfirmBaja(false);setPassBaja('');setMensajeBaja('');}}
                  style={{padding:'8px 18px',background:'var(--surface-2)',color:'var(--text-1)',border:'1px solid var(--border)',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
                  Cancelar
                </button>
                <button onClick={darDeBaja}
                  style={{padding:'8px 18px',background:'#e74c3c',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
                  Confirmar baja
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
