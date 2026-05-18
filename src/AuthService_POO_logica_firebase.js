import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail
} from "firebase/auth";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

class AuthService {
  async registrarse(usuario) {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      usuario.email,
      usuario.password
    );
    await addDoc(collection(db, "usuarios"), {
      uid: userCredential.user.uid,
      nombre: usuario.nombre,
      dni: usuario.dni,
      email: usuario.email,
      carreras: usuario.carreras,
      rol: usuario.rol
    });
    await sendEmailVerification(userCredential.user);
    return true;
  }

  async login(usuario) {
    await signInWithEmailAndPassword(auth, usuario.email, usuario.password);
    return true;
  }

  async buscarEmailPorDNI(dni) {
    const q = query(collection(db, "usuarios"), where("dni", "==", dni));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const datos = snapshot.docs[0].data();
    return datos.email;
  }

  async enviarRecuperoPorEmail(email) {
    await sendPasswordResetEmail(auth, email);
    return true;
  }
}

export default AuthService;
