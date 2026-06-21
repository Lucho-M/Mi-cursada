/**
 * Script de un solo uso: migra los planes de estudio estaticos de
 * src/data/materias_*.json (uno por carrera) a la coleccion Firestore
 * 'planesEstudio'. A partir de esta migracion, esa coleccion (no los JSON)
 * es la fuente de verdad que usan PanelAlumno, SeccionMaterias,
 * SeccionConfiguracion y Onboarding para correlativas e historial.
 *
 * REQUISITOS:
 *   1. Node.js >= 18
 *   2. firebase-admin instalado (ya esta si corriste migrar-oferta-a-firestore.js)
 *   3. serviceAccount.json en la raiz del proyecto (mismo que el script de oferta)
 *
 * USO:
 *   node scripts/migrar-planes-a-firestore.js
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccount.json");
const carrerasData = require("../src/data/carreras.json");

const ANIO_VIGENCIA = 2026;

const ARCHIVOS_POR_CARRERA = {
  LIC_ADMIN: "materias_lic_admin.json",
  LIC_CDATOS: "materias_lic_cdatos.json",
  LIC_CPOL: "materias_lic_cpol.json",
  LIC_ENFERM: "materias_lic_enferm.json",
  LIC_LOG: "materias_lic_log.json",
  LIC_MAT: "materias_lic_mat.json",
  TEC_AT: "materias_tec_at.json",
  TEC_AUT: "materias_tec_aut.json",
  TEC_CDATOS: "materias_tec_cdatos.json",
  TEC_COMDIG: "materias_tec_comdig.json",
  TEC_DDP: "materias_tec_ddp.json",
  TEC_GORG: "materias_tec_gorg.json",
  TEC_LOG: "materias_tec_log.json",
  TEC_PROG: "materias_tec_prog.json",
  TEC_PROT: "materias_tec_prot.json",
};

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.settings({ preferRest: true });

async function migrar() {
  const coleccion = db.collection("planesEstudio");

  const existentes = await coleccion.limit(1).get();
  if (!existentes.empty) {
    console.log("La coleccion 'planesEstudio' ya tiene datos. Migracion cancelada para evitar duplicados.");
    console.log("Si querés volver a migrar, borrá la coleccion manualmente desde la consola de Firebase primero.");
    return;
  }

  let totalMaterias = 0;
  let totalPlanes = 0;

  for (const [carreraId, archivo] of Object.entries(ARCHIVOS_POR_CARRERA)) {
    const carreraInfo = carrerasData.find(c => c.id === carreraId);
    if (!carreraInfo) {
      console.warn(`Carrera ${carreraId} no encontrada en carreras.json, se omite.`);
      continue;
    }
    const materias = require(`../src/data/${archivo}`);
    const materiasLimpias = materias.map(m => ({
      codigo: m.codigo,
      nombre: m.nombre,
      anio: m.anio,
      cuatrimestre: m.cuatrimestre,
      horas: m.horas,
      correlativas: m.correlativas || { para_cursar: [], para_aprobar: [] },
    }));

    await coleccion.add({
      carrera: carreraInfo.nombre,
      anioVigencia: ANIO_VIGENCIA,
      materias: materiasLimpias,
    });

    totalPlanes++;
    totalMaterias += materiasLimpias.length;
    console.log(`${carreraInfo.nombre}: ${materiasLimpias.length} materias migradas.`);
  }

  console.log(`Migracion completa: ${totalPlanes} planes de estudio, ${totalMaterias} materias en total.`);
}

migrar().catch(console.error);
