import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Sidebar from './componentes/panel/Sidebar';
import PanelAlumno from './componentes/panel/PanelAlumno';
import PanelProfesor from './componentes/panel/PanelProfesor';
import PanelAdmin from './componentes/panel/PanelAdmin';
import './panel.css';

function Panel({ firebaseUser }) {
  const [perfil, setPerfil] = useState(null);
  const [seccion, setSeccion] = useState('panel');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const fetchPerfil = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'usuarios'), where('uid', '==', firebaseUser.uid))
        );
        if (!snap.empty) {
          setPerfil({ uid: firebaseUser.uid, ...snap.docs[0].data() });
        } else {
          // Si no hay documento en Firestore, usar datos básicos del auth
          setPerfil({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            nombre: firebaseUser.displayName || firebaseUser.email,
            rol: 'alumno',
          });
        }
      } catch (e) {
        console.error('Error al cargar perfil:', e);
        setPerfil({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          nombre: firebaseUser.email,
          rol: 'alumno',
        });
      } finally {
        setCargando(false);
      }
    };
    fetchPerfil();
  }, [firebaseUser]);

  if (cargando) {
    return <div className="panel-loading">Cargando tu panel…</div>;
  }

  const rol = perfil?.rol || 'alumno';

  const PanelPorRol = {
    alumno:       PanelAlumno,
    profesor:     PanelProfesor,
    admin_centro: PanelAdmin,
    admin:        PanelAdmin,
  }[rol] || PanelAlumno;

  return (
    <div className="shell">
      <Sidebar rol={rol} seccion={seccion} setSeccion={setSeccion} perfil={perfil} />
      <div className="main">
        <PanelPorRol perfil={perfil} seccion={seccion} />
      </div>
    </div>
  );
}

export default Panel;
