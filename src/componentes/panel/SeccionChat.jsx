import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import ChatService from '../../services/ChatService';

const chatService = new ChatService();

function iniciales(nombre) {
  return (nombre || '?').trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function horaDe(fecha) {
  if (!fecha?.toDate) return '';
  return fecha.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

const normTexto = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export default function SeccionChat({ perfil }) {
  const esProfesor = perfil?.rol === 'profesor';
  const [comisiones, setComisiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [comisionActiva, setComisionActiva] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const finRef = useRef(null);

  useEffect(() => {
    if (!perfil?.uid) return;
    const cargar = async () => {
      setCargando(true);
      try {
        if (esProfesor) {
          const snap = await getDocs(query(collection(db, 'comisiones'), where('profesorUid', '==', perfil.uid)));
          setComisiones(snap.docs.map(d => ({
            comisionId: d.id, materiaNombre: d.data().materiaNombre || d.data().materiaId, numero: d.data().numero,
          })));
        } else {
          const [inscSnap, comSnap] = await Promise.all([
            getDocs(query(collection(db, 'inscripciones'), where('alumnoUid', '==', perfil.uid))),
            getDocs(collection(db, 'comisiones')),
          ]);
          const todasComisiones = comSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const vistos = new Map();
          for (const d of inscSnap.docs) {
            const data = d.data();
            if (!data.comisionId) continue;
            // El profesor identifica su comision por el id real del documento
            // en 'comisiones'. Si la inscripcion quedo con un comisionId viejo
            // o desalineado, resolvemos el id canonico por materiaId+numero y
            // reparamos la inscripcion para que vuelva a coincidir.
            // Primero intenta por materiaId (codigo de asignatura); si no matchea
            // (por ejemplo, la oferta tenia el codigo vacio de un lado y no del
            // otro), cae a comparar por nombre de materia + numero de comision,
            // que suele ser idéntico en ambos lados porque viene del mismo dato.
            const canonica = todasComisiones.find(c =>
              c.materiaId === data.materiaId && String(c.numero) === String(data.comisionNumero)
            ) || todasComisiones.find(c =>
              normTexto(c.materiaNombre) === normTexto(data.materiaNombre) && String(c.numero) === String(data.comisionNumero)
            );
            const comisionId = canonica ? canonica.id : data.comisionId;
            const idCorrecto = perfil.uid + '_' + comisionId;
            // No alcanza con corregir el campo comisionId: la regla de Firestore
            // chequea exists() sobre el PATH del documento (uid_comisionId). Si
            // la inscripcion es de antes de ese esquema (id viejo/random), el
            // campo puede estar "bien" pero el documento sigue en otra ruta.
            if (d.id !== idCorrecto) {
              try {
                await setDoc(doc(db, 'inscripciones', idCorrecto), { ...data, comisionId });
                await deleteDoc(doc(db, 'inscripciones', d.id));
              } catch (e) {
                console.error('Error reparando inscripcion para el chat:', e);
              }
            }
            if (!vistos.has(comisionId)) {
              vistos.set(comisionId, { comisionId, materiaNombre: data.materiaNombre, numero: data.comisionNumero });
            }
          }
          setComisiones([...vistos.values()]);
        }
      } catch (e) {
        console.error('Error cargando comisiones del chat:', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [perfil?.uid, esProfesor]);

  useEffect(() => {
    if (!comisionActiva) { setMensajes([]); return; }
    const unsubscribe = chatService.escucharMensajes(comisionActiva.comisionId, setMensajes);
    return () => unsubscribe();
  }, [comisionActiva]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const enviar = async () => {
    if (!texto.trim() || !comisionActiva) return;
    setEnviando(true);
    setErrorEnvio('');
    try {
      await chatService.enviarMensaje({
        comisionId: comisionActiva.comisionId,
        materiaNombre: comisionActiva.materiaNombre,
        autorUid: perfil.uid,
        autorNombre: perfil.nombre || perfil.email || 'Yo',
        autorRol: perfil.rol,
        texto: texto.trim(),
      });
      setTexto('');
    } catch (e) {
      console.error('Error enviando mensaje:', e);
      setErrorEnvio(
        e.code === 'permission-denied'
          ? 'No tenes permiso para escribir en este chat. Probá entrar de nuevo a Chat (esto repara tu inscripción) o avisale al profesor.'
          : 'No se pudo enviar el mensaje. Probá de nuevo.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="content">
      <div className="chat-layout">
        <div className={'chat-list-pane' + (comisionActiva ? ' oculta-mobile' : '')}>
          {cargando ? (
            <div className="empty-state"><p>Cargando...</p></div>
          ) : comisiones.length === 0 ? (
            <div className="empty-state">
              <div className="icon">💬</div>
              <p>{esProfesor ? 'Todavia no tenes comisiones asignadas.' : 'Todavia no estas inscrito en ninguna materia.'}</p>
            </div>
          ) : (
            comisiones.map(c => (
              <div key={c.comisionId}
                className={'chat-list-item' + (comisionActiva?.comisionId === c.comisionId ? ' activo' : '')}
                onClick={() => setComisionActiva(c)}>
                <div className="chat-list-item-nombre">{c.materiaNombre}</div>
                {c.numero && <div className="chat-list-item-sub">Com. {c.numero}</div>}
              </div>
            ))
          )}
        </div>

        <div className={'chat-thread-pane' + (!comisionActiva ? ' oculta-mobile' : '')}>
          {!comisionActiva ? (
            <div className="empty-state">
              <div className="icon">💬</div>
              <p>Selecciona una materia para ver su chat.</p>
            </div>
          ) : (
            <>
              <div className="chat-thread-head">
                <button type="button" className="chat-volver" onClick={() => setComisionActiva(null)}>← Volver</button>
                <div>
                  <div className="chat-thread-titulo">{comisionActiva.materiaNombre}</div>
                  {comisionActiva.numero && <div className="chat-thread-sub">Comision {comisionActiva.numero}</div>}
                </div>
              </div>
              <div className="chat-mensajes">
                {mensajes.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">✉️</div>
                    <p>Todavia no hay mensajes. Escribi el primero.</p>
                  </div>
                ) : (
                  mensajes.map(m => (
                    <div key={m.id} className={'chat-msg' + (m.esDe(perfil.uid) ? ' mio' : '')}>
                      {!m.esDe(perfil.uid) && <span className="chat-msg-avatar">{iniciales(m.autorNombre)}</span>}
                      <div className="chat-msg-bubble">
                        {!m.esDe(perfil.uid) && <div className="chat-msg-autor">{m.autorNombre}</div>}
                        <div className="chat-msg-texto">{m.texto}</div>
                        <div className="chat-msg-hora">{horaDe(m.fecha)}</div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={finRef} />
              </div>
              {errorEnvio && (
                <div style={{padding:'8px 16px',fontSize:'0.78rem',color:'var(--red)',background:'var(--red-dim)',borderTop:'1px solid var(--border)'}}>
                  {errorEnvio}
                </div>
              )}
              <div className="chat-input-row">
                <input type="text" value={texto} onChange={e => { setTexto(e.target.value); setErrorEnvio(''); }}
                  placeholder="Escribi un mensaje..."
                  onKeyDown={e => { if (e.key === 'Enter') enviar(); }} />
                <button className="btn btn-primary" onClick={enviar} disabled={enviando || !texto.trim()}>
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
