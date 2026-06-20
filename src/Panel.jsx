import { useState } from 'react';
import Sidebar from './componentes/panel/Sidebar';
import PanelAlumno from './componentes/panel/PanelAlumno';
import PanelProfesor from './componentes/panel/PanelProfesor';
import PanelAdmin from './componentes/panel/PanelAdmin';
import './panel.css';

function Panel({ firebaseUser, perfil }) {
  const [seccion, setSeccion] = useState('panel');

  if (!perfil) return null;

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
        <PanelPorRol perfil={perfil} seccion={seccion} setSeccion={setSeccion} />
      </div>
    </div>
  );
}

export default Panel;
