import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./Login_POO_front";
import Registro from "./Registro_POO_front";
import FormularioComision from "./componentes/FormularioComision";
import ListaMaterias from "./Materias";
import Navegacion from "./Navegacion";

function App() {
  const [user, setUser] = useState(null);
  const [pantalla, setPantalla] = useState("login"); // "login" o "registro"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
    });

    return () => unsubscribe();
  }, []);

  const irARegistro = () => {
    setPantalla("registro");
  };

  const irALogin = () => {
    setPantalla("login");
  };

  if (!user) {
    return pantalla === "login" ? 
      <Login onRegistro={irARegistro} /> : 
      <Registro onLogin={irALogin} />;
  }

 return (
  <>
    <h1>Mi Cursada</h1>
    <Navegacion />

    {/* 👇 FIRMA */}
    <p className="firma">
      Proyecto de login CRUD - Desarrollo de Software - Lucho Mendieta
    </p>
  </>
);
}

export default App;