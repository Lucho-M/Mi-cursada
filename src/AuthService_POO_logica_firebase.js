import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";

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
}

export default AuthService;