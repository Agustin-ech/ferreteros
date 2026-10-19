import os
from datetime import timedelta
from dotenv import load_dotenv

# Cargar las variables del archivo .env
load_dotenv()

class Config:
    # Configuración de SQLAlchemy
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Configuración de JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    # Duración de la sesión. El valor por defecto de flask-jwt-extended
    # (15 minutos) expulsaba a los usuarios en plena venta; se usa un turno.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=float(os.getenv("JWT_HORAS_SESION", "10")))