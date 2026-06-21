// Genera un identificador estable a partir de texto libre (nombre de materia,
// codigo de asignatura, numero de comision) para usar como parte de un doc id
// de Firestore. Debe coincidir exactamente entre quien crea el doc (profesor
// al anotarse en una comision) y quien lo referencia (alumno al inscribirse).
export function slugTexto(texto) {
  return (texto || '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
