import Usuario from '../Usuario_POO_modelo';

class Profesor extends Usuario {
  constructor(nombre, dni, email, password, departamento) {
    super(nombre, dni, email, password, departamento);
    this.rol = 'profesor';
    this.comisiones = []; // [{ id, materiaId, materiaNombre, horario, aula, alumnos: [] }]
  }

  asignarComision(comision) {
    if (!this.comisiones.find(c => c.id === comision.id)) {
      this.comisiones.push(comision);
    }
  }

  obtenerAlumnosTotales() {
    return this.comisiones.reduce((total, c) => total + (c.alumnos?.length || 0), 0);
  }

  obtenerMateriasDictadas() {
    return new Set(this.comisiones.map(c => c.materiaId)).size;
  }

  registrarNota(alumnoUid, materiaId, parcial, nota) {
    return { alumnoUid, materiaId, parcial, nota, fecha: new Date().toISOString() };
  }
}

export default Profesor;
