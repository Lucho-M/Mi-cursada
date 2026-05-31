import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

import Login from "./Login_POO_front";
import Registro from "./Registro_POO_front";
import Panel from "./Panel";

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column", gap: "16px" }}>
      <div style={{ width: "40px", height: "40px", border: "4px solid #e0e0e0", borderTop: "4px solid #2e7d32", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: "#666", fontSize: "0.9rem" }}>Cargando...</p>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [verificando, setVerificando] = useState(true);
  const [pantalla, setPantalla] = useState("login");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      setUser(usuario);
      if (usuario) {
        try {
          const snap = await getDocs(
            query(collection(db, "usuarios"), where("uid", "==", usuario.uid))
          );
          if (!snap.empty) {
            setPerfil({ uid: usuario.uid, ...snap.docs[0].data() });
          } else {
            setPerfil({ uid: usuario.uid, email: usuario.email, nombre: usuario.email, rol: "alumno" });
          }
        } catch {
          setPerfil({ uid: usuario.uid, email: usuario.email, nombre: usuario.email, rol: "alumno" });
        }
      } else {
        setPerfil(null);
      }
      setVerificando(false);
    });
    return () => unsubscribe();
  }, []);

  if (verificando) return <Spinner />;

  if (!user) {
    return pantalla === "login"
      ? <Login onRegistro={() => setPantalla("registro")} />
      : <Registro
          onLogin={() => setPantalla("login")}
          onRegistroExitoso={(p) => setPerfil({ uid: user?.uid, ...p })}
        />;
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
      <Panel firebaseUser={user} perfil={perfil} />
    </>
  );
}

export default App;
