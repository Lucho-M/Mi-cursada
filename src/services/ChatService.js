import { db } from '../firebase';
import {
  collection, addDoc, query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import MensajeChat from '../models/MensajeChat';

class ChatService {
  async enviarMensaje({ comisionId, materiaNombre, autorUid, autorNombre, autorRol, texto }) {
    const mensaje = new MensajeChat({ comisionId, materiaNombre, autorUid, autorNombre, autorRol, texto, fecha: serverTimestamp() });
    await addDoc(collection(db, 'mensajesChat'), mensaje.toFirestore());
  }

  // Escucha en tiempo real los mensajes de una comision. Devuelve la
  // funcion para des-suscribirse (llamar al cambiar de comision o desmontar).
  // Ordena del lado del cliente (no en la query) para no depender de un
  // indice compuesto de Firestore sobre comisionId + fecha.
  escucharMensajes(comisionId, callback) {
    const q = query(collection(db, 'mensajesChat'), where('comisionId', '==', comisionId));
    return onSnapshot(q, snap => {
      const mensajes = snap.docs.map(d => MensajeChat.fromFirestore(d.id, d.data()));
      mensajes.sort((a, b) => {
        const ta = a.fecha?.toMillis ? a.fecha.toMillis() : Infinity;
        const tb = b.fecha?.toMillis ? b.fecha.toMillis() : Infinity;
        return ta - tb;
      });
      callback(mensajes);
    }, e => console.error('Error escuchando mensajes:', e));
  }
}

export default ChatService;
