import { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

function Materias() {
    const [materia, setMateria] = useState("");
    const [aula, setAula] = useState("");

    const guardar = async () => {
        try {
            await addDoc(collection(db, "materias"), {
                nombre: materia,
                aula: aula
            });
            alert("Guardado");
        } catch (e) {
            console.log(e);
        }
    };

    return (
        <>
            <h2>Cargar materia</h2>
            <input placeholder="Materia" onChange={(e) => setMateria(e.target.value)} />
            <input placeholder="Aula" onChange={(e) => setAula(e.target.value)} />
            <button onClick={guardar}>Guardar</button>
        </>
    );
}

export default Materias;