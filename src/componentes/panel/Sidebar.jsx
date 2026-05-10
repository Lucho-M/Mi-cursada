import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

const NAV_ALUMNO = [
  { grupo: 'Principal' },
  { seccion: 'panel',       label: 'Panel',        icon: '⊞' },
  { seccion: 'materias',    label: 'Mis materias',  icon: '≡' },
  { seccion: 'horarios',    label: 'Horarios',      icon: '◷' },
  { seccion: 'notas',       label: 'Notas',         icon: '✎' },
  { grupo: 'Planificación' },
  { seccion: 'parciales',   label: 'Parciales',     icon: '📝' },
  { seccion: 'correlativas',label: 'Correlativas',  icon: '🔗' },
  { grupo: 'Cuenta' },
  { seccion: 'config',      label: 'Configuración', icon: '⚙' },
];

const NAV_PROFESOR = [
  { grupo: 'Principal' },
  { seccion: 'panel',       label: 'Panel',         icon: '⊞' },
  { seccion: 'comisiones',  label: 'Mis comisiones',icon: '≡' },
  { seccion: 'alumnos',     label: 'Alumnos',       icon: '👥' },
  { seccion: 'notas',       label: 'Cargar notas',  icon: '✎' },
  { grupo: 'Planificación' },
  { seccion: 'calendario',  label: 'Calendario',    icon: '📅' },
  { grupo: 'Cuenta' },
  { seccion: 'config',      label: 'Configuración', icon: '⚙' },
];

const NAV_ADMIN = [
  { grupo: 'Académico' },
  { seccion: 'panel',       label: 'Panel',             icon: '⊞' },
  { seccion: 'oferta',      label: 'Oferta académica',  icon: '📚' },
  { seccion: 'planes',      label: 'Planes de estudio', icon: '📋' },
  { seccion: 'materias',    label: 'Materias',          icon: '≡' },
  { grupo: 'Usuarios' },
  { seccion: 'docentes',    label: 'Docentes',          icon: '👩‍🏫' },
  { seccion: 'alumnos',     label: 'Alumnos',           icon: '👥' },
  { seccion: 'carreras',    label: 'Carreras',          icon: '🏫' },
  { grupo: 'Cuenta' },
  { seccion: 'config',      label: 'Configuración',     icon: '⚙' },
];

const NAV_POR_ROL = {
  alumno:       NAV_ALUMNO,
  profesor:     NAV_PROFESOR,
  admin_centro: NAV_ADMIN,
  admin:        NAV_ADMIN,
};

function Sidebar({ rol, seccion, setSeccion, perfil }) {
  const nav = NAV_POR_ROL[rol] || NAV_ALUMNO;
  const iniciales = (perfil?.nombre || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const rolLabel = {
    alumno: 'Alumno',
    profesor: 'Profesor',
    admin_centro: 'Centro de Est.',
    admin: 'Administrador',
  }[rol] || 'Usuario';

  return (
    <nav className="sidebar">
      <div className="logo">mi<span>·</span>cursada</div>

      <div className="nav">
        {nav.map((item, i) => {
          if (item.grupo) {
            return <div key={i} className="nav-label">{item.grupo}</div>;
          }
          return (
            <button
              key={item.seccion}
              className={`nav-item${seccion === item.seccion ? ' active' : ''}`}
              onClick={() => setSeccion(item.seccion)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar">{iniciales}</div>
          <div className="user-info">
            <div className="name">{perfil?.nombre || 'Usuario'}</div>
            <div className="sub">{rolLabel}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={() => signOut(auth)}>
          ↩ Cerrar sesión
        </button>
      </div>
    </nav>
  );
}

export default Sidebar;
