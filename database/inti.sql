CREATE DATABASE IF NOT EXISTS alex;
USE alex;

CREATE TABLE usuarios (
        usuario_id BINARY(16) PRIMARY KEY,
        nombre VARCHAR(100),
        correo VARCHAR(100) UNIQUE,
        rol ENUM('administrador', 'docente', 'alumno'),
        fk_institucion BINARY(16),
        codigo_registro VARCHAR(50),
        estado VARCHAR(20)
    );


    CREATE TABLE instituciones (
        institucion_id BINARY(16) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        direccion VARCHAR(255),
        telefono VARCHAR(15)
    );

    CREATE TABLE suscripciones (
        suscripcion_id BINARY(16) PRIMARY KEY,
        fk_administrador BINARY(16),
        fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_fin TIMESTAMP,
        estado ENUM('activa', 'expirada', 'cancelada')
    );

    CREATE TABLE pagos (
        pago_id BINARY(16) PRIMARY KEY,
        fk_suscripcion BINARY(16),
        fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        monto DECIMAL(10, 2),
        metodo_pago ENUM('paypal', 'stripe'),
        referencia_pago VARCHAR(255),
        estado ENUM('completado', 'pendiente', 'fallido')
    );

    CREATE TABLE examenes (
        examen_id BINARY(16) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fk_docente BINARY(16),
        estado ENUM('activo', 'finalizado', 'bloqueado'),
        codigo_examen VARCHAR(50)
    );

    CREATE TABLE preguntas (
        pregunta_id BINARY(16) PRIMARY KEY,
        texto_pregunta TEXT NOT NULL,
        fk_examen BINARY(16)
    );

    CREATE TABLE respuestas_examen (
        respuesta_id BINARY(16) PRIMARY KEY,
        fk_pregunta BINARY(16),
        texto_respuesta TEXT,
        es_correcta BOOLEAN
    );

    CREATE TABLE respuestas_alumno (
        respuesta_alumno_id BINARY(16) PRIMARY KEY,
        fk_alumno BINARY(16),
        fk_examen BINARY(16),
        fk_pregunta BINARY(16),
        fk_respuesta BINARY(16),
        calificada BOOLEAN DEFAULT FALSE,
        es_correcta BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE calificaciones (
        calificacion_id BINARY(16) PRIMARY KEY,
        fk_alumno BINARY(16),
        fk_examen BINARY(16),
        calificacion DECIMAL(5, 2),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE chats (
        chat_id BINARY(16) PRIMARY KEY,
        fk_examen BINARY(16),
        fk_docente BINARY(16),
        fk_alumno BINARY(16),
        mensaje TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE codigos_verificacion (
        codigo_id BINARY(16) PRIMARY KEY,
        fk_usuario BINARY(16),
        codigo VARCHAR(6),
        fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valido_hasta TIMESTAMP,
        verificado BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE intentos_verificacion (
        intento_id BINARY(16) PRIMARY KEY,
        fk_usuario BINARY(16),
        intentos INT DEFAULT 0,
        ultimo_intento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE estados_examen (
        estado_id BINARY(16) PRIMARY KEY,
        fk_examen BINARY(16),
        fk_alumno BINARY(16),
        estado ENUM('activo', 'bloqueado', 'finalizado'),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE historial_acceso (
        acceso_id BINARY(16) PRIMARY KEY,
        fk_usuario BINARY(16),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        evento ENUM('intento exitoso', 'intento fallido')
    );

    -- Agregar las restricciones de clave foránea
    ALTER TABLE usuarios
        ADD CONSTRAINT fk_institucion FOREIGN KEY (fk_institucion) REFERENCES instituciones(institucion_id);

    ALTER TABLE suscripciones
        ADD CONSTRAINT fk_administrador_suscripciones FOREIGN KEY (fk_administrador) REFERENCES usuarios(usuario_id);

    ALTER TABLE examenes
        ADD CONSTRAINT fk_docente FOREIGN KEY (fk_docente) REFERENCES usuarios(usuario_id);

    ALTER TABLE preguntas
        ADD CONSTRAINT fk_examen FOREIGN KEY (fk_examen) REFERENCES examenes(examen_id);

    ALTER TABLE respuestas_examen
        ADD CONSTRAINT fk_pregunta FOREIGN KEY (fk_pregunta) REFERENCES preguntas(pregunta_id);

    ALTER TABLE respuestas_alumno
        ADD CONSTRAINT fk_alumno FOREIGN KEY (fk_alumno) REFERENCES usuarios(usuario_id);

    ALTER TABLE respuestas_alumno
        ADD CONSTRAINT fk_examen_alumno FOREIGN KEY (fk_examen) REFERENCES examenes(examen_id);

    ALTER TABLE respuestas_alumno
        ADD CONSTRAINT fk_pregunta_alumno FOREIGN KEY (fk_pregunta) REFERENCES preguntas(pregunta_id);

    ALTER TABLE respuestas_alumno
        ADD CONSTRAINT fk_respuesta FOREIGN KEY (fk_respuesta) REFERENCES respuestas_examen(respuesta_id);

    ALTER TABLE calificaciones
        ADD CONSTRAINT fk_alumno_calificacion FOREIGN KEY (fk_alumno) REFERENCES usuarios(usuario_id);

    ALTER TABLE calificaciones
        ADD CONSTRAINT fk_examen_calificacion FOREIGN KEY (fk_examen) REFERENCES examenes(examen_id);

    ALTER TABLE chats
        ADD CONSTRAINT fk_examen_chat FOREIGN KEY (fk_examen) REFERENCES examenes(examen_id);

    ALTER TABLE chats
        ADD CONSTRAINT fk_docente_chat FOREIGN KEY (fk_docente) REFERENCES usuarios(usuario_id);

    ALTER TABLE chats
        ADD CONSTRAINT fk_alumno_chat FOREIGN KEY (fk_alumno) REFERENCES usuarios(usuario_id);

    ALTER TABLE codigos_verificacion
        ADD CONSTRAINT fk_usuario_codigo FOREIGN KEY (fk_usuario) REFERENCES usuarios(usuario_id);

    ALTER TABLE intentos_verificacion
        ADD CONSTRAINT fk_usuario_intento FOREIGN KEY (fk_usuario) REFERENCES usuarios(usuario_id);

    ALTER TABLE estados_examen
        ADD CONSTRAINT fk_examen_estado FOREIGN KEY (fk_examen) REFERENCES examenes(examen_id);

    ALTER TABLE estados_examen
        ADD CONSTRAINT fk_alumno_estado FOREIGN KEY (fk_alumno) REFERENCES usuarios(usuario_id);

    ALTER TABLE historial_acceso
        ADD CONSTRAINT fk_usuario_acceso FOREIGN KEY (fk_usuario) REFERENCES usuarios(usuario_id);

    ALTER TABLE examenes
        ADD COLUMN nombreMateria VARCHAR(100),
        ADD COLUMN duracionExamen INT,
        ADD COLUMN nivelEducacional ENUM ('bachillerato','licenciatura'),
        ADD COLUMN modalidad ENUM ('escolarizado', 'en linea', 'sabatino', 'dominical'),
        ADD COLUMN turno ENUM ('vespentino', 'matutino')
    ;