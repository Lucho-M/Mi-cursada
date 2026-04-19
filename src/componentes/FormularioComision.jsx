import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function FormularioComision() {
  const [materia, setMateria] = useState("");
  const [comision, setComision] = useState("");
  const [dia, setDia] = useState("");
  const [horario, setHorario] = useState("");
  const [aula, setAula] = useState("");
  const [modalidad, setModalidad] = useState("presencial");

  const guardarComision = async (e) => {
    e.preventDefault();

    await addDoc(collection(db, "comisiones"), {
      carrera: "Tecnicatura en Programación",
      materia,
      comision,
      dia,
      horario,
      aula,
      modalidad
    });

    alert("Materia cargada 🔥");

    // limpiar formulario
    setMateria("");
    setComision("");
    setDia("");
    setHorario("");
    setAula("");
  };

  return (
    <form onSubmit={guardarComision} className="form">
      <h2>Cargar Comisión</h2>

      <input
        placeholder="Materia"
        value={materia}
        onChange={(e) => setMateria(e.target.value)}
        required
      />

      <input
        placeholder="Comisión"
        value={comision}
        onChange={(e) => setComision(e.target.value)}
        required
      />

      <input
        placeholder="Día (ej: Lunes)"
        value={dia}
        onChange={(e) => setDia(e.target.value)}
        required
      />

      <input
        placeholder="Horario (ej: 18 a 22)"
        value={horario}
        onChange={(e) => setHorario(e.target.value)}
        required
      />

      <input
        placeholder="Aula"
        value={aula}
        onChange={(e) => setAula(e.target.value)}
      />

      <select
        value={modalidad}
        onChange={(e) => setModalidad(e.target.value)}
      >
        <option value="presencial">Presencial</option>
        <option value="virtual">Virtual</option>
      </select>

      <button type="submit">Guardar</button>
    </form>
  );
}

export default FormularioComision;      