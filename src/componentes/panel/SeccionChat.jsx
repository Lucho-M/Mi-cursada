import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import ChatService from '../../services/ChatService';

const chatService = new ChatService();

function iniciales(nombre) {
  return (nombre || '?').trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function horaDe(fecha) {
  if (!fecha?.toDate) return '';
  return fecha.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function SeccionChat({ perfil }) {
  const esProfesor = perfil?.rol === 'profesor';
  const [comisiones, setComisiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [comisionActiva, setComisionActiva] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
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
          const snap = await getDocs(query(collection(db, 'inscripciones'), where('alumnoUid', '==', perfil.uid)));
          const vistos = new Map();
          snap.docs.forEach(d => {
            const data = d.data();
            if (data.comisionId && !vistos.has(data.comisionId)) {
              vistos.set(data.comisionId, { comisionId: data.comisionId, materiaNombre: data.materiaNombre, numero: data.comisionNumero });
            }
          });
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
              <div className="chat-input-row">
                <input type="text" value={texto} onChange={e => setTexto(e.target.value)}
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
