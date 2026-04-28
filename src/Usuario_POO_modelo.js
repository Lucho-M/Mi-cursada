class Usuario {
  constructor(nombre, dni, email, password, carrera = null) {
    this.nombre = nombre;
    this.dni = dni;
    this.email = email;
    this.password = password;
    this.carrera = carrera;
    this.rol = "alumno";
  }

  esValidoRegistro() {
    return this.nombre && this.dni && this.email && this.password && this.carrera;
  }

  esValidoLogin() {
    return this.email && this.password;
  }

  obtenerCarrera() {
    return this.carrera;
  }

  asignarCarrera(carrera) {
    this.carrera = carrera;
  }
}

export default Usuario;