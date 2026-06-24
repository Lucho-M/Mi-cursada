with open('src/componentes/panel/PanelAdmin.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

old = "              <div>Docente</div><div>Comisiones</div><div>Modalidad</div><div>Link virtual</div><div></div>"
new = "              <div>Docente</div><div style={{textAlign:'center'}}>Materias</div><div></div>"

if old in c:
    c = c.replace(old, new, 1)
    print('OK header')
else:
    print('NO ENCONTRADO header')

old2 = "            <div className=\"table-head\" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 130px'}}>"
new2 = "            <div className=\"table-head\" style={{gridTemplateColumns:'2fr 1fr 60px'}}>"

if old2 in c:
    c = c.replace(old2, new2, 1)
    print('OK grid header')
else:
    print('NO ENCONTRADO grid header')

old3 = "              docentes.map(d => (\n                <div key={d.uid} className=\"table-row\" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 130px'}}>\n                  <div>\n                    <div className=\"materia-name\">{d.nombre}</div>\n                    <div className=\"materia-code\">{d.email}</div>\n                  </div>\n                  <div style={{fontSize:'0.85rem'}}>{d.comisiones.length} asignadas</div>\n                  <div style={{fontSize:'0.85rem',textTransform:'capitalize'}}>{d.modalidad || 'Presencial'}</div>\n                  <div style={{fontSize:'0.8rem'}}>\n                    {d.linkVirtual\n                      ? <a href={d.linkVirtual} target=\"_blank\" rel=\"noreferrer\" style={{color:'#2e7d32'}}>Ver link</a>\n                      : <span style={{opacity:0.4}}>Sin link</span>}\n                  </div>\n                  <div>\n                    <button onClick={() => setDocenteEditando(d)}\n                      style={{padding:'5px 12px',background:'#f0f0f0',border:'1px solid #ddd',borderRadius:'6px',cursor:'pointer',fontSize:'0.8rem'}}>\n                      Editar\n                    </button>\n                  </div>\n                </div>\n              ))"

new3 = "              docentes.map(d => (\n                <DocenteRow key={d.uid} d={d} />\n              ))"

if old3 in c:
    c = c.replace(old3, new3, 1)
    print('OK rows')
else:
    print('NO ENCONTRADO rows')

old4 = "        {docenteEditando && (\n          <ModalDocente\n            docente={docenteEditando}\n            onGuardar={guardarDocente}\n            onCerrar={() => setDocenteEditando(null)}\n          />\n        )}"
if old4 in c:
    c = c.replace(old4, '', 1)
    print('OK modal removed')
else:
    print('NO ENCONTRADO modal')

with open('src/componentes/panel/PanelAdmin.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('Archivo guardado')
