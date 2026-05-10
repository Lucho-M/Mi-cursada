class PlanEstudio {
  constructor({
    id = null, carrera = '',
    anioVigencia = new Date().getFullYear(), materias = []
  } = {}) {
    this.id = id;
    this.carrera = carrera;
    this.anioVigencia = anioVigencia;
    this.materias = materias; // [{ nombre, anio, cuatrimestre, creditos, correlativas }]
  }

  obtenerMateriasPorAnio(anio) {
    return this.materias.filter(m => Number(m.anio) === Number(anio));
  }

  obtenerDuracion() {
    if (!this.materias.length) return 0;
    return Math.max(...this.materias.map(m => Number(m.anio || 0)));
  }

  obtenerTotalCreditos() {
    return this.materias.reduce((total, m) => total + Number(m.creditos || 0), 0);
  }

  toFirestore() {
    return {
      carrera: this.carrera,
      anioVigencia: this.anioVigencia,
      materias: this.materias,
    };
  }

  static fromFirestore(id, data) {
    return new PlanEstudio({ id, ...data });
  }
}

export default PlanEstudio;
