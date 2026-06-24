with open('src/componentes/panel/PanelAdmin.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

componente = """
function DocenteRow({ d }) {
  const [expandido, setExpandido] = React.useState(false);
  return (
    <div>
      <div className="table-row" style={{gridTemplateColumns:'2fr 1fr 60px',cursor:'pointer'}} onClick={() => setExpandido(prev => !prev)}>
        <div>
          <div className="materia-name">{d.nombre}</div>
          <div className="materia-code">{d.email}</div>
        </div>
        <div style={{fontSize:'0.85rem',textAlign:'center'}}>{d.comisiones.length} materia(s)</div>
        <div style={{textAlign:'center',fontSize:'1rem'}}>{expandido ? '▲' : '▼'}</div>
      </div>
      {expandido && (
        <div style={{background:'var(--surface-2)',padding:'12px 20px',borderBottom:'1px solid var(--border)'}}>
          {d.comisiones.length === 0 ? (
            <p style={{fontSize:'0.82rem',color:'var(--text-3)'}}>Sin comisiones asignadas.</p>
          ) : (
            d.comisiones.map((com, i) => (
              <div key={com.id || i} style={{
                display:'grid',
                gridTemplateColumns:'2fr 80px 1fr 1fr 1fr 1fr',
                gap:'8px',
                padding:'8px 0',
                borderBottom: i < d.comisiones.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize:'0.82rem',
                alignItems:'center'
              }}>
                <div style={{fontWeight:600,color:'var(--text-1)'}}>{com.materiaNombre || com.materiaId || '-'}</div>
                <div style={{color:'var(--text-2)',textAlign:'center'}}>Com. {com.numero || '-'}</div>
                <div style={{color:'var(--text-2)',textAlign:'center',textTransform:'capitalize'}}>{com.modalidad || '-'}</div>
                <div style={{color:'var(--text-2)',textAlign:'center'}}>{com.horario || '-'}</div>
                <div style={{color:'var(--text-2)',textAlign:'center'}}>{com.aula || '-'}</div>
                <div style={{textAlign:'center'}}>
                  {com.linkVirtual
                    ? <a href={com.linkVirtual} target="_blank" rel="noreferrer" style={{color:'var(--accent)',fontSize:'0.78rem'}}>Ver link</a>
                    : <span style={{opacity:0.4,color:'var(--text-3)'}}>Sin link</span>}
                </div>
              </div>
            ))
          )}
          <div style={{display:'grid',gridTemplateColumns:'2fr 80px 1fr 1fr 1fr 1fr',gap:'8px',padding:'4px 0 0',fontSize:'0.7rem',color:'var(--text-3)',fontWeight:700,textTransform:'uppercase'}}>
            <div>Materia</div><div style={{textAlign:'center'}}>Comision</div><div style={{textAlign:'center'}}>Modalidad</div><div style={{textAlign:'center'}}>Horario</div><div style={{textAlign:'center'}}>Aula</div><div style={{textAlign:'center'}}>Link</div>
          </div>
        </div>
      )}
    </div>
  );
}

"""

marker = "function PanelAdmin({ perfil, seccion }) {"
if marker in c:
    c = c.replace(marker, componente + marker, 1)
    with open('src/componentes/panel/PanelAdmin.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('OK - DocenteRow agregado')
else:
    print('NO ENCONTRADO')
