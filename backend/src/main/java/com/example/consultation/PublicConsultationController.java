package com.example.consultation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/public")
public class PublicConsultationController {
    private final CaptchaService captchaService;
    private final ReciboService reciboService;

    public PublicConsultationController(CaptchaService captchaService, ReciboService reciboService) {
        this.captchaService = captchaService;
        this.reciboService = reciboService;
    }

    @GetMapping("/captcha")
    public CaptchaService.Captcha captcha() {
        return captchaService.createChallenge();
    }

    @PostMapping("/consult")
    public Map<String, Object> consult(@RequestBody ConsultationRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La solicitud está vacía.");
        }

        String consulta = request.query() == null ? "" : request.query().trim();
        if (consulta.length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Escribe al menos 2 caracteres de tu nombre o número de teléfono.");
        }
        if (consulta.length() > 80) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La búsqueda es demasiado larga. Usa solo tu nombre o teléfono.");
        }

        if (!captchaService.verify(request.captchaId(), request.answer())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El CAPTCHA no es válido o expiró.");
        }

        List<ReciboService.ClienteRecibos> clientes = reciboService.buscarPendientes(consulta);
        long totalRecibos = clientes.stream()
                .mapToLong(cliente -> cliente.recibos().size())
                .sum();
        BigDecimal totalGeneral = clientes.stream()
                .map(ReciboService.ClienteRecibos::totalPendiente)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "status", "Disponible",
                "service", "Oficina de Agua - Consulta de recibos",
                "mode", "Solo lectura",
                "consulta", consulta,
                "clientes", clientes,
                "totalRecibos", totalRecibos,
                "totalGeneral", totalGeneral,
                "checkedAt", Instant.now());
    }

    public record ConsultationRequest(String captchaId, String answer, String query) {
    }
}
