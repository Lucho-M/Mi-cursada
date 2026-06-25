class Cronograma {
  constructor({
    id = null, comisionId = '', materiaId = '', materiaNombre = '',
    profesorUid = '', clases = []
  } = {}) {
    this.id = id;
    this.comisionId = comisionId;
    this.materiaId = materiaId;
    this.materiaNombre = materiaNombre;
    this.profesorUid = profesorUid;
    this.clases = clases; // [{ fecha, tema, modalidad, fechaClave, horaEvento?, aulaEvento? }]
  }

  ordenarPorFecha() {
    return [...this.clases].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  toFirestore() {
    return {
      comisionId: this.comisionId,
      materiaId: this.materiaId,
      materiaNombre: this.materiaNombre,
      profesorUid: this.profesorUid,
      clases: this.clases,
    };
  }

  static fromFirestore(id, data) {
    return new Cronograma({ id, ...data });
  }
}

export default Cronograma;
