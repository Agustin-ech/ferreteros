from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

class RolUsuario:
    ADMINISTRADOR = "administrador"
    VENDEDOR = "vendedor"
    BODEGA = "bodega"

    OPCIONES = (ADMINISTRADOR, VENDEDOR, BODEGA)

class Usuario(db.Model):
    __tablename__ = "usuarios"

    # --- Columnas obligatorias solicitadas ---
    idUsuario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(150), nullable=False)

    # Se guarda el HASH de la contraseña, nunca el texto plano.
    password_hash = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.String(20), nullable=False)
    idSucursal = db.Column(
        db.Integer,
        db.ForeignKey("sucursales.idSucursal"),
        nullable=True,  # nullable=True porque el Administrador puede
                        # supervisar ambas sucursales sin pertenecer
                        # exclusivamente a una.
    )

    # --- Columnas de soporte, útiles en cualquier sistema real ---
    activo = db.Column(db.Boolean, default=True, nullable=False)
    fecha_creacion = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relación con Sucursal ---
    # 'Sucursal' se referencia como string porque ese modelo se define
    # en otro archivo (app/models/sucursal.py); SQLAlchemy lo resuelve
    # en tiempo de ejecución sin necesidad de importarlo aquí arriba
    # (evita importaciones circulares).
    sucursal = db.relationship("Sucursal", back_populates="usuarios")

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
            "nombre": self.nombre,
            "rol": self.rol,
            "idSucursal": self.idSucursal,
            "activo": self.activo,
        }

    def __repr__(self) -> str:
        return f"<Usuario {self.idUsuario} - {self.nombre} ({self.rol})>"