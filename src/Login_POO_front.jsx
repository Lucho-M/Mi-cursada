import { useState } from "react";
import Usuario from "./Usuario_POO_modelo";
import AuthService from "./AuthService_POO_logica_firebase";
import "./login.css";

function LoginPOO({ onRegistro }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const authService = new AuthService();

  const login = async () => {
    const usuario = new Usuario(null, null, email, password);

    if (!usuario.esValidoLogin()) {
      alert("Ingresá email y contraseña");
      return;
    }

    try {
      await authService.login(usuario);
      alert("Login correcto 🔥");
    } catch (error) {
      alert("Error al iniciar sesión");
      console.log(error);
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