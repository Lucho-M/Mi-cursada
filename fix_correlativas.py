import sys

path = 'src/componentes/panel/PanelAlumno.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = """  if (seccion === 'correlativas') {
    const aprobadosIds = new Set(
      notas.filter(n => n.parcial === 'final' && Number(n.nota) >= 4).map(n => n.materiaId)
    );
    const carreraId = obtenerCarreraId(carreraActual);
    const materiasDelPlan = carreraId ? getMateriasPorCarrera(carreraId) : [];

    const materiasConEstado = materiasDelPlan.map(m => {
      const aprobada = aprobadosIds.has(m.nombre) || aprobadosIds.has(m.codigo || '');
      const reqs = m.correlativas?.para_cursar || [];
      const correlativasOk = !reqs.length ||
        reqs.every(c => aprobadosIds.has(c));
      let estado = 'Bloqueada';
      if (aprobada) estado = 'Aprobada';
      else if (correlativasOk) estado = 'Disponible';
      return { ...m, estado };
    });

    const byAnio = materiasConEstado.reduce((acc, m) => {
      const k = String(m.anio || 1);
      if (!acc[k]) acc[k] = [];
      acc[k].push(m);
      return acc;
    }, {});

    return (
      <>
        <Topbar
          titulo="Correlativas"
          subtitulo={`${materiasAprobadas} de ${totalCarrera} materias aprobadas`}
        />
        <div className="content">
          {cargando ? (
            <div className="empty-state"><p>Cargando…</p></div>
          ) : materiasDelPlan.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔗</div>
              <p>El plan de estudios de tu carrera aún no está cargado en el sistema.</p>
            </div>
          ) : (
            Object.keys(byAnio).sort((a, b) => Number(a) - Number(b)).map(anio => (
              <div key={anio} style={{ marginBottom: 28 }}>
                <div className="section-head"><h2>{anio}° año</h2></div>
                <div className="card">
                  <div className="table-head cols-corr">
                    <div>Materia</div>
                    <div>Cuatrimestre</div>
                    <div>Correlativas requeridas</div>
                    <div>Estado</div>
                  </div>
                  {byAnio[anio].map((m, i) => (
                    <div key={i} className="table-row cols-corr">
                      <div>
                        <div className="materia-name">{m.nombre}</div>
                        {m.creditos > 0 && <div className="materia-code">{m.creditos} créditos</div>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {m.cuatrimestre}° cuatrimestre
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>
                        {m.correlativas?.para_cursar?.length
                          ? m.correlativas.para_cursar.join(', ')
                          : <span style={{ opacity: 0.4 }}>Sin correlativas</span>
                        }
                      </div>
                      <div><StatusBadge estado={m.estado} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  }"""

new = """  if (seccion === 'correlativas') {
    const ESTADOS_APROBADA = ['promocionado', 'equivalencia'];
    const aprobadasIds = new Set();
    const cursadasIds = new Set();
    notas.forEach(n => {
      const est = n.estado;
      const notaFinal = n.definitiva != null ? Number(n.definitiva) : (n.nota != null ? Number(n.nota) : null);
      const aprobada = ESTADOS_APROBADA.includes(est) ||
        (est === 'regular_con_final' && notaFinal != null && notaFinal >= 4) ||
        (est === 'libre' && notaFinal != null && notaFinal >= 4);
      const cursada = aprobada || est === 'regular_sin_final';
      if (aprobada) aprobadasIds.add(n.materiaId);
      if (cursada) cursadasIds.add(n.materiaId);
    });

    const carreraId = obtenerCarreraId(carreraActual);
    const materiasDelPlan = carreraId ? getMateriasPorCarrera(carreraId) : [];
    const nombrePorCodigo = {};
    materiasDelPlan.forEach(m => { nombrePorCodigo[m.codigo] = m.nombre; });

    const materiasConEstado = materiasDelPlan.map(m => {
      const aprobada = aprobadasIds.has(m.nombre) || aprobadasIds.has(m.codigo || '');
      const reqsCursar = m.correlativas?.para_cursar || [];
      const correlativasOk = !reqsCursar.length ||
        reqsCursar.every(c => cursadasIds.has(c) || cursadasIds.has(nombrePorCodigo[c]));
      let estado = 'Bloqueada';
      if (aprobada) estado = 'Aprobada';
      else if (correlativasOk) estado = 'Disponible';
      return { ...m, estado };
    });

    const byAnio = materiasConEstado.reduce((acc, m) => {
      const k = String(m.anio || 1);
      if (!acc[k]) acc[k] = [];
      acc[k].push(m);
      return acc;
    }, {});

    return (
      <>
        <Topbar
          titulo="Correlativas"
          subtitulo={`${materiasAprobadas} de ${totalCarrera} materias aprobadas`}
        />
        <div className="content">
          {cargando ? (
            <div className="empty-state"><p>Cargando…</p></div>
          ) : materiasDelPlan.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔗</div>
              <p>El plan de estudios de tu carrera aún no está cargado en el sistema.</p>
            </div>
          ) : (
            Object.keys(byAnio).sort((a, b) => Number(a) - Number(b)).map(anio => (
              <div key={anio} style={{ marginBottom: 28 }}>
                <div className="section-head"><h2>{anio}° año</h2></div>
                <div className="card">
                  <div className="table-head cols-corr">
                    <div>Materia</div>
                    <div>Cuatrimestre</div>
                    <div>Cursado</div>
                    <div>Aprobado</div>
                    <div>Estado</div>
                  </div>
                  {byAnio[anio].map((m, i) => (
                    <div key={i} className="table-row cols-corr">
                      <div>
                        <div className="materia-name">{m.codigo} · {m.nombre}</div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {m.cuatrimestre}° cuatrimestre
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>
                        {m.correlativas?.para_cursar?.length
                          ? m.correlativas.para_cursar.join(', ')
                          : <span style={{ opacity: 0.4 }}>—</span>
                        }
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>
                        {m.correlativas?.para_aprobar?.length
                          ? m.correlativas.para_aprobar.join(', ')
                          : <span style={{ opacity: 0.4 }}>—</span>
                        }
                      </div>
                      <div><StatusBadge estado={m.estado} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  }"""

if old not in c:
    print('NO ENCONTRADO - revisar manualmente')
    sys.exit(1)

c = c.replace(old, new, 1)
with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('OK - reemplazado')
