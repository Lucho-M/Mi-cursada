class Tarea {
  constructor({
    id = null,
    titulo = '',
    descripcion = '',
    estado = 'pendiente', // 'pendiente' | 'en_progreso' | 'terminado'
    prioridad = 'media',  // 'baja' | 'media' | 'alta'
    creadoPor = '',
    creadorNombre = '',
    miembros = [],       // uids con acceso de lectura/escritura (incluye al creador)
    miembrosInfo = [],   // [{ uid, nombre, email }] para mostrar avatares sin otra consulta
    fechaLimite = '',     // 'YYYY-MM-DD', opcional
    fechaCreacion = '',
    archivada = false,
  } = {}) {
    this.id = id;
    this.titulo = titulo;
    this.descripcion = descripcion;
    this.estado = estado;
    this.prioridad = prioridad;
    this.creadoPor = creadoPor;
    this.creadorNombre = creadorNombre;
    this.miembros = miembros;
    this.miembrosInfo = miembrosInfo;
    this.fechaLimite = fechaLimite;
    this.fechaCreacion = fechaCreacion;
    this.archivada = archivada;
  }

  esCreador(uid) {
    return this.creadoPor === uid;
  }

  estaVencida() {
    if (!this.fechaLimite || this.estado === 'terminado') return false;
    return this.fechaLimite < new Date().toISOString().slice(0, 10);
  }

  toFirestore() {
    return {
      titulo: this.titulo,
      descripcion: this.descripcion,
      estado: this.estado,
      prioridad: this.prioridad,
      creadoPor: this.creadoPor,
      creadorNombre: this.creadorNombre,
      miembros: this.miembros,
      miembrosInfo: this.miembrosInfo,
      fechaLimite: this.fechaLimite,
      fechaCreacion: this.fechaCreacion,
      archivada: this.archivada,
    };
  }

  static fromFirestore(id, data) {
    return new Tarea({ id, ...data });
  }
}

export default Tarea;
