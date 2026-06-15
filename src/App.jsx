import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Login from "./Login_POO_front";
import Registro from "./Registro_POO_front";
import Panel from "./Panel";
import Onboarding from "./Onboarding";

function Spinner() {
  return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",flexDirection:"column",gap:"16px"}}>
      <div style={{width:"40px",height:"40px",border:"4px solid #e0e0e0",borderTop:"4px solid #2e7d32",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} />
      <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      <p style={{color:"#666",fontSize:"0.9rem"}}>Cargando...</p>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [verificando, setVerificando] = useState(true);
  const [pantalla, setPantalla] = useState("login");
  const [mostrarOnboarding, setMostrarOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) {
        setUser(null);
        setPerfil(null);
        setMostrarOnboarding(false);
        setVerificando(false);
        return;
      }
      setUser(usuario);
      try {
        const snap = await getDoc(doc(db, "usuarios", usuario.uid));
        if (snap.exists()) {
          const datos = snap.data();
          setPerfil({ uid: usuario.uid, ...datos });
          if (datos.rol === "alumno" && !datos.onboardingCompleto) {
            setMostrarOnboarding(true);
          } else {
            setMostrarOnboarding(false);
          }
        } else {
          setPerfil({ uid: usuario.uid, email: usuario.email, nombre: usuario.email, rol: "alumno" });
          setMostrarOnboarding(true);
        }
      } catch {
        setPerfil({ uid: usuario.uid, email: usuario.email, nombre: usuario.email, rol: "alumno" });
        setMostrarOnboarding(false);
      }
      setVerificando(false);
    });
    return () => unsubscribe();
  }, []);

  const saltearOnboarding = async () => {
    setMostrarOnboarding(false);
    if (perfil?.uid) {
      try {
        await updateDoc(doc(db, "usuarios", perfil.uid), { onboardingSalteado: true });
        setPerfil(prev => ({ ...prev, onboardingSalteado: true }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const completarOnboarding = () => {
    setMostrarOnboarding(false);
    setPerfil(prev => ({ ...prev, onboardingCompleto: true }));
  };

  if (verificando) return <Spinner />;

  if (!user) {
    return pantalla === "login"
      ? <Login onRegistro={() => setPantalla("registro")} />
      : <Registro
          onLogin={() => setPantalla("login")}
        />;
  }

  if (mostrarOnboarding && perfil) {
    return (
      <Onboarding
        perfil={perfil}
        onCompletado={completarOnboarding}
        onSaltear={saltearOnboarding}
      />
    );
  }

  return (
    <>
      {!user.emailVerified && (
        <div style={{background:"#fff3cd",color:"#856404",border:"1px solid #ffc107",padding:"10px 20px",textAlign:"center",fontSize:"0.88rem",fontWeight:500}}>
          Tu email no esta verificado. Revisa tu bandeja de entrada o spam para confirmar tu cuenta.
        </div>
      )}
      {perfil?.onboardingSalteado && !perfil?.onboardingCompleto && (
        <div style={{background:"#e8f4fd",color:"#1565c0",border:"1px solid #90caf9",padding:"10px 20px",textAlign:"center",fontSize:"0.88rem",fontWeight:500}}>
          Tu historial academico esta incompleto. La informacion de correlativas y avance de carrera puede no ser precisa.
          <a onClick={() => setMostrarOnboarding(true)} style={{marginLeft:"12px",cursor:"pointer",fontWeight:700,textDecoration:"underline"}}>
            Completar ahora
          </a>
        </div>
      )}
      <Panel firebaseUser={user} perfil={perfil} />
    </>
  );
}

export default App;
