class OfertaAcademica {
  constructor({
    id = null, carrera = '',
    anio = new Date().getFullYear(), cuatrimestre = 1,
    materias = [], fechaInicio = '', fechaFin = ''
  } = {}) {
    this.id = id;
    this.carrera = carrera;
    this.anio = anio;
    this.cuatrimestre = cuatrimestre;
    this.materias = materias; // [{ nombre, comisiones: [{ docente, horario, aula, modalidad }] }]
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
  }

  agregarMateria(materia) {
    if (!this.materias.find(m => m.nombre === materia.nombre)) {
      this.materias.push(materia);
    }
  }

  obtenerCantidadMaterias() {
    return this.materias.length;
  }

  toFirestore() {
    return {
      carrera: this.carrera,
      anio: this.anio,
      cuatrimestre: this.cuatrimestre,
      materias: this.materias,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
    };
  }

  static fromFirestore(id, data) {
    return new OfertaAcademica({ id, ...data });
  }
}

export default OfertaAcademica;
