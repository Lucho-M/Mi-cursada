import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  getDocs, query, where,
} from 'firebase/firestore';
import Tarea from '../models/Tarea';

class TareaService {
  // Tareas donde el usuario es creador o fue invitado como miembro
  async obtenerTareas(uid) {
    const snap = await getDocs(
      query(collection(db, 'tareas'), where('miembros', 'array-contains', uid))
    );
    return snap.docs.map(d => Tarea.fromFirestore(d.id, d.data()));
  }

  async crearTarea({ titulo, descripcion, prioridad, fechaLimite, creadoPor, creadorNombre, miembrosInfo }) {
    const miembros = [creadoPor, ...miembrosInfo.map(m => m.uid)];
    const tarea = new Tarea({
      titulo, descripcion, prioridad,
      fechaLimite: fechaLimite || '',
      estado: 'pendiente',
      creadoPor, creadorNombre,
      miembros: [...new Set(miembros)],
      miembrosInfo: [{ uid: creadoPor, nombre: creadorNombre }, ...miembrosInfo],
      fechaCreacion: new Date().toISOString().slice(0, 10),
    });
    const docRef = await addDoc(collection(db, 'tareas'), tarea.toFirestore());
    tarea.id = docRef.id;
    return tarea;
  }

  async actualizarTarea(id, cambios) {
    await updateDoc(doc(db, 'tareas', id), cambios);
  }

  async actualizarEstado(id, estado) {
    await updateDoc(doc(db, 'tareas', id), { estado });
  }

  async eliminarTarea(id) {
    await deleteDoc(doc(db, 'tareas', id));
  }

  // Busca usuarios registrados por nombre o email (para invitar compañeros)
  async buscarUsuarios(texto) {
    const snap = await getDocs(collection(db, 'usuarios'));
    const t = texto.trim().toLowerCase();
    if (!t) return [];
    return snap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(u => (u.nombre || '').toLowerCase().includes(t) || (u.email || '').toLowerCase().includes(t));
  }
}

export default TareaService;
