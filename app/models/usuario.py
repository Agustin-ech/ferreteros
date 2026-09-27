from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

class Usuario(db.Model):
    __tablename__ = "usuarios"

    # --- Columnas obligatorias solicitadas ---
    idUsuario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    idTipoDocumento = db.Column(db.Integer, db.ForeignKey("TipoDeDocumento.idTipoDocumento"), nullable=False)
    numeroDocumento = db.Column(db.String(20), unique=True, nullable=False)
    primerNombre = db.Column(db.String(150), nullable=False)
    segundoNombre = db.Column(db.String(150), nullable=True)
    primerApellido = db.Column(db.String(150), nullable=False)
    segundoApellido = db.Column(db.String(150), nullable=True)
    correoElectronico = db.Column(db.String(150), unique=True, nullable=False)
    telefono = db.Column(db.String(20), nullable=True)
    idTipoUsuario = db.Column(db.Integer, db.ForeignKey("TipoUsuario.idTipoUsuario"), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    # --- Columnas de soporte, útiles en cualquier sistema real ---
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    ultimo_login = db.Column(db.DateTime(timezone=True), nullable=True)

    # --- Relaciones ---
    tipo_documento = db.relationship('TipoDeDocumento')
    tipo_usuario = db.relationship('TipoUsuario')
    sucursales = db.relationship('SucursalUsuario', back_populates='usuario')

    # ------------------------------------------------------------------
    # Métodos para manejar la contraseña de forma segura
    # ------------------------------------------------------------------
    def set_password(self, password_plano: str) -> None:
        """
        Genera el hash de la contraseña y lo guarda en password_hash.
        Nunca se debe asignar directamente a self.password_hash desde
        fuera de este método.
        """
        self.password_hash = generate_password_hash(password_plano)

    def check_password(self, password_plano: str) -> bool:
        """
        Verifica si el texto plano recibido (ej. en el login) coincide
        con el hash guardado.
        """
        return check_password_hash(self.password_hash, password_plano)

    # ------------------------------------------------------------------
    # Utilidades
    # ------------------------------------------------------------------
    def to_dict(self) -> dict:
        return {
            "idUsuario": self.idUsuario,
            "primerNombre": self.primerNombre,
            "segundoNombre": self.segundoNombre,
            "primerApellido": self.primerApellido,
            "segundoApellido": self.segundoApellido,
            "correoElectronico": self.correoElectronico,
            "telefono": self.telefono,
            "idTipoUsuario": self.idTipoUsuario,
            "activo": self.activo,
            "fecha_creacion": self.fecha_creacion.isoformat(),
            "ultimo_login": self.ultimo_login.isoformat() if self.ultimo_login else None,
        }

    def __repr__(self) -> str:
        return f"<Usuario {self.idUsuario} - {self.primerNombre} - {self.segundoNombre} - {self.primerApellido} - {self.segundoApellido} - {self.correoElectronico} - {self.telefono} ({self.idTipoUsuario})>"