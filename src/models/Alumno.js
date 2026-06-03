import Usuario from '../Usuario_POO_modelo';

class Alumno extends Usuario {
  constructor(nombre, dni, email, password, carrera) {
    super(nombre, dni, email, password, carrera);
    this.rol = 'alumno';
    this.historialAcademico = [];
  }

  cargarHistorial(historial) {
    this.historialAcademico = historial;
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

  calcularEstadoMateria(notas) {
    const p1    = notas.find(n => n.parcial === '1');
    const r1    = notas.find(n => n.parcial === 'rec1');
    const p2    = notas.find(n => n.parcial === '2');
    const r2    = notas.find(n => n.parcial === 'rec2');
    const f1    = notas.find(n => n.parcial === 'final1');
    const f2    = notas.find(n => n.parcial === 'final2');
    const f3    = notas.find(n => n.parcial === 'final3');
    const libre = notas.find(n => n.parcial === 'libre');
    const equiv = notas.find(n => n.parcial === 'equivalencia');

    if (equiv) return 'Aprobada por equivalencia';
    if (libre && Number(libre.nota) >= 4) return 'Aprobada libre';

    const notaP1 = r1 ? Number(r1.nota) : (p1 ? Number(p1.nota) : null);
    const notaP2 = r2 ? Number(r2.nota) : (p2 ? Number(p2.nota) : null);

    if (notaP1 !== null && notaP2 !== null) {
      const promedio = (notaP1 + notaP2) / 2;
      if (notaP1 >= 6 && notaP2 >= 6 && promedio >= 6.5) return 'Promocionada';
      if (notaP1 >= 4 && notaP2 >= 4) {
        if (f1 && Number(f1.nota) >= 4) return 'Aprobada regular';
        if (f2 && Number(f2.nota) >= 4) return 'Aprobada regular';
        if (f3 && Number(f3.nota) >= 4) return 'Aprobada regular';
        const finalesRendidos = [f1, f2, f3].filter(Boolean).length;
        if (finalesRendidos >= 3) return 'Perdio regularidad';
        return 'Regular';
      }
      return 'Libre';
    }

    return 'Cursando';
  }
}

export default Alumno;
