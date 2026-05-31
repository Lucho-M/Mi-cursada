import { useState } from "react";
import Usuario from "./Usuario_POO_modelo";
import AuthService from "./AuthService_POO_logica_firebase";
import "./login.css";

function ocultarEmail(email) {
  const [usuario, dominio] = email.split("@");
  return usuario.slice(0, 2) + "***@" + dominio;
}

function LoginPOO({ onRegistro }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modoRecupero, setModoRecupero] = useState(null); // null | 'email' | 'dni'
  const [dniRecupero, setDniRecupero] = useState("");
  const [emailRecupero, setEmailRecupero] = useState("");
  const [emailEncontrado, setEmailEncontrado] = useState("");
  const [mensajeRecupero, setMensajeRecupero] = useState("");

  const authService = new AuthService();

  const login = async () => {
    const usuario = new Usuario(null, null, email, password);
    if (!usuario.esValidoLogin()) {
      alert("Ingresá email y contraseña");
      return;
    }
    try {
      await authService.login(usuario);
    } catch (error) {
      alert("Email o contraseña incorrectos");
      console.log(error);
    }
  };

  const recuperarPorEmail = async () => {
    if (!emailRecupero.trim()) {
      alert("Ingresá tu email");
      return;
    }
    try {
      await authService.recuperarPassword(emailRecupero.trim());
      setMensajeRecupero("Si existe una cuenta con ese email, te enviamos el link para restablecer tu contraseña.");
    } catch {
      setMensajeRecupero("Si existe una cuenta con ese email, te enviamos el link para restablecer tu contraseña.");
    }
  };

  const buscarPorDni = async () => {
    if (!dniRecupero.trim()) {
      setMensajeRecupero("error:Ingresá tu DNI para continuar.");
      return;
    }
    try {
      const found = await authService.buscarEmailPorDNI(dniRecupero.trim());
      setEmailEncontrado(found);
      setMensajeRecupero("ok:Encontramos tu cuenta.");
    } catch {
      setMensajeRecupero("error:No encontramos una cuenta con ese DNI.");
    }
  };

  const enviarRecuperoPorDni = async () => {
    try {
      await authService.recuperarPassword(emailEncontrado);
      setMensajeRecupero("ok:Te enviamos el email de recuperación a " + ocultarEmail(emailEncontrado));
      setEmailEncontrado("");
    } catch {
      setMensajeRecupero("error:Ocurrió un error al enviar el email. Intentá de nuevo.");
    }
  };

  const cerrarRecupero = () => {
    setModoRecupero(null);
    setDniRecupero("");
    setEmailRecupero("");
    setEmailEncontrado("");
    setMensajeRecupero("");
  };

  return (
    <div className="auth-shell">
      {/* FORM */}
      <div className="form-panel">
        <div className="brand">
          <div className="brand-name">Mi Cursada</div>
          <div className="brand-logo">
            unab
            <span>Universidad Nacional<br />Guillermo Brown</span>
          </div>
        </div>

        {/* LOGIN NORMAL */}
        {!modoRecupero && (
          <>
            <h2>Iniciar Sesión</h2>
            <p className="subtitle">Ingresa tus datos para continuar</p>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="Ingresa tu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <a
                className="forgot"
                onClick={() => setModoRecupero("email")}
                style={{ cursor: "pointer" }}
              >
                ¿Olvidaste tu contraseña?
              </a>
              <span style={{ color: "var(--border)" }}>|</span>
              <a
                className="forgot"
                onClick={() => setModoRecupero("dni")}
                style={{ cursor: "pointer" }}
              >
                Recuperar por DNI
              </a>
            </div>

            <button className="btn-login" onClick={login}>Ingresar</button>
          </>
        )}

        {/* RECUPERO POR EMAIL */}
        {modoRecupero === "email" && (
          <>
            <h2>Recuperar contraseña</h2>
            <p className="subtitle">Te enviamos un link a tu email</p>

            {!mensajeRecupero ? (
              <>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="Ingresá tu email"
                    value={emailRecupero}
                    onChange={(e) => setEmailRecupero(e.target.value)}
                  />
                </div>
                <button className="btn-login" onClick={recuperarPorEmail}>
                  Enviar link
                </button>
              </>
            ) : (
              <p style={{ color: "var(--primary)", lineHeight: 1.6, fontSize: "0.95rem", margin: "12px 0" }}>
                {mensajeRecupero}
              </p>
            )}

            <a
              className="forgot"
              onClick={cerrarRecupero}
              style={{ cursor: "pointer", marginTop: "12px" }}
            >
              ← Volver al login
            </a>
          </>
        )}

        {/* RECUPERO POR DNI */}
        {modoRecupero === "dni" && (
          <>
            <h2>Recuperar por DNI</h2>
            <p className="subtitle">Ingresá tu DNI sin puntos ni espacios</p>

            {mensajeRecupero && (
              <div style={{
                background: mensajeRecupero.startsWith("ok:") ? "#e0ffe0" : "#ffe0e0",
                color: mensajeRecupero.startsWith("ok:") ? "#1a7a1a" : "#c0392b",
                border: `1px solid ${mensajeRecupero.startsWith("ok:") ? "#2ecc71" : "#e74c3c"}`,
                borderRadius: "8px", padding: "10px 14px", marginBottom: "12px",
                fontSize: "0.88rem", fontWeight: 500,
              }}>
                {mensajeRecupero.startsWith("ok:") ? "✅" : "⚠️"} {mensajeRecupero.split(":")[1]}
              </div>
            )}

            {!emailEncontrado && (
              <>
                <div className="field">
                  <label>DNI</label>
                  <input
                    type="text"
                    placeholder="Ej: 12345678"
                    value={dniRecupero}
                    onChange={(e) => { setDniRecupero(e.target.value); setMensajeRecupero(""); }}
                  />
                </div>
                <button className="btn-login" onClick={buscarPorDni}>Buscar cuenta</button>
              </>
            )}

            {emailEncontrado && (
              <>
                <p style={{ fontSize: "0.9rem", marginBottom: "12px" }}>
                  Encontramos la cuenta: <strong>{ocultarEmail(emailEncontrado)}</strong>
                </p>
                <button className="btn-login" onClick={enviarRecuperoPorDni}>Enviar link de recuperación</button>
              </>
            )}

            <a className="forgot" onClick={cerrarRecupero} style={{ cursor: "pointer", marginTop: "12px" }}>
              ← Volver al login
            </a>
          </>
        )}
      </div>

      {/* GREEN PANEL */}
      <div className="green-panel">
        <h3>¡Hola!</h3>
        <p>¿No tenés cuenta? Registrate para acceder a todos los servicios</p>
        <button className="btn-register" onClick={onRegistro}>Registrate</button>
      </div>
    </div>
  );
}

export default LoginPOO;
