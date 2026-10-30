package com.example.consultation;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ReciboService {
    private final JdbcTemplate jdbcTemplate;

    public ReciboService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Busca clientes por nombre o teléfono y devuelve únicamente sus
     * recibos pendientes de pago.
     *
     * Una lectura está pendiente cuando no tiene ningún pago activo
     * asociado en Tb_Pagos.
     */
    public List<ClienteRecibos> buscarPendientes(String consulta) {
        String q = consulta == null ? "" : consulta.trim();
        if (q.length() < 2) {
            return List.of();
        }

        String nombreLike = "%" + q + "%";
        String soloDigitos = q.replaceAll("\\D", "");
        String telefonoLike = soloDigitos.length() >= 3
                ? "%" + soloDigitos + "%"
                : "%__sin_telefono__%";

        String sql = """
                SELECT
                    c.id AS cliente_id,
                    c.nombre AS nombre_cliente,
                    c.telefono AS telefono,
                    c.direccion_principal AS direccion,
                    l.id AS recibo_id,
                    l.numero_recibo AS numero_recibo,
                    co.codigo_fisico AS numero_contador,
                    (l.monto_base + l.monto_exceso) AS monto_total,
                    l.fecha AS fecha_emision
                FROM Tb_Clientes c
                INNER JOIN Tb_Contadores co ON co.cliente_id = c.id
                INNER JOIN Tb_Lecturas l ON l.contador_id = co.id
                LEFT JOIN Tb_Pagos p ON p.lectura_id_activa = l.id
                WHERE p.id IS NULL
                  AND (
                      LOWER(c.nombre) LIKE LOWER(?)
                      OR REGEXP_REPLACE(c.telefono, '[^0-9]', '') LIKE ?
                  )
                ORDER BY c.nombre ASC, l.fecha DESC
                """;

        List<Map<String, Object>> filas = jdbcTemplate.queryForList(sql, nombreLike, telefonoLike);

        Map<Long, ClienteAcumulado> agrupados = new LinkedHashMap<>();
        for (Map<String, Object> fila : filas) {
            Long clienteId = ((Number) fila.get("cliente_id")).longValue();
            ClienteAcumulado cliente = agrupados.computeIfAbsent(clienteId, id -> new ClienteAcumulado(
                    id,
                    (String) fila.get("nombre_cliente"),
                    (String) fila.get("telefono"),
                    (String) fila.get("direccion")));

            cliente.recibos.add(new ReciboPendiente(
                    ((Number) fila.get("recibo_id")).longValue(),
                    (String) fila.get("numero_recibo"),
                    (String) fila.get("numero_contador"),
                    (BigDecimal) fila.get("monto_total"),
                    convertirFecha(fila.get("fecha_emision"))));
        }

        return agrupados.values().stream().map(ClienteAcumulado::aResultado).toList();
    }

    private static LocalDateTime convertirFecha(Object valor) {
        if (valor instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (valor instanceof LocalDateTime localDateTime) {
            return localDateTime;
        }
        return null;
    }

    public record ClienteRecibos(
            Long id,
            String nombre,
            String telefono,
            String direccion,
            List<ReciboPendiente> recibos,
            BigDecimal totalPendiente) {
    }

    public record ReciboPendiente(
            Long id,
            String numeroRecibo,
            String numeroContador,
            BigDecimal montoTotal,
            LocalDateTime fechaEmision) {
    }

    private static final class ClienteAcumulado {
        private final Long id;
        private final String nombre;
        private final String telefono;
        private final String direccion;
        private final List<ReciboPendiente> recibos = new ArrayList<>();

        private ClienteAcumulado(Long id, String nombre, String telefono, String direccion) {
            this.id = id;
            this.nombre = nombre;
            this.telefono = telefono;
            this.direccion = direccion;
        }

        private ClienteRecibos aResultado() {
            BigDecimal total = recibos.stream()
                    .map(ReciboPendiente::montoTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return new ClienteRecibos(id, nombre, telefono, direccion, List.copyOf(recibos), total);
        }
    }
}
