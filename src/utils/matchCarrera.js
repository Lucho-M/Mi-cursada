// La oferta usa nombres abreviados o con errores de tipeo ("Tec. en X", "T.U. en X",
// celdas combinadas "Tec. en X, Lic. en Y") mientras que el nombre formal de la carrera
// dice "Tecnicatura en X" / "Licenciatura en X". Se compara por palabras clave del
// nombre formal (sin el prefijo de tipo de titulo) contra el texto crudo de la oferta.

export function normalizarTexto(texto) {
  return (texto || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PREFIJOS_CARRERA = [
  'tecnicatura universitaria en', 'tecnicatura en',
  'licenciatura en', 'ccc licenciatura en ensenanza de',
].sort((a, b) => b.length - a.length);

export function nucleoCarrera(texto) {
  let t = normalizarTexto(texto);
  for (const pre of PREFIJOS_CARRERA) {
    if (t.startsWith(pre + ' ')) { t = t.slice(pre.length).trim(); break; }
  }
  return t;
}

export function carreraEnOferta(carreraRef, nombreCarrera) {
  const ref = normalizarTexto(carreraRef);
  const nucleo = nucleoCarrera(nombreCarrera);
  const palabras = nucleo.split(' ').filter(p => p.length > 3);
  if (palabras.length === 0) return false;
  return palabras.every(p => ref.includes(p));
}
