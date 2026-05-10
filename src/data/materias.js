// Importación de materias por carrera
import materiasLicAdmin   from "./materias_lic_admin.json";
import materiasLicCdatos  from "./materias_lic_cdatos.json";
import materiasLicCpol    from "./materias_lic_cpol.json";
import materiasLicEnferm  from "./materias_lic_enferm.json";
import materiasLicLog     from "./materias_lic_log.json";
import materiasLicMat     from "./materias_lic_mat.json";
import materiasesTecAt    from "./materias_tec_at.json";
import materiasesTecAut   from "./materias_tec_aut.json";
import materiasesTecCdatos from "./materias_tec_cdatos.json";
import materiasesTecComdig from "./materias_tec_comdig.json";
import materiasesTecDdp   from "./materias_tec_ddp.json";
import materiasesTecGorg  from "./materias_tec_gorg.json";
import materiasesTecLog   from "./materias_tec_log.json";
import materiasesTecProg  from "./materias_tec_prog.json";
import materiasesTecProt  from "./materias_tec_prot.json";

// Mapa de carrera_id → array de materias
const MATERIAS_POR_CARRERA = {
  LIC_ADMIN:   materiasLicAdmin,
  LIC_CDATOS:  materiasLicCdatos,
  LIC_CPOL:    materiasLicCpol,
  LIC_ENFERM:  materiasLicEnferm,
  LIC_LOG:     materiasLicLog,
  LIC_MAT:     materiasLicMat,
  TEC_AT:      materiasesTecAt,
  TEC_AUT:     materiasesTecAut,
  TEC_CDATOS:  materiasesTecCdatos,
  TEC_COMDIG:  materiasesTecComdig,
  TEC_DDP:     materiasesTecDdp,
  TEC_GORG:    materiasesTecGorg,
  TEC_LOG:     materiasesTecLog,
  TEC_PROG:    materiasesTecProg,
  TEC_PROT:    materiasesTecProt,
};

// Obtener materias de una carrera específica por su id
export function getMateriasPorCarrera(carreraId) {
  return MATERIAS_POR_CARRERA[carreraId] || [];
}

// Obtener todas las materias de todas las carreras en un solo array
export function getTodasLasMaterias() {
  return Object.values(MATERIAS_POR_CARRERA).flat();
}

export default MATERIAS_POR_CARRERA;
