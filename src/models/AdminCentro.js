import Usuario from '../Usuario_POO_modelo';

const PERMISOS = [
  'importar_oferta',
  'gestionar_planes',
  'gestionar_docentes',
  'gestionar_alumnos',
  'gestionar_carreras',
];

class AdminCentro extends Usuario {
  constructor(nombre, dni, email, password) {
    super(nombre, dni, email, password, null);
    this.rol = 'admin_centro';
  }

  tienePermiso(accion) {
    return PERMISOS.includes(accion);
  }

  obtenerPermisos() {
    return [...PERMISOS];
  }
}

export default AdminCentro;
