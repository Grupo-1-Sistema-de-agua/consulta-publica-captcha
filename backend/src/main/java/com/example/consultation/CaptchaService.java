package com.example.consultation;

import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import java.security.SecureRandom;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CaptchaService {
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int MAX_ATTEMPTS = 5;
    private static final int MAX_ACTIVE_CHALLENGES = 5_000;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ConcurrentMap<String, Challenge> challenges = new ConcurrentHashMap<>();
    private final Duration timeToLive;
    private final AtomicInteger issuedChallenges = new AtomicInteger();

    public CaptchaService(@Value("${captcha.ttl-seconds:180}") long ttlSeconds) {
        if (ttlSeconds <= 0) {
            throw new IllegalArgumentException("captcha.ttl-seconds must be positive");
        }
        this.timeToLive = Duration.ofSeconds(ttlSeconds);
    }

    public Captcha createChallenge() {
        if ((issuedChallenges.incrementAndGet() & 127) == 0) {
            removeExpiredChallenges();
        }
        if (challenges.size() >= MAX_ACTIVE_CHALLENGES) {
            removeExpiredChallenges();
            if (challenges.size() >= MAX_ACTIVE_CHALLENGES) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Hay demasiadas verificaciones activas. Intenta más tarde.");
            }
        }

        String answer = randomAnswer();
        String id = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(timeToLive);
        challenges.put(id, new Challenge(answer, expiresAt));
        return new Captcha(id, "data:image/png;base64," + renderImage(answer));
    }

    public boolean verify(String id, String answer) {
        if (id == null || answer == null) {
            return false;
        }

        Challenge challenge = challenges.get(id);
        if (challenge == null) {
            return false;
        }

        boolean valid = challenge.verify(answer);
        if (challenge.isFinished()) {
            challenges.remove(id, challenge);
        }
        return valid;
    }

    private void removeExpiredChallenges() {
        Instant now = Instant.now();
        challenges.entrySet().removeIf(entry -> entry.getValue().isExpired(now));
    }

    private static String randomAnswer() {
        StringBuilder answer = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            answer.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return answer.toString();
    }

    private static String renderImage(String answer) {
        BufferedImage image = new BufferedImage(180, 60, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(new Color(244, 247, 250));
        graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        for (int i = 0; i < 9; i++) {
            graphics.setColor(new Color(90, 130, 170, 150));
            graphics.drawLine(RANDOM.nextInt(180), RANDOM.nextInt(60), RANDOM.nextInt(180), RANDOM.nextInt(60));
        }

        graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 30));
        for (int i = 0; i < answer.length(); i++) {
            graphics.setColor(new Color(RANDOM.nextInt(25, 75), RANDOM.nextInt(55, 110), RANDOM.nextInt(90, 150)));
            graphics.drawString(String.valueOf(answer.charAt(i)), 18 + i * 25, RANDOM.nextInt(37, 49));
        }
        graphics.dispose();

        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", output);
            return Base64.getEncoder().encodeToString(output.toByteArray());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not create CAPTCHA image", exception);
        }
    }

    public record Captcha(String id, String image) {
    }

    private static final class Challenge {
        private final String answer;
        private final Instant expiresAt;
        private int attempts;
        private boolean finished;

        private Challenge(String answer, Instant expiresAt) {
            this.answer = answer;
            this.expiresAt = expiresAt;
        }

        private synchronized boolean verify(String guess) {
            if (finished || Instant.now().isAfter(expiresAt)) {
                finished = true;
                return false;
            }

            attempts++;
            boolean matches = answer.equalsIgnoreCase(guess.trim());
            if (matches || attempts >= MAX_ATTEMPTS) {
                finished = true;
            }
            return matches;
        }

        private synchronized boolean isFinished() {
            return finished;
        }

        private boolean isExpired(Instant now) {
            return now.isAfter(expiresAt);
        }
    }
}
