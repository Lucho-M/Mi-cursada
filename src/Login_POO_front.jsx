import { useState } from "react";
import Usuario from "./Usuario_POO_modelo";
import AuthService from "./AuthService_POO_logica_firebase";
import { auth } from "./firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import logoMc from "./assets/logo-micursada.png";
import logoUnab from "./assets/logo-unab.png";
import "./login.css";

function ocultarEmail(email) {
  const [usuario, dominio] = email.split("@");
  const visible = usuario.slice(0, 2);
  return visible + "***@" + dominio;
}

function traducirError(codigo) {
  switch (codigo) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email o contraseña incorrectos.";
    case "auth/invalid-email":
      return "El email ingresado no es valido.";
    case "auth/user-disabled":
      return "Esta cuenta fue deshabilitada. Contacta al administrador.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexion a internet. Verifica tu red e intenta de nuevo.";
    default:
      return "Ocurrio un error al iniciar sesion. Intenta de nuevo.";
  }
}

function LoginPOO({ onRegistro }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [recuperando, setRecuperando] = useState(false);
  const [emailRecupero, setEmailRecupero] = useState("");
  const [mensajeRecupero, setMensajeRecupero] = useState("");

  const authService = new AuthService();

  const login = async () => {
    setError("");
    const usuario = new Usuario(null, null, email, password);
    if (!usuario.esValidoLogin()) {
      setError("Ingresa tu email y contraseña para continuar.");
      return;
    }
    try {
      await authService.login(usuario);
    } catch (err) {
      const codigo = err.code || "";
      setError(traducirError(codigo));
      console.log(err);
    }
  };

  const enviarRecupero = async () => {
    setMensajeRecupero("");
    if (!emailRecupero.trim()) {
      setMensajeRecupero("error:Ingresa tu email para recuperar la contraseña.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, emailRecupero);
      setMensajeRecupero("ok:Te enviamos un email con instrucciones para recuperar tu contraseña. Revisa tu bandeja de entrada.");
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        setMensajeRecupero("error:No encontramos una cuenta con ese email.");
      } else {
        setMensajeRecupero("error:Ocurrio un error. Intenta de nuevo.");
      }
      console.log(err);
    }
  };

  return (
    <div className="auth-shell">
      <div className="form-panel">
        <div className="form-inner">
          {!recuperando && (
            <>
              <img src={logoMc} alt="Mi Cursada" className="logo-micursada" />
              <h2>Iniciar Sesion</h2>
              <p className="subtitle">Ingresa tus datos para continuar</p>
              {error && (
                <div style={{background:"rgba(255,82,82,0.12)",color:"#FF6B6B",border:"1px solid rgba(255,82,82,0.3)",borderRadius:"9px",padding:"11px 14px",marginBottom:"16px",fontSize:"0.88rem",fontWeight:500}}>
                  {error}
                </div>
              )}
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} />
              </div>
              <a className="forgot" onClick={() => { setRecuperando(true); setError(""); setEmailRecupero(email); }}>
                Olvidaste tu contraseña?
              </a>
              <button className="btn-login" onClick={login}>Ingresar</button>
            </>
          )}

          {recuperando && (
            <>
              <h2>Recuperar contraseña</h2>
              <p className="subtitle">Te enviamos un link a tu email para que puedas crear una nueva contraseña.</p>
              {mensajeRecupero && (
                <div style={{
                  background: mensajeRecupero.startsWith("ok:") ? "rgba(0,230,118,0.1)" : "rgba(255,82,82,0.12)",
                  color: mensajeRecupero.startsWith("ok:") ? "#00E676" : "#FF6B6B",
                  border: `1px solid ${mensajeRecupero.startsWith("ok:") ? "rgba(0,230,118,0.3)" : "rgba(255,82,82,0.3)"}`,
                  borderRadius:"9px", padding:"11px 14px", marginBottom:"16px", fontSize:"0.88rem", fontWeight:500
                }}>
                  {mensajeRecupero.split(":")[1]}
                </div>
              )}
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="tu@email.com" value={emailRecupero} onChange={(e) => setEmailRecupero(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviarRecupero()} />
              </div>
              <button className="btn-login" onClick={enviarRecupero}>Enviar email de recuperacion</button>
              <a className="forgot" style={{marginTop:"16px",display:"block"}} onClick={() => { setRecuperando(false); setMensajeRecupero(""); }}>
                ← Volver al login
              </a>
            </>
          )}
        </div>
      </div>

      <div className="green-panel">
        <div className="unab-hero">
          <img src={logoUnab} alt="UNAB" className="logo-unab" />
          <div className="brand-divider" />
          <div className="unab-sistema">Mi Cursada</div>
          <p className="unab-desc">Sistema de Gestion Academica</p>
        </div>
        <div className="register-cta">
          <p>No tenes cuenta?</p>
          <button className="btn-register" onClick={onRegistro}>Registrate</button>
        </div>
      </div>
    </div>
  );
}

export default LoginPOO;
