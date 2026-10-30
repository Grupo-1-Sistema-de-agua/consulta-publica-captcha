-- Datos de demostración para probar el módulo sin usar la base real.
-- No contienen información de clientes reales.
-- Ejecutar sobre una base MariaDB llamada agua_db.

USE agua_db;

CREATE TABLE IF NOT EXISTS Tb_Clientes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NULL,
    direccion_principal VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Tb_Contadores (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo_fisico VARCHAR(30) NOT NULL,
    direccion_servicio VARCHAR(255) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    cliente_id INT UNSIGNED NOT NULL,
    tipo_servicio_id INT UNSIGNED NOT NULL DEFAULT 1,
    sector_id INT UNSIGNED NOT NULL DEFAULT 1,
    lectura_inicial INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_codigo_fisico (codigo_fisico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Tb_Lecturas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero_recibo VARCHAR(20) NOT NULL,
    lectura_anterior INT NOT NULL DEFAULT 0,
    lectura_actual INT NOT NULL,
    consumo_litros INT NOT NULL,
    fecha DATETIME NOT NULL,
    contador_id INT UNSIGNED NOT NULL,
    tarifa_base_id INT UNSIGNED NOT NULL DEFAULT 1,
    tarifa_exceso_id INT UNSIGNED NULL,
    usuario_lector_id INT UNSIGNED NOT NULL DEFAULT 1,
    monto_base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    monto_exceso DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id),
    UNIQUE KEY uq_numero_recibo (numero_recibo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS Tb_Pagos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATETIME NOT NULL,
    lectura_id INT UNSIGNED NOT NULL,
    metodo_id INT UNSIGNED NOT NULL DEFAULT 1,
    usuario_registro_id INT UNSIGNED NOT NULL DEFAULT 1,
    anulado TINYINT(1) NOT NULL DEFAULT 0,
    lectura_id_activa INT UNSIGNED GENERATED ALWAYS AS (CASE WHEN anulado = 0 THEN lectura_id ELSE NULL END) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lectura_id_activa (lectura_id_activa),
    KEY idx_lectura_id (lectura_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO Tb_Clientes (id, nombre, telefono, direccion_principal) VALUES
    (1, 'Cliente Demo Uno', '5555-0001', 'Zona 1, Casa 1'),
    (2, 'Cliente Demo Dos', '5555-0002', 'Zona 2, Casa 2');

INSERT INTO Tb_Contadores (id, codigo_fisico, direccion_servicio, cliente_id) VALUES
    (1, 'CT-DEMO-01', 'Zona 1, Casa 1', 1),
    (2, 'CT-DEMO-02', 'Zona 2, Casa 2', 2);

INSERT INTO Tb_Lecturas
    (id, numero_recibo, lectura_anterior, lectura_actual, consumo_litros, fecha, contador_id, monto_base, monto_exceso)
VALUES
    (1, 'R-DEMO-0001', 100, 120, 20, '2026-09-01 09:00:00', 1, 85.00, 15.00),
    (2, 'R-DEMO-0002', 200, 230, 30, '2026-10-01 09:00:00', 2, 120.00, 0.00),
    (3, 'R-DEMO-0003', 120, 145, 25, '2026-10-01 09:00:00', 1, 90.00, 10.00),
    (4, 'R-DEMO-0004', 145, 165, 20, '2026-11-01 09:00:00', 1, 90.00, 10.00);

-- El recibo R-DEMO-0001 ya está pagado; los otros dos quedan pendientes.
INSERT INTO Tb_Pagos (monto, fecha_pago, lectura_id, metodo_id, usuario_registro_id)
VALUES (100.00, '2026-09-10 10:00:00', 1, 1, 1);
