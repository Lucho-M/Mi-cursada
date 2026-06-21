import { useState, useEffect } from "react";
import Usuario from "./Usuario_POO_modelo";
import AuthService from "./AuthService_POO_logica_firebase";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import CARRERAS_DISPONIBLES from "./carrerasData";
import logoUnab from "./assets/logo-unab.png";
import "./registro_poo.css";

function traducirError(codigo) {
  switch (codigo) {
    case "auth/email-already-in-use":
      return "Este email ya está registrado. Probá iniciar sesión.";
    case "auth/invalid-email":
      return "El email ingresado no es válido.";
    case "auth/weak-password":
      return "La contraseña es muy débil. Usá al menos 6 caracteres.";
    case "auth/network-request-failed":
      return "Sin conexión a internet. Verificá tu red e intentá de nuevo.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";
    default:
      return "Ocurrió un error al registrarse. Intentá de nuevo.";
  }
}
function RegistroPOOFront({ onLogin, onRegistroExitoso }) {
  const [paso, setPaso] = useState(1);
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [carrerasSeleccionadas, setCarrerasSeleccionadas] = useState([]);
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [carreras, setCarreras] = useState(
    CARRERAS_DISPONIBLES.map(c => ({ nombre: c.nombre, tipo: c.tipo }))
  );

  useEffect(() => {
    const cargarCarreras = async () => {
      try {
        const snap = await getDocs(collection(db, "carreras"));
        const activas = snap.docs
          .map(d => d.data())
          .filter(c => c.activa !== false);
        if (activas.length > 0) setCarreras(activas);
      } catch (e) {
        console.error("Error cargando carreras, se usa el listado local:", e);
      }
    };
    cargarCarreras();
  }, []);

  const authService = new AuthService();

  const toggleCarrera = (nombreCarrera) => {
    setCarrerasSeleccionadas((prev) =>
      prev.includes(nombreCarrera)
        ? prev.filter((c) => c !== nombreCarrera)
        : [...prev, nombreCarrera]
    );
  };

  const validarPaso1 = () => {
    return dni.trim() !== "" && nombre.trim() !== "" && carrerasSeleccionadas.length > 0;
  };

  const validarPaso2 = () => {
    return (
      email.trim() !== "" &&
      email === confirmEmail &&
      password.trim() !== "" &&
      password === confirmPassword &&
      password.length >= 6
    );
  };

  const siguiente = () => {
    if (paso === 1 && !validarPaso1()) {
      setError("Completá todos los campos y seleccioná al menos una carrera.");
      return;
    }
    setError("");
    setPaso(2);
  };

  const anterior = () => {
    setError("");
    if (paso === 2) setPaso(1);
  };

  const registrarse = async () => {
    if (!validarPaso2()) {
      if (email !== confirmEmail) {
        setError("Los emails no coinciden.");
      } else if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
      } else if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else {
        setError("Completá todos los campos antes de registrarte.");
      }
      return;
    }

    try {
      setError("");
      const usuario = new Usuario(nombre, dni, email, password, carrerasSeleccionadas);

      if (!usuario.esValidoRegistro()) {
        setError("Por favor completá todos los campos correctamente.");
        return;
      }

      await authService.registrarse(usuario);
      onRegistroExitoso?.({ nombre, dni, email, carreras: carrerasSeleccionadas, rol: "alumno" });
      alert("¡Registro exitoso! Revisá tu casilla de email para verificar tu cuenta.");
      setPaso(1);
      setDni("");
      setNombre("");
      setCarrerasSeleccionadas([]);
      setEmail("");
      setConfirmEmail("");
      setPassword("");
      setConfirmPassword("");
      if (onLogin) onLogin();
    } catch (err) {
      const codigo = err.code || "";
      setError(traducirError(codigo));
      console.log(err);
    }
  };
  return (
    <div className="registro-shell">
      <div className="green-panel-registro">
        <h2>Crear Cuenta</h2>
        <p>Completá tus datos para registrarte</p>

        {error && (
          <div style={{background:"#ffe0e0",color:"#c0392b",border:"1px solid #e74c3c",borderRadius:"8px",padding:"10px 14px",marginBottom:"12px",fontSize:"0.88rem",fontWeight:500}}>
            ⚠️ {error}
          </div>
        )}

        {paso === 1 && (
          <div className="form-step">
            <div className="field">
              <label>DNI</label>
              <input
                type="text"
                placeholder="Ingresá tu DNI"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </div>

            <div className="field">
              <label>NOMBRE COMPLETO</label>
              <input
                type="text"
                placeholder="Ingresá tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="field">
              <label>CARRERA/S QUE CURSÁS</label>
              <p style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.8)",margin:"2px 0 8px"}}>
                Podés seleccionar más de una si cursás simultáneamente.
              </p>
              <div style={{maxHeight:"180px",overflowY:"auto",border:"1.5px solid rgba(255,255,255,0.4)",borderRadius:"8px",padding:"8px",background:"rgba(255,255,255,0.95)"}}>
                {carreras.map((carr) => (
                  <label
                    key={carr.nombre}
                    style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 4px",cursor:"pointer",fontSize:"0.85rem",borderBottom:"1px solid #e8e8e8",color:"#1a3a2a"}}
                  >
                    <input
                      type="checkbox"
                      checked={carrerasSeleccionadas.includes(carr.nombre)}
                      onChange={() => toggleCarrera(carr.nombre)}
                      style={{accentColor:"#148f65",width:"16px",height:"16px"}}
                    />
                    {carr.nombre}
                  </label>
                ))}
              </div>
              {carrerasSeleccionadas.length > 0 && (
                <p style={{fontSize:"0.8rem",color:"rgba(255,255,255,0.95)",fontWeight:600,marginTop:"6px"}}>
                  ✅ {carrerasSeleccionadas.length} carrera{carrerasSeleccionadas.length > 1 ? "s" : ""} seleccionada{carrerasSeleccionadas.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="form-step">
            <div className="field">
              <label>EMAIL</label>
              <input
                type="email"
                placeholder="Ingresá tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label>CONFIRMAR EMAIL</label>
              <input
                type="email"
                placeholder="Repetí tu email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label>CONTRASEÑA</label>
              <input
                type="password"
                placeholder="Ingresá tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="field">
              <label>CONFIRMAR CONTRASEÑA</label>
              <input
                type="password"
                placeholder="Confirma tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="button-group">
          {paso === 2 && (
            <button className="btn-continuar" onClick={anterior}>Atrás</button>
          )}
          {paso === 1 ? (
            <button className="btn-continuar" onClick={siguiente}>Continuar</button>
          ) : (
            <button className="btn-continuar btn-registrarse" onClick={registrarse}>Registrarse</button>
          )}
        </div>

        <div className="progress-dots">
          {[1, 2].map((numero) => (
            <div key={numero} className={`dot ${paso === numero ? "active" : ""}`}></div>
          ))}
        </div>
      </div>
      <div className="welcome-panel">
        <div className="brand-welcome">
          <img src={logoUnab} alt="UNAB" className="logo-unab-registro" />
        </div>

        <h3>¡Bienvenido!</h3>
        <p>¿Ya tenés una cuenta? Iniciá sesión para continuar o completá el formulario para registrarte.</p>

        <div style={{display:"flex",flexDirection:"column",gap:"10px",width:"100%",marginBottom:"16px"}}>
          <button className="btn-login-desde-registro" onClick={onLogin} style={{marginBottom:"0"}}>
            Iniciar sesión
          </button>
          <button
            onClick={() => { if (paso === 1) { siguiente(); } else { registrarse(); } }}
            style={{width:"100%",padding:"12px",background:"var(--primary-light)",color:"var(--primary-dark)",border:"1.5px solid var(--border)",borderRadius:"8px",fontFamily:'"DM Sans", sans-serif',fontSize:"0.9rem",fontWeight:600,cursor:"pointer",transition:"background 0.15s"}}
          >
            Siguiente Paso
          </button>
        </div>

        <p className="message-registro">Completá el formulario para continuar</p>
      </div>
    </div>
  );
}

export default RegistroPOOFront;