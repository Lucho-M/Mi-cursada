class ComisionOferta {
  constructor({
    id = null,
    carrera_ref = '', materia_nombre = '', codigo_asignatura = null, comision = '',
    turno = '', dia = '', hora_rango = '', hora_inicio = '', hora_fin = '',
    modalidad = 'presencial', modalidad_detalle = '', sede = '', aula = null,
    cuatrimestre = '1', anio_lectivo = String(new Date().getFullYear()),
  } = {}) {
    this.id = id;
    this.carrera_ref = carrera_ref;
    this.materia_nombre = materia_nombre;
    this.codigo_asignatura = codigo_asignatura;
    this.comision = comision;
    this.turno = turno;
    this.dia = dia;
    this.hora_rango = hora_rango;
    this.hora_inicio = hora_inicio;
    this.hora_fin = hora_fin;
    this.modalidad = modalidad;
    this.modalidad_detalle = modalidad_detalle;
    this.sede = sede;
    this.aula = aula;
    this.cuatrimestre = cuatrimestre;
    this.anio_lectivo = anio_lectivo;
  }

  toFirestore() {
    return {
      carrera_ref: this.carrera_ref,
      materia_nombre: this.materia_nombre,
      codigo_asignatura: this.codigo_asignatura,
      comision: this.comision,
      turno: this.turno,
      dia: this.dia,
      hora_rango: this.hora_rango,
      hora_inicio: this.hora_inicio,
      hora_fin: this.hora_fin,
      modalidad: this.modalidad,
      modalidad_detalle: this.modalidad_detalle,
      sede: this.sede,
      aula: this.aula,
      cuatrimestre: this.cuatrimestre,
      anio_lectivo: this.anio_lectivo,
    };
  }

  static fromFirestore(id, data) {
    return new ComisionOferta({ id, ...data });
  }
}

export default ComisionOferta;
