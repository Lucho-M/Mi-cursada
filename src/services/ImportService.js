import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import Materia from '../models/Materia';
import PlanEstudio from '../models/PlanEstudio';
import OfertaAcademica from '../models/OfertaAcademica';

class ImportService {
  parsearCSV(texto) {
    const lineas = texto.trim().split('\n').filter(l => l.trim());
    const encabezados = lineas[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lineas.slice(1).map(linea => {
      const valores = linea.split(',').map(v => v.trim().replace(/"/g, ''));
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

  async importarOfertaAcademica(archivo) {
    const datos = await this.leerArchivo(archivo);
    const batch = writeBatch(db);
    const colRef = collection(db, 'ofertaAcademica');

    for (const item of datos) {
      const oferta = new OfertaAcademica({
        carrera: item.carrera || '',
        anio: parseInt(item.anio || item.año || new Date().getFullYear()),
        cuatrimestre: parseInt(item.cuatrimestre || 1),
        materias: typeof item.materias === 'string'
          ? item.materias.split('|').map(m => ({ nombre: m.trim(), comisiones: [] }))
          : (item.materias || []),
        fechaInicio: item.fechaInicio || item.fecha_inicio || '',
        fechaFin: item.fechaFin || item.fecha_fin || '',
      });
      batch.set(doc(colRef), oferta.toFirestore());
    }

    await batch.commit();
    return datos.length;
  }

  async importarPlanEstudio(archivo) {
    const datos = await this.leerArchivo(archivo);
    const batch = writeBatch(db);
    const colRef = collection(db, 'planesEstudio');

    for (const item of datos) {
      const plan = new PlanEstudio({
        carrera: item.carrera || '',
        anioVigencia: parseInt(item.anioVigencia || item.anio_vigencia || new Date().getFullYear()),
        materias: typeof item.materias === 'string'
          ? item.materias.split('|').map((m, i) => ({
              nombre: m.trim(),
              anio: parseInt(item.anio_materia || 1),
              cuatrimestre: 1,
              creditos: 0,
              correlativas: [],
            }))
          : (item.materias || []),
      });
      batch.set(doc(colRef), plan.toFirestore());
    }

    await batch.commit();
    return datos.length;
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
