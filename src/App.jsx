import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import Login from "./Login_POO_front";
import Registro from "./Registro_POO_front";
import Panel from "./Panel";

function App() {
  const [user, setUser] = useState(null);
  const [pantalla, setPantalla] = useState("login");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      setUser(usuario);
    });
    return () => unsubscribe();
  }, []);

  if (!user) {
    return pantalla === "login"
      ? <Login onRegistro={() => setPantalla("registro")} />
      : <Registro onLogin={() => setPantalla("login")} />;
  }

  return (
    <>
      {!user.emailVerified && (
        <div style={{
          background: "#fff3cd",
          color: "#856404",
          border: "1px solid #ffc107",
          padding: "10px 20px",
          textAlign: "center",
          fontSize: "0.88rem",
          fontWeight: 500,
        }}>
          ⚠️ Tu email no esta verificado. Revisa tu bandeja de entrada o spam para confirmar tu cuenta.
        </div>
      )}
      <Panel firebaseUser={user} />
    </>
  );
}

export default App;