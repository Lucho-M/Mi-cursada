with open('src/componentes/panel/PanelAdmin.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Cambio 1: ordenar por carrera y agregar paginacion
old = "    const ofertaAMostrar = busq ? ofertaFiltrada : ofertaFiltrada.slice(0, 50);"
new = """    const ofertaOrdenada = [...ofertaFiltrada].sort((a, b) => (a.carrera_ref || '').localeCompare(b.carrera_ref || '', 'es'));
    const PAGINA_SIZE = 50;
    const totalPaginas = Math.ceil(ofertaOrdenada.length / PAGINA_SIZE);
    const ofertaAMostrar = ofertaOrdenada.slice((paginaOferta - 1) * PAGINA_SIZE, paginaOferta * PAGINA_SIZE);"""

if old in c:
    c = c.replace(old, new, 1)
    print('OK 1 - paginacion')
else:
    print('NO ENCONTRADO 1')

with open('src/componentes/panel/PanelAdmin.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
