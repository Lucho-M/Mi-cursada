with open('src/componentes/panel/PanelAdmin.jsx', 'r') as f:
    c = f.read()

start = "  if (seccion === 'materias') {"
end = "  if (seccion === 'alumnos') {"

idx_start = c.find(start)
idx_end = c.find(end)

if idx_start == -1 or idx_end == -1:
    print('NO ENCONTRADO')
else:
    c = c[:idx_start] + c[idx_end:]
    with open('src/componentes/panel/PanelAdmin.jsx', 'w') as f:
        f.write(c)
    print('OK - seccion materias eliminada')
