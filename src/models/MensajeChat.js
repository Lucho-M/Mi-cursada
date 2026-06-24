class MensajeChat {
  constructor({
    id = null,
    comisionId = '',
    materiaNombre = '',
    autorUid = '',
    autorNombre = '',
    autorRol = '',
    texto = '',
    fecha = null,
  } = {}) {
    this.id = id;
    this.comisionId = comisionId;
    this.materiaNombre = materiaNombre;
    this.autorUid = autorUid;
    this.autorNombre = autorNombre;
    this.autorRol = autorRol;
    this.texto = texto;
    this.fecha = fecha;
  }

  esDe(uid) {
    return this.autorUid === uid;
  }

  toFirestore() {
    return {
      comisionId: this.comisionId,
      materiaNombre: this.materiaNombre,
      autorUid: this.autorUid,
      autorNombre: this.autorNombre,
      autorRol: this.autorRol,
      texto: this.texto,
      fecha: this.fecha,
    };
  }

  static fromFirestore(id, data) {
    return new MensajeChat({ id, ...data });
  }
}

export default MensajeChat;
