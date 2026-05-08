import Usuario from '../Usuario_POO_modelo';

class Alumno extends Usuario {
  constructor(nombre, dni, email, password, carrera) {
    super(nombre, dni, email, password, carrera);
    this.rol = 'alumno';
    this.historialAcademico = []; // [{ materiaId, nota, cuatrimestre, anio }]
  }

  obtenerPromedio() {
    const conNota = this.historialAcademico.filter(h => h.nota !== null && h.nota !== undefined);
    if (!conNota.length) return 0;
    const suma = conNota.reduce((acc, h) => acc + Number(h.nota), 0);
    return (suma / conNota.length).toFixed(1);
  }

  obtenerMateriasAprobadas() {
    return this.historialAcademico.filter(h => Number(h.nota) >= 4);
  }

  puedeInscribirse(materia) {
    if (!materia.correlativas?.length) return true;
    return materia.correlativas.every(corrId =>
      this.historialAcademico.some(h => h.materiaId === corrId && Number(h.nota) >= 4)
    );
  }

  cargarHistorial(historial) {
    this.historialAcademico = historial;
  }
}

export default Alumno;
