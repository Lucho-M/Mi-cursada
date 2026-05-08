import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import ImportService from '../../services/ImportService';
import AdminCentro from '../../models/AdminCentro';

const importService = new ImportService();

function DropZoneImport({ titulo, descripcion, formatoEjemplo, onImportar }) {
  const [dragOver, setDragOver] = useState(false);
  const [estado, setEstado] = useState(null); // { tipo: 'ok'|'error', msg }
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef();

  const procesar = async archivo => {
    if (!archivo) return;
    setCargando(true);
    setEstado(null);
    try {
      const cantidad = await onImportar(archivo);
      setEstado({ tipo: 'ok', msg: `✓ ${cantidad} registros importados correctamente` });
    } catch (e) {
      setEstado({ tipo: 'error', msg: `✗ Error: ${e.message}` });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="import-card">
      <h3>{titulo}</h3>
      <p>{descripcion}</p>
      <div
        className={`import-dropzone${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); procesar(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json"
          onChange={e => procesar(e.target.files[0])}
        />
        <div className="drop-icon">📂</div>
        <div className="drop-label">{cargando ? 'Procesando…' : 'Arrastrá un archivo o hacé clic'}</div>
        <div className="drop-sub">Formatos admitidos: CSV · JSON</div>
      </div>
      {formatoEjemplo && (
        <details style={{ marginTop: '10px' }}>
          <summary style={{ fontSize: '0.75rem', color: 'var(--text-light)', cursor: 'pointer' }}>
            Ver formato de ejemplo
          </summary>
          <pre style={{
            marginTop: '8px', padding: '10px', background: 'var(--off-white)',
            borderRadius: '6px', fontSize: '0.72rem', overflowX: 'auto',
            border: '1px solid var(--border)',
          }}>
            {formatoEjemplo}
          </pre>
        </details>
      )}
      {estado && (
        <div className={`import-result ${estado.tipo}`}>{estado.msg}</div>
      )}
    </div>
  );
}

function PanelAdmin({ perfil, seccion }) {
  const [stats, setStats] = useState({ carreras: 0, alumnos: 0, docentes: 0, materias: 0 });
  const [cargando, setCargando] = useState(true);

  // Verificar permisos con el modelo AdminCentro
  const admin = new AdminCentro(perfil?.nombre, perfil?.dni, perfil?.email, '');

  useEffect(() => {
    const cargarStats = async () => {
      setCargando(true);
      try {
        const [usuariosSnap, materiasSnap, carrerasSnap] = await Promise.all([
          getDocs(collection(db, 'usuarios')),
          getDocs(collection(db, 'materias')),
          getDocs(collection(db, 'planesEstudio')),
        ]);
        const usuarios = usuariosSnap.docs.map(d => d.data());
        setStats({
          alumnos:  usuarios.filter(u => u.rol === 'alumno').length,
          docentes: usuarios.filter(u => u.rol === 'profesor').length,
          materias: materiasSnap.size,
          carreras: new Set(carrerasSnap.docs.map(d => d.data().carrera)).size,
        });
      } catch (e) {
        console.error('Error cargando stats admin:', e);
      } finally {
        setCargando(false);
      }
    };
    cargarStats();
  }, []);

  const topbar = (
    <div className="topbar">
      <div className="page-title">
        <h1>Panel administrador</h1>
        <p>Centro de estudiantes · {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  if (seccion === 'oferta' || seccion === 'planes' || seccion === 'materias' || seccion === 'panel') {
    return (
      <>
        {topbar}
        <div className="content">

          {/* Stats institucionales */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Carreras activas</div>
              <div className="stat-value">{cargando ? '…' : stats.carreras}</div>
              <span className="stat-badge badge-green">Con plan de estudio</span>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total alumnos</div>
              <div className="stat-value">{cargando ? '…' : stats.alumnos}</div>
              <span className="stat-badge badge-blue">Registrados</span>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total docentes</div>
              <div className="stat-value">{cargando ? '…' : stats.docentes}</div>
              <span className="stat-badge badge-yellow">Registrados</span>
            </div>
            <div className="stat-card">
              <div className="stat-label">Materias cargadas</div>
              <div className="stat-value">{cargando ? '…' : stats.materias}</div>
              <span className="stat-badge badge-blue">En el sistema</span>
            </div>
          </div>

          {/* Importaciones */}
          {admin.tienePermiso('importar_oferta') && (
            <>
              <div className="section-head" style={{ marginBottom: '14px' }}>
                <h2>Importar datos académicos</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <DropZoneImport
                  titulo="Oferta Académica"
                  descripcion="Importá la oferta del cuatrimestre: materias, comisiones, horarios y docentes."
                  formatoEjemplo={`// JSON
[
  {
    "carrera": "Programación",
    "anio": 2026,
    "cuatrimestre": 1,
    "fechaInicio": "2026-03-10",
    "fechaFin": "2026-07-20",
    "materias": "Desarrollo de Software|Redes|Algoritmos"
  }
]

// CSV
carrera,anio,cuatrimestre,materias,fechaInicio,fechaFin
Programación,2026,1,Desarrollo de Software|Redes,2026-03-10,2026-07-20`}
                  onImportar={archivo => importService.importarOfertaAcademica(archivo)}
                />

                <DropZoneImport
                  titulo="Plan de Estudio"
                  descripcion="Importá el plan de estudio de una carrera con sus materias y correlativas."
                  formatoEjemplo={`// JSON
[
  {
    "carrera": "Programación",
    "anioVigencia": 2024,
    "materias": [
      { "nombre": "Algoritmos", "anio": 1, "cuatrimestre": 1, "creditos": 4 },
      { "nombre": "Redes", "anio": 2, "cuatrimestre": 1, "creditos": 4 }
    ]
  }
]

// CSV
carrera,anioVigencia,materias
Programación,2024,Algoritmos|Redes|Desarrollo de Software`}
                  onImportar={archivo => importService.importarPlanEstudio(archivo)}
                />
              </div>

              <DropZoneImport
                titulo="Catálogo de Materias"
                descripcion="Importá el listado completo de materias con código, año, cuatrimestre, créditos y correlativas."
                formatoEjemplo={`// CSV
nombre,codigo,carrera,anio,cuatrimestre,creditos,correlativas
Algoritmos y Estructuras,IC001,Programación,1,1,4,
Desarrollo de Software,CB002,Programación,1,2,4,IC001
Redes de Computadoras,IC010,Programación,2,1,4,CB002`}
                onImportar={archivo => importService.importarMaterias(archivo)}
              />
            </>
          )}

        </div>
      </>
    );
  }

  return (
    <>
      {topbar}
      <div className="content">
        <div className="empty-state">
          <div className="icon">🚧</div>
          <p>Sección en construcción</p>
        </div>
      </div>
    </>
  );
}

export default PanelAdmin;
