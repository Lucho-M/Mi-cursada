export const normalizarDni = (dni) => String(dni).replace(/[.,\s\-]/g, '').trim();
