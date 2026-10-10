from datetime import datetime, timezone
from app.extensions import db

class TipoUsuarioFuncion(db.Model):
    __tablename__ = 'tipo_usuario_funcion'

    idTipoUsuarioFuncion = db.Column(db.Integer, primary_key=True)
    idTipoUsuario = db.Column(db.Integer, db.ForeignKey('TipoUsuario.idTipoUsuario'), nullable=False)
    idFuncion = db.Column(db.Integer, db.ForeignKey('Funcion.idFuncion'), nullable=False)

    tipo_usuario = db.relationship('TipoUsuario', back_populates='funciones')
    funcion = db.relationship('Funcion', back_populates='tipos_usuario')

    __table_args__ = (
        db.UniqueConstraint('idTipoUsuario', 'idFuncion', name='uq_tipo_usuario_funcion'),
    )