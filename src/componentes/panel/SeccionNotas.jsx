import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';

// Las claves de parcial deben coincidir exactamente con las que usa el
// profesor en PanelProfesor.jsx (misma coleccion 'notas', mismo docId
// alumnoUid_materiaId_parcial) para que el alumno vea la nota que carga
// el profesor en vez de un duplicado desconectado.
const PARCIALES = [
  { key: '1',    label: 'Parcial 1' },
  { key: 'rec1', label: 'Recup. P1' },
  { key: '2',    label: 'Parcial 2' },
  { key: 'rec2', label: 'Recup. P2' },
  { key: 'final1', label: 'Final' },
];

function calcularEstado(notas) {
  const get = (key) => {
    const n = notas.find(n => n.parcial === key);
    return n && n.nota !== null && n.nota !== undefined ? Number(n.nota) : null;
  };
  const p1 = get('rec1') !== null ? get('rec1') : get('1');
  const p2 = get('rec2') !== null ? get('rec2') : get('2');
  const final = get('final1');

  if (p1 !== null && p2 !== null) {
    const prom = (p1 + p2) / 2;
    if (p1 >= 6 && p2 >= 6 && prom >= 6.5) return 'promocionado';
    if (p1 >= 4 && p2 >= 4) {
      if (final !== null && final >= 4) return 'regular_con_final';
      return 'regular_sin_final';
    }
    return 'libre';
  }
  return 'cursando';
}

function estadoLabel(estado) {
  const map = {
    'cursando': { label: 'Cursando', color: '#856404', bg: '#fff3cd' },
    'regular_sin_final': { label: 'Regular s/final', color: '#1565c0', bg: '#e3f2fd' },
    'regular_con_final': { label: 'Regular c/final', color: '#1a7a1a', bg: '#e0ffe0' },
    'promocionado': { label: 'Promocionado', color: '#1a5c8a', bg: '#e0f0ff' },
    'libre': { label: 'Libre', color: '#c0392b', bg: '#ffe0e0' },
  };
  const conf = map[estado] || map['cursando'];
  return <span style={{padding:'3px 10px',borderRadius:'12px',fontSize:'0.78rem',fontWeight:600,background:conf.bg,color:conf.color}}>{conf.label}</span>;
}

