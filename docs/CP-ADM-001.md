# CP-ADM-001 — Importación de oferta académica con sobreescritura

**Módulo:** Panel Administrador → Importar oferta académica  
**Estado:** Pendiente de verificación  
**Responsable de verificación:** Lucho

---

## Descripción del problema detectado

Al realizar dos importaciones consecutivas de oferta académica sin marcar la opción "Borrar y reemplazar todo lo anterior", y luego realizar una tercera importación marcando dicha opción, la sobreescritura no elimina la totalidad de los registros acumulados en Firestore, sino únicamente los del último lote importado, dejando registros de cargas previas sin borrar.

---

## Pasos para reproducir

1. Importar un archivo CSV de oferta académica SIN marcar sobreescritura (Carga 1).
2. Importar un segundo archivo CSV SIN marcar sobreescritura (Carga 2).
3. Importar un tercer archivo CSV MARCANDO "Borrar y reemplazar todo lo anterior" (Carga 3 con sobreescritura).

---

## Resultado esperado

La opción de sobreescritura elimina todos los registros previos de la colección comisionesOferta en Firestore y la reemplaza íntegramente con el contenido del nuevo archivo.

---

## Resultado obtenido

Solo se eliminan los registros del último lote importado (Carga 2), permaneciendo los registros de la Carga 1 en la base de datos.

---

## Verificación pendiente

Luego de reproducir el escenario, recargar la página (F5) y confirmar si en la tabla de oferta aparecen registros de la Carga 1 que deberían haber sido eliminados.

- Si aparecen: bug confirmado, requiere corrección en _borrarColeccion o en la recarga del estado React.
- Si no aparecen: el problema es solo visual (estado React desactualizado), no de datos en Firestore.

---

## Hipótesis de causa

El estado React (ofertaLista) podría no estar reflejando todos los registros de Firestore correctamente entre importaciones, o bien la función _borrarColeccion en src/services/ImportService.js no está tomando la colección completa sino solo el subconjunto visible en el estado al momento de ejecutarse.

---

## Archivos relevantes

- src/services/ImportService.js: función _borrarColeccion y importarOfertaAcademica
- src/componentes/panel/PanelAdmin.jsx: sección oferta, estado ofertaLista
