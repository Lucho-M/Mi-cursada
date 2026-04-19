import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./Login";
import FormularioComision from "./componentes/FormularioComision";
import ListaMaterias from "./Materias";
import Navegacion from "./Navegacion";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
    });

    return () => unsubscribe();
  }, []);

  if (!user) {
    return <Login />;
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