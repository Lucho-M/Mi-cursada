class Materia {
  constructor({
    id = null, nombre = '', codigo = '', carrera = '',
    anio = 1, cuatrimestre = 1, creditos = 0, correlativas = []
  } = {}) {
    this.id = id;
    this.nombre = nombre;
    this.codigo = codigo;
    this.carrera = carrera;
    this.anio = anio;
    this.cuatrimestre = cuatrimestre;
    this.creditos = creditos;
    this.correlativas = correlativas; // array de ids de materias
  }

  correlativasAprobadas(historial) {
    if (!this.correlativas.length) return true;
    return this.correlativas.every(corrId =>
      historial.some(h => h.materiaId === corrId && Number(h.nota) >= 4)
    );
  }

  toFirestore() {
    return {
      nombre: this.nombre,
      codigo: this.codigo,
      carrera: this.carrera,
      anio: this.anio,
      cuatrimestre: this.cuatrimestre,
      creditos: this.creditos,
      correlativas: this.correlativas,
    };
  }

  static fromFirestore(id, data) {
    return new Materia({ id, ...data });
  }
}

export default Materia;
