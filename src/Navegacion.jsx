import { useState } from "react";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

function Navegacion() {
  const [pantalla, setPantalla] = useState("carreras");
  const [carreraSeleccionada, setCarreraSeleccionada] = useState("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);

  const datos = {
    programacion: [
      {
        nombre: "Desarrollo de Software",
        aula: "12",
        comision: "1",
        horario: "Viernes 18 a 22",
      },
      {
        nombre: "Inglés Comunicacional",
        aula: "16",
        comision: "3",
        horario: "Miércoles 18 a 22",
      },
    ],
    ciencia_datos: [
      {
        nombre: "Álgebra Lineal",
        aula: "10",
        comision: "1",
        horario: "Lunes 18 a 22",
      },
      {
        nombre: "Matemáticas",
        aula: "1",
        comision: "3",
        horario: "Martes 18 a 22",
      },
    ],
  };

  return (
    <div className="container">
      <button className="logout" onClick={() => signOut(auth)}>
        Cerrar sesión
      </button>

      <h1>Carreras y Materias</h1>

      <div className="card">

        {pantalla === "carreras" && (
          <>
            <h2>Elegir carrera</h2>

            <button
              onClick={() => {
                setCarreraSeleccionada("programacion");
                setPantalla("materias");
              }}
            >
              Tecnicatura en Programación
            </button>

            <button
              onClick={() => {
                setCarreraSeleccionada("ciencia_datos");
                setPantalla("materias");
              }}
            >
              Tecnicatura en Ciencia de Datos
            </button>
          </>
        )}

        {pantalla === "materias" && (
          <>
            <h2>Materias</h2>

            {datos[carreraSeleccionada].map((mat, index) => (
              <button
                key={index}
                onClick={() => {
                  setMateriaSeleccionada(mat);
                  setPantalla("detalle");
                }}
              >
                {mat.nombre}
              </button>
            ))}

            <button onClick={() => setPantalla("carreras")}>
              Volver
            </button>
          </>
        )}

        {pantalla === "detalle" && (
          <>
            <h2>{materiaSeleccionada.nombre}</h2>

            <p>Aula: {materiaSeleccionada.aula}</p>
            <p>Comisión: {materiaSeleccionada.comision}</p>
            <p>Horario: {materiaSeleccionada.horario}</p>

            <button onClick={() => setPantalla("materias")}>
              Volver
            </button>
          </>
        )}

      </div>
    </div>
  );
}

export default Navegacion;