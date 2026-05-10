import CARRERAS_DISPONIBLES from "./carrerasData";

class Carreras {
  constructor() {
    this.carreras = CARRERAS_DISPONIBLES;
  }

  obtenerTodas() {
    return this.carreras;
  }

  obtenerPorId(id) {
    return this.carreras.find((c) => c.id === id) || null;
  }

  obtenerPorNombre(nombre) {
    return this.carreras.find((c) => c.nombre === nombre) || null;
  }

  obtenerLicenciaturas() {
    return this.carreras.filter((c) => c.tipo === "Licenciatura");
  }

  obtenerTecnicaturas() {
    return this.carreras.filter((c) => c.tipo === "Tecnicatura");
  }

  listarNombres() {
    return this.carreras.map((c) => c.nombre);
  }

  obtenerTotal() {
    return this.carreras.length;
  }
}

export default Carreras;