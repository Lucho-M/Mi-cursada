import { useState } from "react";
import Usuario from "./Usuario_POO_modelo";
import AuthService from "./AuthService_POO_logica_firebase";
import { auth } from "./firebase";
import { sendPasswordResetEmail } from "firebase/auth";
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
      return "Email o contrasena incorrectos.";
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
  const [recuperandoPorDNI, setRecuperandoPorDNI] = useState(false);
  const [emailRecupero, setEmailRecupero] = useState("");
  const [mensajeRecupero, setMensajeRecupero] = useState("");
  const [dni, setDni] = useState("");
  const [emailEncontrado, setEmailEncontrado] = useState("");
  const [mensajeDNI, setMensajeDNI] = useState("");

  const authService = new AuthService();

  const login = async () => {
    setError("");
    const usuario = new Usuario(null, null, email, password);
    if (!usuario.esValidoLogin()) {
      setError("Ingresa tu email y contrasena para continuar.");
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
      setMensajeRecupero("error:Ingresa tu email para recuperar la contrasena.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, emailRecupero);
      setMensajeRecupero("ok:Te enviamos un email con instrucciones para recuperar tu contrasena. Revisa tu bandeja de entrada.");
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-email") {
        setMensajeRecupero("error:No encontramos una cuenta con ese email.");
      } else {
        setMensajeRecupero("error:Ocurrio un error. Intenta de nuevo.");
      }
      console.log(err);
    }
  };

  const buscarPorDNI = async () => {
    setMensajeDNI("");
    setEmailEncontrado("");
    if (!dni.trim()) {
      setMensajeDNI("error:Ingresa tu DNI para continuar.");
      return;
    }
    try {
      const emailResult = await authService.buscarEmailPorDNI(dni);
      if (!emailResult) {
        setMensajeDNI("error:No encontramos una cuenta con ese DNI.");
        return;
      }
      setEmailEncontrado(emailResult);
      setMensajeDNI("ok:Encontramos tu cuenta.");
    } catch (err) {
      setMensajeDNI("error:Ocurrio un error. Intenta de nuevo.");
      console.log(err);
    }
  };

  const enviarRecuperoPorDNI = async () => {
    try {
      await authService.enviarRecuperoPorEmail(emailEncontrado);
      setMensajeDNI("ok:Te enviamos el email de recuperacion a " + ocultarEmail(emailEncontrado));
      setEmailEncontrado("");
    } catch (err) {
      setMensajeDNI("error:Ocurrio un error al enviar el email. Intenta de nuevo.");
      console.log(err);
    }
  };

  return (
    <div className="auth-shell">
      <div className="form-panel">
        <div className="brand">
          <div className="brand-name">Mi Cursada</div>
          <div className="brand-logo">
            unab
            <span>Universidad Nacional<br />Guillermo Brown</span>
          </div>
        </div>

        {!recuperando && !recuperandoPorDNI && (
          <>
            <h2>Iniciar Sesion</h2>
            <p className="subtitle">Ingresa tus datos para continuar</p>
            {error && (
              <div style={{background:"#ffe0e0",color:"#c0392b",border:"1px solid #e74c3c",borderRadius:"8px",padding:"10px 14px",marginBottom:"12px",fontSize:"0.88rem",fontWeight:500}}>
                {error}
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="Ingresa tu email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Contrasena</label>
              <input type="password" placeholder="Ingresa tu contrasena" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <a className="forgot" style={{cursor:"pointer"}} onClick={() => { setRecuperando(true); setError(""); setEmailRecupero(email); }}>
              Olvidaste tu contrasena?
            </a>
            <button className="btn-login" onClick={login}>Ingresar</button>
          </>
        )}

        {recuperando && !recuperandoPorDNI && (
          <>
            <h2>Recuperar contrasena</h2>
            <p className="subtitle">Te enviamos un link a tu email para que puedas crear una nueva contrasena.</p>
            {mensajeRecupero && (
              <div style={{background:mensajeRecupero.startsWith("ok:")?"#e0ffe0":"#ffe0e0",color:mensajeRecupero.startsWith("ok:")?"#1a7a1a":"#c0392b",border:"1px solid " + (mensajeRecupero.startsWith("ok:")?"#2ecc71":"#e74c3c"),borderRadius:"8px",padding:"10px 14px",marginBottom:"12px",fontSize:"0.88rem",fontWeight:500}}>
                {mensajeRecupero.split(":")[1]}
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="Ingresa tu email" value={emailRecupero} onChange={(e) => setEmailRecupero(e.target.value)} />
            </div>
            <button className="btn-login" onClick={enviarRecupero}>Enviar email de recuperacion</button>
            <a className="forgot" style={{cursor:"pointer",marginTop:"8px",display:"block"}} onClick={() => { setRecuperandoPorDNI(true); setRecuperando(false); setMensajeRecupero(""); }}>
              No tenes acceso a tu email? Recupera por DNI
            </a>
            <a className="forgot" style={{cursor:"pointer",marginTop:"8px",display:"block"}} onClick={() => { setRecuperando(false); setMensajeRecupero(""); }}>
              Volver al login
            </a>
          </>
        )}

        {recuperandoPorDNI && (
          <>
            <h2>Recuperar por DNI</h2>
            <p className="subtitle">Ingresa tu DNI para encontrar tu cuenta.</p>
            {mensajeDNI && (
              <div style={{background:mensajeDNI.startsWith("ok:")?"#e0ffe0":"#ffe0e0",color:mensajeDNI.startsWith("ok:")?"#1a7a1a":"#c0392b",border:"1px solid " + (mensajeDNI.startsWith("ok:")?"#2ecc71":"#e74c3c"),borderRadius:"8px",padding:"10px 14px",marginBottom:"12px",fontSize:"0.88rem",fontWeight:500}}>
                {mensajeDNI.split(":")[1]}
              </div>
            )}
            <div className="field">
              <label>DNI</label>
              <input type="text" placeholder="Ingresa tu DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
            </div>
            {!emailEncontrado && (
              <button className="btn-login" onClick={buscarPorDNI}>Buscar cuenta</button>
            )}
            {emailEncontrado && (
              <>
                <p style={{fontSize:"0.88rem",marginBottom:"12px"}}>Encontramos una cuenta asociada a: <strong>{ocultarEmail(emailEncontrado)}</strong></p>
                <button className="btn-login" onClick={enviarRecuperoPorDNI}>Enviar email de recuperacion</button>
              </>
            )}
            <a className="forgot" style={{cursor:"pointer",marginTop:"8px",display:"block"}} onClick={() => { setRecuperandoPorDNI(false); setRecuperando(true); setMensajeDNI(""); setEmailEncontrado(""); setDni(""); }}>
              Volver a recupero por email
            </a>
            <a className="forgot" style={{cursor:"pointer",marginTop:"8px",display:"block"}} onClick={() => { setRecuperandoPorDNI(false); setRecuperando(false); setMensajeDNI(""); setEmailEncontrado(""); setDni(""); }}>
              Volver al login
            </a>
          </>
        )}
      </div>

      <div className="green-panel">
        <h3>Hola!</h3>
        <p>No tenes cuenta? Registrate para acceder a todos los servicios</p>
        <button className="btn-register" onClick={onRegistro}>Registrate</button>
      </div>
    </div>
  );
}

export default LoginPOO;
