import { useState } from "react";
import Usuario from "./Usuario_POO_modelo";
import AuthService from "./AuthService_POO_logica_firebase";
import Carreras from "./Carreras";
import "./registro_poo.css";

function RegistroPOOFront({ onLogin }) {
  const [paso, setPaso] = useState(1);
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [carrera, setCarrera] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const carrerasService = new Carreras();
  const carreras = carrerasService.obtenerTodas();
  const authService = new AuthService();

  const validarPaso1 = () => {
    return dni.trim() !== "" && nombre.trim() !== "" && carrera !== "";
  };

  const validarPaso2 = () => {
    return email.trim() !== "" && password.trim() !== "" && password === confirmPassword && password.length >= 6;
  };

  const siguiente = () => {
    if (paso === 1 && !validarPaso1()) {
      alert("Completá todos los campos de este paso");
      return;
    }
    setPaso(2);
  };

  const anterior = () => {
    if (paso === 2) {
      setPaso(1);
    }
  };

  const registrarse = async () => {
    if (!validarPaso2()) {
      alert("Asegurate de completar los campos y verificar que las contraseñas coincidan (mín. 6 caracteres)");
      return;
    }

    try {
      const usuario = new Usuario(nombre, dni, email, password, carrera);
      
      if (!usuario.esValidoRegistro()) {
        alert("Por favor completa todos los campos correctamente");
        return;
      }

      await authService.registrarse(usuario);
      alert("¡Registro exitoso! 🎉");
      // Limpiar formulario y volver a login
      setPaso(1);
      setDni("");
      setNombre("");
      setCarrera("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      if (onLogin) onLogin();
    } catch (error) {
      alert("Error al registrarse: " + error.message);
      console.log(error);
    }
  };

  return (
    <div className="registro-shell">
      {/* LEFT GREEN PANEL */}
      <div className="green-panel-registro">
        <h2>Crear Cuenta</h2>
        <p>Completá tus datos para registrarte</p>

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
            <button
              className="btn-continuar"
              onClick={anterior}
            >
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '16px' }}>
          <button
            className="btn-login-desde-registro"
            onClick={onLogin}
            style={{ marginBottom: '0' }}
          >
            Iniciar sesión
          </button>
          
          <button
            onClick={() => {
              if (paso === 1) {
                if (!validarPaso1()) {
                  alert("Completá el formulario primero");
                } else {
                  siguiente();
                }
              } else {
                 registrarse();
              }
            }}
            style={{ 
              width: '100%',
              padding: '12px',
              background: 'var(--primary-light)', 
              color: 'var(--primary-dark)', 
              border: '1.5px solid var(--border)',
              borderRadius: '8px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
          >
            Siguiente Paso
          </button>
        </div>

        <p className="message-registro">
          Completá el formulario para continuar
        </p>
      </div>
    </div>
  );
}

export default RegistroPOOFront;
