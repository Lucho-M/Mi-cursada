/**
 * Script de un solo uso: migra los registros de oferta academica del archivo
 * estatico src/data/oferta_comisiones_2026_1.json a la coleccion Firestore
 * 'comisionesOferta'. A partir de esta migracion, esa coleccion (no el JSON)
 * es la fuente de verdad que usan los alumnos en SeccionMaterias.jsx.
 *
 * REQUISITOS:
 *   1. Node.js >= 18
 *   2. firebase-admin instalado:
 *        npm install firebase-admin --save-dev
 *   3. Service Account descargado desde Firebase Console:
 *        Firebase Console -> Configuracion del proyecto -> Cuentas de servicio
 *        -> "Generar nueva clave privada" -> guardar como serviceAccount.json
 *        en la raiz del proyecto (esta en .gitignore, no se sube).
 *
 * USO:
 *   node scripts/migrar-oferta-a-firestore.js
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccount.json");
const ofertaEstatica = require("../src/data/oferta_comisiones_2026_1.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.settings({ preferRest: true });

async function migrar() {
  const coleccion = db.collection("comisionesOferta");

  const existentes = await coleccion.limit(1).get();
  if (!existentes.empty) {
    console.log("La coleccion 'comisionesOferta' ya tiene datos. Migracion cancelada para evitar duplicados.");
    console.log("Si querés volver a migrar, borrá la coleccion manualmente desde la consola de Firebase primero.");
    return;
  }

  console.log(`Migrando ${ofertaEstatica.length} registros...`);
  let batch = db.batch();
  let contador = 0;

  for (const registro of ofertaEstatica) {
    const ref = coleccion.doc();
    batch.set(ref, registro);
    contador++;
    if (contador % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();

  console.log(`Migracion completa: ${contador} comisiones cargadas en Firestore.`);
}

migrar().catch(console.error);
