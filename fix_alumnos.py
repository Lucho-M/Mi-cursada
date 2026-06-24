with open('src/componentes/panel/PanelAdmin.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old = """  if (seccion === 'alumnos') {
    const alumnosFiltrados = alumnos.filter(a =>
      (a.nombre || '').toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(busquedaAlumno.toLowerCase())
    );
    return (
      <>
        {topbar}
        <div className="content">
          <div className="section-head" style={{marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <h2>Alumnos registrados</h2>
            <input type="text" placeholder="Buscar por nombre o email..." value={busquedaAlumno}
              onChange={e => setBusquedaAlumno(e.target.value)}
              style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid #ddd',fontSize:'0.85rem',width:'260px'}} />
          </div>
          <div className="card">
            <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 2fr'}}>
              <div>Alumno</div><div style={{textAlign:'center'}}>DNI</div><div style={{textAlign:'center'}}>Carrera</div><div></div>
            </div>
            {cargandoAlumnos ? (
              <div className="empty-state"><p>Cargando alumnos...</p></div>
            ) : alumnosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="icon">\U0001f465</div>
                <p>No hay alumnos que coincidan con la busqueda.</p>
              </div>
            ) : (
              alumnosFiltrados.map(a => (
                <div key={a.docId} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 2fr'}}>
                  <div>
                    <div className="materia-name">{a.nombre}</div>
                    <div className="materia-code">{a.email}</div>
                  </div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{a.dni || '-'}</div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{a.carrera || '-'}</div>
                  <div style={{fontSize:'0.78rem',color:'#999'}}>
                    {Array.isArray(a.carreras) && a.carreras.length > 1 ? `+${a.carreras.length - 1} carrera(s) mas` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  }"""

new = """  if (seccion === 'alumnos') {
    const carrerasUnicas = [...new Set(alumnos.map(a => a.carrera || '').filter(Boolean))].sort();
    const alumnosFiltrados = alumnos
      .filter(a =>
        ((a.nombre || '').toLowerCase().includes(busquedaAlumno.toLowerCase()) ||
        (a.email || '').toLowerCase().includes(busquedaAlumno.toLowerCase())) &&
        (!busquedaCarreraAlumno || (a.carrera || '') === busquedaCarreraAlumno)
      )
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
    return (
      <>
        {topbar}
        <div className="content">
          <div className="section-head" style={{marginBottom:'14px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px'}}>
            <h2>Alumnos registrados</h2>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <select value={busquedaCarreraAlumno} onChange={e => setBusquedaCarreraAlumno(e.target.value)}
                style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid var(--border)',fontSize:'0.85rem',background:'var(--surface-2)',color:'var(--text-1)'}}>
                <option value="">Todas las carreras</option>
                {carrerasUnicas.map(car => <option key={car} value={car}>{car}</option>)}
              </select>
              <input type="text" placeholder="Buscar por nombre o email..." value={busquedaAlumno}
                onChange={e => setBusquedaAlumno(e.target.value)}
                style={{padding:'8px 12px',borderRadius:'8px',border:'1px solid var(--border)',fontSize:'0.85rem',width:'260px',background:'var(--surface-2)',color:'var(--text-1)'}} />
            </div>
          </div>
          <div className="card">
            <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 2fr'}}>
              <div>Alumno</div><div style={{textAlign:'center'}}>DNI</div><div style={{textAlign:'center'}}>Carrera</div><div></div>
            </div>
            {cargandoAlumnos ? (
              <div className="empty-state"><p>Cargando alumnos...</p></div>
            ) : alumnosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="icon">\U0001f465</div>
                <p>No hay alumnos que coincidan con la busqueda.</p>
              </div>
            ) : (
              alumnosFiltrados.map(a => (
                <div key={a.docId} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 2fr'}}>
                  <div>
                    <div className="materia-name">{a.nombre}</div>
                    <div className="materia-code">{a.email}</div>
                  </div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{a.dni || '-'}</div>
                  <div style={{fontSize:'0.85rem',textAlign:'center'}}>{a.carrera || '-'}</div>
                  <div style={{fontSize:'0.78rem',color:'var(--text-3)'}}>
                    {Array.isArray(a.carreras) && a.carreras.length > 1 ? `+${a.carreras.length - 1} carrera(s) mas` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    );
  }"""

if old in c:
    c = c.replace(old, new, 1)
    with open('src/componentes/panel/PanelAdmin.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('OK - reemplazado')
else:
    print('NO ENCONTRADO')
