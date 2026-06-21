class Carrera {
  constructor({
    id = null, nombre = '', tipo = 'Licenciatura', duracionAnios = 4, activa = true
  } = {}) {
    this.id = id;
    this.nombre = nombre;
    this.tipo = tipo;
    this.duracionAnios = duracionAnios;
    this.activa = activa;
  }

  toFirestore() {
    return {
      nombre: this.nombre,
      tipo: this.tipo,
      duracionAnios: this.duracionAnios,
      activa: this.activa,
    };
  }

  static fromFirestore(id, data) {
    return new Carrera({ id, ...data });
  }
}

export default Carrera;
