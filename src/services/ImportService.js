import { db } from '../firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import Materia from '../models/Materia';
import PlanEstudio from '../models/PlanEstudio';
import ComisionOferta from '../models/ComisionOferta';

function normalizarHeader(h) {
  return h.trim().toLowerCase()
    .replace(/\(.*$/, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

function buscarCampo(item, ...nombres) {
  for (const nombre of nombres) {
    if (item[nombre] !== undefined && item[nombre] !== '') return item[nombre];
  }
  return '';
}

class ImportService {
  // Parser de una linea CSV respetando comillas (campos con comas adentro, ej. nombres de materia)
  _parsearLineaCSV(linea) {
    const valores = [];
    let actual = '';
    let dentroComillas = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (ch === '"') {
        if (dentroComillas && linea[i + 1] === '"') { actual += '"'; i++; }
        else dentroComillas = !dentroComillas;
      } else if (ch === ',' && !dentroComillas) {
        valores.push(actual.trim());
        actual = '';
      } else {
        actual += ch;
      }
    }
    valores.push(actual.trim());
    return valores;
  }

  parsearCSV(texto) {
    const lineas = texto.trim().split('\n').filter(l => l.trim());
    const encabezados = this._parsearLineaCSV(lineas[0]).map(normalizarHeader);
    return lineas.slice(1).map(linea => {
      const valores = this._parsearLineaCSV(linea);
      return encabezados.reduce((obj, header, i) => {
        obj[header] = valores[i] ?? '';
        return obj;
      }, {});
    });
  }

  parsearJSON(texto) {
    const datos = JSON.parse(texto);
    return Array.isArray(datos) ? datos : [datos];
  }

  leerArchivo(archivo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const texto = e.target.result;
        try {
          if (archivo.name.toLowerCase().endsWith('.json')) {
            resolve(this.parsearJSON(texto));
          } else if (archivo.name.toLowerCase().endsWith('.csv')) {
            resolve(this.parsearCSV(texto));
          } else {
            reject(new Error('Formato no soportado. Usá CSV o JSON.'));
          }
        } catch (err) {
          reject(new Error('Error al procesar el archivo: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(archivo, 'UTF-8');
    });
  }

  _parsearHora(rango) {
    const match = String(rango || '').match(/(\d+)\s*a\s*(\d+)/i);
    if (!match) return ['', ''];
    return [match[1], match[2]];
  }

  async _borrarColeccion(nombreColeccion) {
    const snap = await getDocs(collection(db, nombreColeccion));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // Importa la oferta academica real: una fila = una comision (no una materia).
  // Soporta celdas combinadas (carrera/asignatura/codigo en blanco = repetir la ultima
  // fila no vacia), igual que quedan al exportar un Excel con celdas merged a CSV.
  async importarOfertaAcademica(archivo, reemplazarTodo = false) {
    const datos = await this.leerArchivo(archivo);
    if (reemplazarTodo) await this._borrarColeccion('comisionesOferta');
    const colRef = collection(db, 'comisionesOferta');
    let batch = writeBatch(db);
    let enLote = 0;

    let ultimaCarrera = '', ultimaMateria = '', ultimoCodigo = null;
    let cantidad = 0;

    for (const item of datos) {
      const carreraCelda = String(buscarCampo(item, 'carrera')).trim();
      const materiaCelda = String(buscarCampo(item, 'asignatura', 'materia')).trim();
      const codigoCelda = String(buscarCampo(item, 'cod asig', 'codigo', 'codigo_asignatura')).trim();

      if (carreraCelda) ultimaCarrera = carreraCelda;
      if (materiaCelda) ultimaMateria = materiaCelda;
      if (codigoCelda) ultimoCodigo = codigoCelda;

      if (!ultimaCarrera || !ultimaMateria) continue;

      const horaCelda = String(buscarCampo(item, 'hora')).trim();
      const [horaInicio, horaFin] = this._parsearHora(horaCelda);
      const modalidadCelda = String(buscarCampo(item, 'modalidad') || 'presencial').trim().toLowerCase();
      const sedeCelda = String(buscarCampo(item, 'sede')).trim();
      let aulaCelda = String(buscarCampo(item, 'aulas', 'aula')).trim();
      if (!aulaCelda || /^-+$/.test(aulaCelda)) aulaCelda = null;

      const comision = new ComisionOferta({
        carrera_ref: ultimaCarrera,
        materia_nombre: ultimaMateria,
        codigo_asignatura: ultimoCodigo,
        comision: String(buscarCampo(item, 'comision')).trim(),
        turno: String(buscarCampo(item, 'turno')).trim().toLowerCase(),
        dia: String(buscarCampo(item, 'dia')).trim().toLowerCase(),
        hora_rango: horaCelda,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        modalidad: modalidadCelda,
        modalidad_detalle: modalidadCelda,
        sede: sedeCelda,
        aula: aulaCelda,
        cuatrimestre: String(buscarCampo(item, 'cuatrimestre') || '1'),
        anio_lectivo: String(buscarCampo(item, 'anio_lectivo', 'ano lectivo', 'anio', 'ano') || new Date().getFullYear()),
      });

      batch.set(doc(colRef), comision.toFirestore());
      cantidad++;
      enLote++;
      if (enLote >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        enLote = 0;
      }
    }

    if (enLote > 0) await batch.commit();
    return cantidad;
  }

  // Importa el plan de estudio: una fila = una materia del plan (no una lista en
  // una sola celda). Soporta celdas combinadas de CARRERA / AÑO VIGENCIA en blanco
  // (repite la ultima fila no vacia), igual que la oferta academica. Las correlativas
  // van en dos columnas separadas (Cursado / Aprobado), igual que la planilla real,
  // con los codigos de materia separados por coma.
  async importarPlanEstudio(archivo, reemplazarTodo = false) {
    const datos = await this.leerArchivo(archivo);
    if (reemplazarTodo) await this._borrarColeccion('planesEstudio');
    const colRef = collection(db, 'planesEstudio');

    let ultimaCarrera = '', ultimoAnioVigencia = '';
    const planesPorClave = new Map();

    for (const item of datos) {
      const carreraCelda = String(buscarCampo(item, 'carrera')).trim();
      const anioVigenciaCelda = String(buscarCampo(item, 'ano vigencia', 'anio vigencia', 'anio_vigencia', 'aniovigencia')).trim();

      if (carreraCelda) ultimaCarrera = carreraCelda;
      if (anioVigenciaCelda) ultimoAnioVigencia = anioVigenciaCelda;

      const materiaCelda = String(buscarCampo(item, 'espacio curricular', 'materia', 'asignatura', 'nombre')).trim();
      if (!ultimaCarrera || !materiaCelda) continue;

      const codigoCelda = String(buscarCampo(item, 'cod', 'codigo')).trim();
      const anioCelda = String(buscarCampo(item, 'ano', 'anio')).trim();
      const cuatrimestreCelda = String(buscarCampo(item, 'cuatrimestre')).trim();
      const horasCelda = String(buscarCampo(item, 'hs', 'horas')).trim();
      const cursadoCelda = String(buscarCampo(item, 'cursado')).trim();
      const aprobadoCelda = String(buscarCampo(item, 'aprobado')).trim();

      const clave = ultimaCarrera + '|' + ultimoAnioVigencia;
      if (!planesPorClave.has(clave)) {
        planesPorClave.set(clave, {
          carrera: ultimaCarrera,
          anioVigencia: parseInt(ultimoAnioVigencia) || new Date().getFullYear(),
          materias: [],
        });
      }
      planesPorClave.get(clave).materias.push({
        codigo: codigoCelda,
        nombre: materiaCelda,
        anio: parseInt(anioCelda) || 1,
        cuatrimestre: parseInt(cuatrimestreCelda) || 1,
        horas: parseInt(horasCelda) || 0,
        correlativas: {
          para_cursar: cursadoCelda ? cursadoCelda.split(',').map(c => c.trim()).filter(Boolean) : [],
          para_aprobar: aprobadoCelda ? aprobadoCelda.split(',').map(c => c.trim()).filter(Boolean) : [],
        },
      });
    }

    const batch = writeBatch(db);
    let cantidadMaterias = 0;
    for (const datosPlan of planesPorClave.values()) {
      const plan = new PlanEstudio(datosPlan);
      batch.set(doc(colRef), plan.toFirestore());
      cantidadMaterias += datosPlan.materias.length;
    }
    await batch.commit();
    return cantidadMaterias;
  }

  async importarMaterias(archivo) {
    const datos = await this.leerArchivo(archivo);
    const batch = writeBatch(db);
    const colRef = collection(db, 'materias');

    for (const item of datos) {
      const materia = new Materia({
        nombre: item.nombre || '',
        codigo: item.codigo || '',
        carrera: item.carrera || '',
        anio: parseInt(item.anio || item.año || 1),
        cuatrimestre: parseInt(item.cuatrimestre || 1),
        creditos: parseInt(item.creditos || 0),
        correlativas: item.correlativas
          ? item.correlativas.split('|').map(c => c.trim())
          : [],
      });
      batch.set(doc(colRef), materia.toFirestore());
    }

    await batch.commit();
    return datos.length;
  }
}

export default ImportService;
