with open('src/componentes/panel/PanelAdmin.jsx', 'r') as f:
    c = f.read()

old = "    const busq = busquedaOferta.toLowerCase();\n    const ofertaFiltrada = ofertaLista.filter(o =>\n      !busq ||\n      (o.carrera_ref || '').toLowerCase().includes(busq) ||\n      (o.materia_nombre || '').toLowerCase().includes(busq) ||"

new = "    const norm = t => (t || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();\n    const busq = norm(busquedaOferta);\n    const ofertaFiltrada = ofertaLista.filter(o =>\n      !busq ||\n      norm(o.carrera_ref).includes(busq) ||\n      norm(o.materia_nombre).includes(busq) ||"

if old in c:
    c = c.replace(old, new, 1)
    with open('src/componentes/panel/PanelAdmin.jsx', 'w') as f:
        f.write(c)
    print('OK')
else:
    print('NO ENCONTRADO')
