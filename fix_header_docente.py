with open('src/componentes/panel/PanelAdmin.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

header_line = None
map_end_line = None

for i, line in enumerate(lines):
    if 'Materia' in line and 'Comision' in line and 'Modalidad' in line:
        header_line = i
    if "d.comisiones.map((com, i) => (" in line:
        map_start = i

print(f"Header en linea: {header_line}")
print(f"Map start en linea: {map_start}")

# Sacamos el bloque del header (2 lineas: el div container y el div con contenido)
header_block = lines[header_line-1:header_line+2]

# Lo borramos de su lugar actual
new_lines = lines[:header_line-1] + lines[header_line+2:]

# Buscamos donde insertar (antes del map)
for i, line in enumerate(new_lines):
    if "d.comisiones.map((com, i) => (" in line:
        insert_at = i
        break

# Insertamos el header antes del map, con borde inferior
header_block[0] = header_block[0].replace("padding:'4px 0 0'", "padding:'4px 0 8px',borderBottom:'1px solid var(--border)'")
final_lines = new_lines[:insert_at] + header_block + new_lines[insert_at:]

with open('src/componentes/panel/PanelAdmin.jsx', 'w', encoding='utf-8') as f:
    f.writelines(final_lines)
print('OK - header movido')
