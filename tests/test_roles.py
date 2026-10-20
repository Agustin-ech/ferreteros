from types import SimpleNamespace

from flask_jwt_extended import create_access_token, decode_token

from tests.app_pruebas import crear_app_con_datos


def test_login_devuelve_rol_canonico_para_administrador():
    app = crear_app_con_datos()
    with app.app_context():
        from app.extensions import db
        from app.models.usuario import Usuario

        usuario = db.session.get(Usuario, 1)
        usuario.set_password("clave-de-prueba")
        documento = usuario.numeroDocumento
        correo = usuario.correoElectronico
        db.session.commit()

    respuesta = app.test_client().post(
        "/api/auth/login",
        json={"usuario": documento, "password": "clave-de-prueba"},
    )

    assert respuesta.status_code == 200
    # El correo también sirve, sin importar mayúsculas.
    por_correo = app.test_client().post(
        "/api/auth/login",
        json={"usuario": correo.upper(), "password": "clave-de-prueba"},
    )
    assert por_correo.status_code == 200
    # El primer nombre ya no identifica al usuario.
    por_nombre = app.test_client().post(
        "/api/auth/login",
        json={"usuario": "Usuario", "password": "clave-de-prueba"},
    )
    assert por_nombre.status_code == 401
    assert respuesta.json["usuario"]["rol"] == "admin"
    with app.app_context():
        claims = decode_token(respuesta.json["access_token"])
    assert claims["rol"] == "admin"


def test_usuario_no_administrador_no_accede_a_administracion_de_usuarios():
    app = crear_app_con_datos()
    with app.app_context():
        token = create_access_token(
            identity="1",
            additional_claims={"rol": "vendedor", "idSucursal": 1},
        )

    respuesta = app.test_client().get(
        "/usuarios",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert respuesta.status_code == 403


def test_admin_puede_crear_actualizar_y_desactivar_usuarios_sin_exponer_password():
    app = crear_app_con_datos()
    with app.app_context():
        from app.extensions import db
        from app.models.tipo_usuario import TipoUsuario

        db.session.add(TipoUsuario(idTipoUsuario=2, nombre="vendedor", descripcion="Ventas"))
        db.session.commit()

    cliente = app.test_client()
    creado = cliente.post(
        "/api/usuarios",
        json={
            "idTipoDocumento": 1,
            "numeroDocumento": "900000002",
            "primerNombre": "Ana",
            "primerApellido": "López",
            "correoElectronico": "ana@example.test",
            "telefono": "3001234567",
            "idTipoUsuario": 2,
            "idSucursal": 1,
            "password": "una-clave-segura",
        },
    )

    assert creado.status_code == 201
    usuario = creado.json["usuario"]
    assert usuario["nombre"] == "Ana López"
    assert usuario["sucursal"] == "La Chinita"
    assert "password" not in usuario
    assert "password_hash" not in usuario

    actualizado = cliente.put(
        f"/api/usuarios/{usuario['idUsuario']}",
        json={"telefono": "3010000000", "idSucursal": 2},
    )
    assert actualizado.status_code == 200
    assert actualizado.json["telefono"] == "3010000000"
    assert actualizado.json["sucursal"] == "Buena Vista"
    assert cliente.get(f"/api/usuarios/{usuario['idUsuario']}").status_code == 200

    desactivado = cliente.delete(f"/api/usuarios/{usuario['idUsuario']}")
    assert desactivado.status_code == 200
    assert desactivado.json["activo"] is False
    assert desactivado.json["idSucursal"] == 2


def test_admin_no_puede_desactivar_su_propia_cuenta():
    app = crear_app_con_datos()
    respuesta = app.test_client().delete("/api/usuarios/1")
    assert respuesta.status_code == 409


def test_api_roles_persiste_asignacion_de_funciones_y_rechaza_roles_desconocidos():
    app = crear_app_con_datos()
    with app.app_context():
        from app.extensions import db
        from app.models.funcion import Funcion

        db.session.add_all([
            Funcion(idFuncion=1, modulo="inventario", nombre="Inventario", activo=True),
            Funcion(idFuncion=2, modulo="reportes", nombre="Reportes", activo=True),
        ])
        db.session.commit()

    cliente = app.test_client()
    creado = cliente.post(
        "/api/roles",
        json={"nombre": "vendedor", "descripcion": "Equipo comercial", "idFunciones": [1]},
    )
    assert creado.status_code == 201
    tipo_usuario_id = creado.json["idTipoUsuario"]
    assert creado.json["permisos"] == ["Inventario"]

    actualizado = cliente.put(
        f"/api/roles/{tipo_usuario_id}",
        json={"idFunciones": [1, 2]},
    )
    assert actualizado.status_code == 200
    assert actualizado.json["permisos"] == ["Inventario", "Reportes"]

    rechazado = cliente.post(
        "/api/roles",
        json={"nombre": "cajero", "descripcion": "Rol no soportado", "idFunciones": []},
    )
    assert rechazado.status_code == 400


def test_alcance_de_reportes_usa_la_misma_sucursal_primaria_que_el_login():
    from app.services.reporte_service import sucursales_autorizadas

    usuario = SimpleNamespace(
        tipo_usuario=SimpleNamespace(nombre="vendedor"),
        sucursales=[
            SimpleNamespace(
                idSucursal=2,
                activo=True,
                sucursal=SimpleNamespace(idSucursal=2, activa=True),
            ),
            SimpleNamespace(
                idSucursal=1,
                activo=True,
                sucursal=SimpleNamespace(idSucursal=1, activa=True),
            ),
        ],
    )

    assert sucursales_autorizadas(usuario) == [1]
