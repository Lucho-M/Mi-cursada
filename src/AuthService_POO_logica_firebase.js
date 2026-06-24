import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { normalizarDni } from "./utils/normalizarDni";

const actionCodeSettings = {
  url: window.location.origin,
  handleCodeInApp: false,
};

class AuthService {
  async registrarse(usuario) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      usuario.email,
      usuario.password
    );

    await sendEmailVerification(userCredential.user, actionCodeSettings);

    await setDoc(doc(db, "usuarios", userCredential.user.uid), {
      uid: userCredential.user.uid,
      nombre: usuario.nombre,
      dni: normalizarDni(usuario.dni),
      email: usuario.email,
      carrera: Array.isArray(usuario.carreras) ? (usuario.carreras[0] || "") : (usuario.carreras || ""),
      carreras: usuario.carreras || [],
      rol: usuario.rol
    });

    return true;
  }

  async login(usuario) {
    await signInWithEmailAndPassword(
      auth,
      usuario.email,
      usuario.password
    );

    return true;
  }

  async recuperarPassword(email) {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
    return true;
  }

  async buscarEmailPorDNI(dni) {
    const dniNorm = normalizarDni(dni);
    const snap = await getDocs(
      query(collection(db, "usuarios"), where("dni", "==", dniNorm))
    );
    if (snap.empty) throw new Error("DNI no encontrado");
    return snap.docs[0].data().email;
  }

  // Vuelve a pedir la contraseña actual antes de una accion sensible
  // (editar datos de cuenta, cambiar email, dar de baja).
  async reautenticar(passwordActual) {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordActual);
    await reauthenticateWithCredential(auth.currentUser, credential);
  }

  // No cambia el email todavia: Firebase manda un link al correo nuevo y
  // el cambio se aplica solo cuando el usuario lo confirma desde ahi.
  async actualizarEmail(nuevoEmail) {
    await verifyBeforeUpdateEmail(auth.currentUser, nuevoEmail, actionCodeSettings);
  }
}

export default AuthService;
