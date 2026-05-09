import { useState } from "react";
import Usuario from "./Usuario_POO_modelo";
import AuthService from "./AuthService_POO_logica_firebase";
import "./login.css";

function traducirError(codigo) {
  switch (codigo) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email o contraseña incorrectos.";
    case "auth/invalid-email":
      return "El email ingresado no es válido.";
    case "auth/user-disabled":
      return "Esta cuenta fue deshabilitada. Contactá al administrador.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexión a internet. Verificá tu red e intentá de nuevo.";
    default:
      return "Ocurrió un error al iniciar sesión. Intentá de nuevo.";
  }
}

function LoginPOO({ onRegistro }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const authService = new AuthService();

  const login = async () => {
    setError("");

    const usuario = new Usuario(null, null, email, password);

    if (!usuario.esValidoLogin()) {
      setError("Ingresá tu email y contraseña para continuar.");
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

        <h2>Iniciar Sesión</h2>
        <p className="subtitle">Ingresá tus datos para continuar</p>

        {/* MENSAJE DE ERROR */}
        {error && (
          <div style={{
            background: "#ffe0e0",
            color: "#c0392b",
            border: "1px solid #e74c3c",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "12px",
            fontSize: "0.88rem",
            fontWeight: 500,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div className="field">
          <label>Email</label>
          <input
            type="email"
            placeholder="Ingresá tu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Contraseña</label>
          <input
            type="password"
            placeholder="Ingresá tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <a className="forgot">¿Olvidaste tu contraseña?</a>

        <button className="btn-login" onClick={login}>Ingresar</button>
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