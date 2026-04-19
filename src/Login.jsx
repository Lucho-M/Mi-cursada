import { useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";

function Login() {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registrarse = async () => {
    if (!nombre || !dni || !email || !password) {
      alert("Completá todos los campos");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await addDoc(collection(db, "usuarios"), {
        uid: userCredential.user.uid,
        nombre,
        dni,
        email,
        rol: "alumno"
      });

      alert("Usuario creado correctamente ✅");
    } catch (error) {
      alert(error.message);
      console.log(error);
    }
  };

  const login = async () => {
    if (!email || !password) {
      alert("Ingresá email y contraseña");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login correcto 🔥");
    } catch (error) {
      alert("Error al iniciar sesión");
      console.log(error);
    }
  };

  return (
    <div className="login-container">
      <div className="card">
        <h2>Mi Cursada 📚</h2>
        <p>Iniciá sesión o registrate</p>

        <div className="login-form">
          <input
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            placeholder="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />

          <input
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={registrarse}>Registrarse</button>
          <button onClick={login}>Ingresar</button>
        </div>
      </div>
    </div>
  );
}

export default Login;