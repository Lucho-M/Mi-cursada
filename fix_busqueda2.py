with open('src/componentes/panel/PanelAdmin.jsx', 'r') as f:
    c = f.read()

old = "      (o.codigo_asignatura || '').toLowerCase().includes(busq) ||\n      String(o.comision || '').toLowerCase().includes(busq)"
new = "      norm(o.codigo_asignatura).includes(busq) ||\n      norm(String(o.comision || '')).includes(busq)"

if old in c:
    c = c.replace(old, new, 1)
    with open('src/componentes/panel/PanelAdmin.jsx', 'w') as f:
        f.write(c)
    print('OK')
else:
    print('NO ENCONTRADO')
