class Usuario {
  constructor(nombre, dni, email, password, carreras = []) {
    this.nombre = nombre;
    this.dni = dni;
    this.email = email;
    this.password = password;
    this.carreras = Array.isArray(carreras) ? carreras : [carreras].filter(Boolean);
    this.rol = "alumno";
  }

  esValidoRegistro() {
    return this.nombre && this.dni && this.email && this.password && this.carreras.length > 0;
  }

  esValidoLogin() {
    return this.email && this.password;
  }

  obtenerCarreras() {
    return this.carreras;
  }

  agregarCarrera(carrera) {
    if (!this.carreras.includes(carrera)) {
      this.carreras.push(carrera);
    }
  }

  quitarCarrera(carrera) {
    this.carreras = this.carreras.filter((c) => c !== carrera);
  }
}

export default Usuario;