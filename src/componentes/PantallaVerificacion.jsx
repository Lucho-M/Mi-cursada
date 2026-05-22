import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import "../login.css";

function PantallaVerificacion({ email }) {
  const [reenviado, setReenviado] = useState(false);
  const [esperando, setEsperando] = useState(false);

  useEffect(() => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      sendEmailVerification(auth.currentUser).catch(() => {});
    }
  }, []);

  const reenviar = async () => {
    if (esperando) return;
    setEsperando(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setReenviado(true);
    } catch {
      alert("Esperá unos segundos antes de reenviar.");
    } finally {
      setEsperando(false);
    }
  };

  const verificarAhora = () => {
    window.location.reload();
  };

  return (
    <div className="auth-shell" style={{ alignItems: "stretch" }}>
      <div className="form-panel" style={{ justifyContent: "center", gap: "20px", display: "flex", flexDirection: "column" }}>
        <div className="brand">
          <div className="brand-name">Mi Cursada</div>
          <div
            className="brand-logo"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.75rem",
              color: "var(--ink-light)",
            }}
          >
            unab
            <span style={{ display: "block", fontSize: "0.6rem", lineHeight: 1.2 }}>
              UNIVERSIDAD NACIONAL<br />GUILLERMO BROWN
            </span>
          </div>
        </div>

        <div style={{ fontSize: "2.5rem", textAlign: "center" }}>✉️</div>

        <h2 style={{ color: "var(--ink)", fontSize: "1.4rem" }}>
          Verificá tu email
        </h2>
        <p style={{ color: "var(--ink-light)", lineHeight: 1.6, fontSize: "0.95rem" }}>
          Te enviamos un link de verificación a{" "}
          <strong style={{ color: "var(--ink)" }}>{email}</strong>.
          Hacé clic en ese link y después volvé acá.
        </p>

        <button
          className="btn-login"
          onClick={verificarAhora}
          style={{ marginTop: "8px" }}
        >
          Ya verifiqué, entrar
        </button>

        <button
          onClick={reenviar}
          disabled={esperando}
          style={{
            background: "none",
            border: "1.5px solid var(--border)",
            borderRadius: "8px",
            padding: "10px",
            color: "var(--ink)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.9rem",
            cursor: esperando ? "not-allowed" : "pointer",
          }}
        >
          {reenviado ? "Email reenviado ✓" : "Reenviar email de verificación"}
        </button>

        <button
          onClick={() => signOut(auth)}
          style={{
            background: "none",
            border: "none",
            color: "var(--ink-light)",
            fontSize: "0.85rem",
            cursor: "pointer",
            textDecoration: "underline",
            padding: "4px 0",
          }}
        >
          Cerrar sesión (email incorrecto, volver a registrarse)
        </button>
      </div>

      <div
        className="green-panel"
        style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "12px" }}
      >
        <h3>Casi listo</h3>
        <p>
          Revisá tu bandeja de entrada y la carpeta de spam.
          Una vez verificado tu email, podés acceder a todos los servicios.
        </p>
      </div>
    </div>
  );
}

export default PantallaVerificacion;
