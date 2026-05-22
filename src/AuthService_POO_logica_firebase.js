import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { normalizarDni } from "./utils/normalizarDni";

class AuthService {
  async registrarse(usuario) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      usuario.email,
      usuario.password
    );

    await sendEmailVerification(userCredential.user);

    await addDoc(collection(db, "usuarios"), {
      uid: userCredential.user.uid,
      nombre: usuario.nombre,
      dni: normalizarDni(usuario.dni),
      email: usuario.email,
      carrera: usuario.carrera,
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
    await sendPasswordResetEmail(auth, email);
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
}

export default AuthService;
