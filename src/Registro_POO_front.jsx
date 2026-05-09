import { useState } from "react";
import Usuario from "./Usuario_POO_modelo";
import AuthService from "./AuthService_POO_logica_firebase";
import Carreras from "./Carreras";
import "./registro_poo.css";

// Traduce errores de Firebase a mensajes entendibles
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

function RegistroPOOFront({ onLogin }) {
  const [paso, setPaso] = useState(1);
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [carrera, setCarrera] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const carrerasService = new Carreras();
  const carreras = carrerasService.obtenerTodas();
  const authService = new AuthService();

  const validarPaso1 = () => {
    return dni.trim() !== "" && nombre.trim() !== "" && carrera !== "";
  };

  const validarPaso2 = () => {
    return (
      email.trim() !== "" &&
      password.trim() !== "" &&
      password === confirmPassword &&
      password.length >= 6
    );
  };

  const siguiente = () => {
    if (paso === 1 && !validarPaso1()) {
      setError("Completá todos los campos antes de continuar.");
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
      if (password !== confirmPassword) {
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
      const usuario = new Usuario(nombre, dni, email, password, carrera);

      if (!usuario.esValidoRegistro()) {
        setError("Por favor completá todos los campos correctamente.");
        return;
      }

      await authService.registrarse(usuario);
      alert("¡Registro exitoso! 🎉");
      setPaso(1);
      setDni("");
      setNombre("");
      setCarrera("");
      setEmail("");
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
      {/* LEFT GREEN PANEL */}
      <div className="green-panel-registro">
        <h2>Crear Cuenta</h2>
        <p>Completá tus datos para registrarte</p>

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

        {/* PASO 1 */}
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
              <label>CARRERA QUE CURSÁS</label>
              <select
                value={carrera}
                onChange={(e) => setCarrera(e.target.value)}
                className="select-carrera"
              >
                <option value="" disabled>Seleccioná tu carrera</option>
                {carreras.map((carr) => (
                  <option key={carr.id} value={carr.nombre}>
                    {carr.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* PASO 2 */}
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

        {/* BOTONES */}
        <div className="button-group">
          {paso === 2 && (
            <button className="btn-continuar" onClick={anterior}>
              Atrás
            </button>
          )}

          {paso === 1 ? (
            <button className="btn-continuar" onClick={siguiente}>
              Continuar
            </button>
          ) : (
            <button
              className="btn-continuar btn-registrarse"
              onClick={registrarse}
            >
              Registrarse
            </button>
          )}
        </div>

        {/* INDICADOR DE PROGRESO */}
        <div className="progress-dots">
          {[1, 2].map((numero) => (
            <div
              key={numero}
              className={`dot ${paso === numero ? "active" : ""}`}
            ></div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL - BIENVENIDA */}
      <div className="welcome-panel">
        <div className="brand-welcome">
          <div className="brand-name-welcome">Mi Cursada</div>
          <div className="brand-logo-welcome">
            unab
            <span>UNIVERSIDAD NACIONAL<br />GUILLERMO BROWN</span>
          </div>
        </div>

        <h3>¡Bienvenido!</h3>
        <p>
          ¿Ya tenés una cuenta? Iniciá sesión para continuar o completá el
          formulario para registrarte.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginBottom: "16px" }}>
          <button
            className="btn-login-desde-registro"
            onClick={onLogin}
            style={{ marginBottom: "0" }}
          >
            Iniciar sesión
          </button>

          <button
            onClick={() => {
              if (paso === 1) {
                siguiente();
              } else {
                registrarse();
              }
            }}
            style={{
              width: "100%",
              padding: "12px",
              background: "var(--primary-light)",
              color: "var(--primary-dark)",
              border: "1.5px solid var(--border)",
              borderRadius: "8px",
              fontFamily: '"DM Sans", sans-serif',
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
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
