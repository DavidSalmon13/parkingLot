package com.parkinglot.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// Per-IP token bucket over write methods only (spec §9.1) — the app is deployed
// with no login in v1, so this is the only thing standing between the public
// internet and unlimited lot/spot/car writes. Hand-rolled rather than pulling in
// bucket4j: at this app's scale a plain ConcurrentHashMap<String, TokenBucket> is
// plenty and avoids an extra dependency for one interceptor.
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final int CAPACITY = 30;
    private static final double REFILL_TOKENS_PER_MS = CAPACITY / 60_000.0; // 30 requests/minute
    private static final Set<String> RATE_LIMITED_METHODS = Set.of("POST", "PUT", "DELETE");

    private final ConcurrentHashMap<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!RATE_LIMITED_METHODS.contains(request.getMethod())) {
            return true;
        }

        String clientIp = resolveClientIp(request);
        TokenBucket bucket = buckets.computeIfAbsent(clientIp, ip -> new TokenBucket());
        if (bucket.tryConsume()) {
            return true;
        }

        response.setStatus(429);
        response.setHeader("Retry-After", "60");
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"RATE_LIMITED\",\"message\":\"Too many requests. Please slow down and try again shortly.\"}");
        return false;
    }

    // Railway terminates TLS and proxies to the app, so the real client IP arrives
    // via X-Forwarded-For, not request.getRemoteAddr() (which would be the proxy).
    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private static final class TokenBucket {
        private double tokens = CAPACITY;
        private long lastRefillMillis = System.currentTimeMillis();

        synchronized boolean tryConsume() {
            refill();
            if (tokens >= 1) {
                tokens -= 1;
                return true;
            }
            return false;
        }

        private void refill() {
            long now = System.currentTimeMillis();
            double elapsedMillis = now - lastRefillMillis;
            if (elapsedMillis <= 0) {
                return;
            }
            tokens = Math.min(CAPACITY, tokens + elapsedMillis * REFILL_TOKENS_PER_MS);
            lastRefillMillis = now;
        }
    }
}
