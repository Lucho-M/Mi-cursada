import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';

const PAGINA_SIZE = 50;

const CAMPOS_OFERTA = [
  { key: 'carrera_ref', label: 'Carrera' },
  { key: 'materia_nombre', label: 'Materia' },
  { key: 'codigo_asignatura', label: 'Cod.' },
  { key: 'comision', label: 'Com.' },
  { key: 'turno', label: 'Turno' },
  { key: 'dia', label: 'Dia' },
  { key: 'hora_rango', label: 'Horario' },
  { key: 'modalidad', label: 'Modalidad' },
  { key: 'sede', label: 'Sede' },
  { key: 'aula', label: 'Aula' },
  { key: 'contacto', label: 'Contacto/WhatsApp' },
];

const normTexto = t => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const normCarrera = s => (s || '').replace(/\.$/, '').trim().toLowerCase();

export default function SeccionOfertaAcademica() {
  const [ofertaLista, setOfertaLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const snap = await getDocs(collection(db, 'comisionesOferta'));
        setOfertaLista(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Error cargando oferta academica:', e);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const busq = normTexto(busqueda);
  const ofertaFiltrada = ofertaLista.filter(o =>
    !busq ||
    normTexto(o.carrera_ref).includes(busq) ||
    normTexto(o.materia_nombre).includes(busq) ||
    normTexto(o.codigo_asignatura).includes(busq) ||
    normTexto(String(o.comision || '')).includes(busq)
  );
  const ofertaOrdenada = [...ofertaFiltrada].sort((a, b) =>
    normCarrera(a.carrera_ref).localeCompare(normCarrera(b.carrera_ref), 'es')
  );
  const totalPaginas = Math.max(1, Math.ceil(ofertaOrdenada.length / PAGINA_SIZE));
  const ofertaAMostrar = ofertaOrdenada.slice((pagina - 1) * PAGINA_SIZE, pagina * PAGINA_SIZE);

  return (
    <div className="content">
      <div className="section-head" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Oferta academica ({ofertaLista.length} comisiones)</h2>
        <input type="text" placeholder="Buscar por carrera, materia o codigo..." value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', width: '300px', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.82rem', color: 'var(--text-2)' }}>
        <span>Mostrando {ofertaOrdenada.length === 0 ? 0 : ((pagina - 1) * PAGINA_SIZE) + 1}-{Math.min(pagina * PAGINA_SIZE, ofertaOrdenada.length)} de {ofertaOrdenada.length} comisiones</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
            style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', cursor: 'pointer', opacity: pagina === 1 ? 0.4 : 1 }}>
            Anterior
          </button>
          <span>Pagina {pagina} de {totalPaginas}</span>
          <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
            style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', cursor: 'pointer', opacity: pagina === totalPaginas ? 0.4 : 1 }}>
            Siguiente
          </button>
        </div>
      </div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {CAMPOS_OFERTA.map(c => (
                <th key={c.key} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--text-2)' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={CAMPOS_OFERTA.length} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>Cargando...</td></tr>
            ) : ofertaAMostrar.length === 0 ? (
              <tr><td colSpan={CAMPOS_OFERTA.length} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>No hay comisiones que coincidan.</td></tr>
            ) : (
              ofertaAMostrar.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  {CAMPOS_OFERTA.map(c => (
                    <td key={c.key} style={{ padding: '6px 8px' }}>{item[c.key] || '-'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
