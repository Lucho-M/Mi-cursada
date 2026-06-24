with open('src/componentes/panel/PanelAdmin.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old = """          {!busq && ofertaLista.length > 50 && (
            <p style={{fontSize:'0.8rem',color:'var(--text-2)',marginBottom:'12px'}}>
              Mostrando 50 de {ofertaLista.length}. Usa el buscador para encontrar otras comisiones.
            </p>
          )}"""

new = """          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',fontSize:'0.82rem',color:'var(--text-2)'}}>
            <span>Mostrando {((paginaOferta - 1) * 50) + 1}-{Math.min(paginaOferta * 50, ofertaOrdenada.length)} de {ofertaOrdenada.length} comisiones</span>
            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
              <button onClick={() => setPaginaOferta(p => Math.max(1, p - 1))} disabled={paginaOferta === 1}
                style={{padding:'4px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)',cursor:'pointer',opacity:paginaOferta===1?0.4:1}}>
                Anterior
              </button>
              <span>Pagina {paginaOferta} de {totalPaginas}</span>
              <button onClick={() => setPaginaOferta(p => Math.min(totalPaginas, p + 1))} disabled={paginaOferta === totalPaginas}
                style={{padding:'4px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'var(--surface-2)',color:'var(--text-1)',cursor:'pointer',opacity:paginaOferta===totalPaginas?0.4:1}}>
                Siguiente
              </button>
            </div>
          </div>"""

if old in c:
    c = c.replace(old, new, 1)
    with open('src/componentes/panel/PanelAdmin.jsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('OK')
else:
    print('NO ENCONTRADO')
