import CARRERAS_DISPONIBLES from "./carrerasData";

class Carreras {
  constructor() {
    this.carreras = CARRERAS_DISPONIBLES.map((nombre, index) => ({
      id: index + 1,
      nombre: nombre
    }));
  }

  obtenerTodas() {
    return this.carreras;
  }

  obtenerPorId(id) {
    return this.carreras.find(carrera => carrera.id === id);
  }

  obtenerPorNombre(nombre) {
    return this.carreras.find(carrera => carrera.nombre === nombre);
  }

  agregarCarrera(nombre) {
    if (this.obtenerPorNombre(nombre)) {
      throw new Error("La carrera ya existe");
    }
    const nuevoId = Math.max(...this.carreras.map(c => c.id)) + 1;
    const nuevaCarrera = { id: nuevoId, nombre };
    this.carreras.push(nuevaCarrera);
    return nuevaCarrera;
  }

  listarCarreras() {
    return this.carreras.map(carrera => carrera.nombre);
  }

  obtenerTotal() {
    return this.carreras.length;
  }
}

export default Carreras;
