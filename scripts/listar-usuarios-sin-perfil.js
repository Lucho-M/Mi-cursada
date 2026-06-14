/**
 * Script de un solo uso: lista usuarios de Firebase Auth que no tienen
 * documento en la colección Firestore `usuarios`.
 *
 * REQUISITOS:
 *   1. Node.js >= 18
 *   2. firebase-admin instalado:
 *        npm install firebase-admin --save-dev
 *   3. Service Account descargado desde Firebase Console:
 *        Firebase Console → Configuración del proyecto → Cuentas de servicio
 *        → "Generar nueva clave privada" → guarda el JSON como serviceAccount.json
 *        en la raíz del proyecto (está en .gitignore, no lo subas).
 *
 * USO:
 *   node scripts/listar-usuarios-sin-perfil.js
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../serviceAccount.json");

initializeApp({ credential: cert(serviceAccount) });

const adminAuth = getAuth();
const db = getFirestore();

async function listarSinPerfil() {
  // Traer todos los usuarios de Auth (paginado de a 1000)
  const authUsers = [];
  let pageToken;
  do {
    const result = await adminAuth.listUsers(1000, pageToken);
    authUsers.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);

  console.log(`Total usuarios en Auth: ${authUsers.length}\n`);

  // Verificar cuáles tienen doc en Firestore con ID = uid
  const sinPerfil = [];
  for (const u of authUsers) {
    const snap = await db.collection("usuarios").doc(u.uid).get();
    if (!snap.exists) {
      sinPerfil.push({ uid: u.uid, email: u.email });
    }
  }

  if (sinPerfil.length === 0) {
    console.log("Todos los usuarios tienen perfil en Firestore.");
    return;
  }

  console.log(`Usuarios SIN documento en Firestore (${sinPerfil.length}):`);
  console.log("─".repeat(60));
  sinPerfil.forEach(({ uid, email }) => {
    console.log(`  uid:   ${uid}`);
    console.log(`  email: ${email}`);
    console.log("─".repeat(60));
  });
}

listarSinPerfil().catch(console.error);