export default function SeccionNotas({ perfil }) {
  const [inscripciones, setInscripciones] = useState([]);
  const [notas, setNotas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!perfil?.uid) return;
    const cargar = async () => {
      setCargando(true);
      try {
        const inscSnap = await getDocs(
          query(collection(db, 'inscripciones'), where('alumnoUid', '==', perfil.uid))
        );
        const inscData = inscSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setInscripciones(inscData);

        const notasMap = {};
        for (const insc of inscData) {
          const nSnap = await getDocs(
            query(collection(db, 'notas'),
              where('alumnoUid', '==', perfil.uid),
              where('materiaId', '==', insc.materiaId))
          );
          notasMap[insc.materiaId] = nSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        setNotas(notasMap);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [perfil?.uid]);

  const actualizarNota = (materiaId, parcial, valor) => {
    setNotas(prev => {
      const lista = [...(prev[materiaId] || [])];
      const idx = lista.findIndex(n => n.parcial === parcial);
      const val = valor === '' ? null : Number(valor);
      if (val === null) {
        if (idx >= 0) lista.splice(idx, 1);
      } else {
        if (idx >= 0) lista[idx] = { ...lista[idx], nota: val };
        else lista.push({ parcial, nota: val, alumnoUid: perfil.uid, materiaId });
      }
      return { ...prev, [materiaId]: lista };
    });
  };

  const guardarNotas = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      for (const [materiaId, notasList] of Object.entries(notas)) {
        for (const nota of notasList) {
          if (nota.nota === null || nota.nota === undefined) continue;
          const docId = perfil.uid + '_' + materiaId + '_' + nota.parcial;
          await setDoc(doc(db, 'notas', docId), {
            alumnoUid: perfil.uid,
            materiaId,
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

  const finalizarCursada = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      const batch = writeBatch(db);
      for (const insc of inscripciones) {
        const notasList = notas[insc.materiaId] || [];
        const estado = calcularEstado(notasList);
        const docId = perfil.uid + '_' + insc.materiaId + '_historial';
        const notaFinal = notasList.find(n => n.parcial === 'final1');
        batch.set(doc(db, 'notas', docId), {
          alumnoUid: perfil.uid,
          materiaId: insc.materiaId,
          tipo: 'historial',
          estado,
          nota: notaFinal?.nota || null,
          p1: notasList.find(n => n.parcial === '1')?.nota || null,
          rec1: notasList.find(n => n.parcial === 'rec1')?.nota || null,
          p2: notasList.find(n => n.parcial === '2')?.nota || null,
          rec2: notasList.find(n => n.parcial === 'rec2')?.nota || null,
          final: notaFinal?.nota || null,
        });
      }
      await batch.commit();
      setMensaje('ok:Cursada finalizada. Los datos se guardaron en tu historial.');
    } catch (e) {
      setMensaje('error:Error al finalizar. Intenta de nuevo.');
      console.error(e);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="empty-state"><p>Cargando notas...</p></div>;

  if (inscripciones.length === 0) return (
    <div className="empty-state">
      <div className="icon">✎</div>
      <p>No tenes materias inscriptas este cuatrimestre.</p>
    </div>
  );

  return (
    <div>
      {mensaje && (
        <div style={{background:mensaje.startsWith('ok:')?'#e0ffe0':'#ffe0e0',color:mensaje.startsWith('ok:')?'#1a7a1a':'#c0392b',border:'1px solid '+(mensaje.startsWith('ok:')?'#2ecc71':'#e74c3c'),borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'0.88rem'}}>
          {mensaje.split(':')[1]}
        </div>
      )}
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
          <thead>
            <tr style={{background:'var(--off-white)'}}>
              <th style={{padding:'10px 12px',textAlign:'left',fontWeight:600,minWidth:'160px',color:'var(--text-2)'}}>Materia</th>
              {PARCIALES.map(p => (
                <th key={p.key} style={{padding:'10px 8px',textAlign:'center',fontWeight:600,whiteSpace:'nowrap',color:'var(--text-2)'}}>{p.label}</th>
              ))}
              <th style={{padding:'10px 12px',textAlign:'center',fontWeight:600,color:'var(--text-2)'}}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {inscripciones.map(insc => {
              const notasList = notas[insc.materiaId] || [];
              const estado = calcularEstado(notasList);
              return (
                <tr key={insc.id} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'10px 12px'}}>
                    <div style={{fontWeight:600,color:'var(--text-1)'}}>{insc.materiaNombre || insc.materiaId}</div>
                  </td>
                  {PARCIALES.map(p => {
                    const notaObj = notasList.find(n => n.parcial === p.key);
                    return (
                      <td key={p.key} style={{padding:'6px 8px',textAlign:'center'}}>
                        <input
                          type="number" min="1" max="10" step="0.5"
                          value={notaObj?.nota ?? ''}
                          onChange={e => actualizarNota(insc.materiaId, p.key, e.target.value)}
                          style={{width:'52px',padding:'4px 6px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'0.82rem',textAlign:'center',background:'var(--surface)',color:'var(--text-1)'}}
                        />
                      </td>
                    );
                  })}
                  <td style={{padding:'10px 12px',textAlign:'center'}}>
                    {estadoLabel(estado)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:'10px',marginTop:'16px'}}>
        <button onClick={guardarNotas} disabled={guardando}
          style={{padding:'10px 20px',background:'var(--surface)',color:'var(--text-1)',border:'1px solid var(--border)',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
          {guardando ? 'Guardando...' : 'Guardar notas'}
        </button>
        <button onClick={finalizarCursada} disabled={guardando}
          style={{padding:'10px 20px',background:'#2e7d32',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:600}}>
          Finalizar cursada
        </button>
      </div>
    </div>
  );
}
