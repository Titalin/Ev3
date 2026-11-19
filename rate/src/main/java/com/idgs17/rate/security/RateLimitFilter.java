package com.idgs17.rate.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private record Bucket(AtomicInteger count, long minute) {}
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private static final int API_LIMIT = 120;
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long minute = Instant.now().getEpochSecond() / 60;
        String key = request.getRemoteAddr();
        Bucket bucket = buckets.compute(key, (k, old) -> old == null || old.minute() != minute
                ? new Bucket(new AtomicInteger(0), minute) : old);
        if (buckets.size() > 10000) buckets.entrySet().removeIf(e -> e.getValue().minute() < minute - 1);
        if (bucket.count().incrementAndGet() > API_LIMIT) {
            response.setStatus(429); response.setHeader("Retry-After", "60"); response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Límite de solicitudes alcanzado; espera un minuto\"}"); return;
        }
        chain.doFilter(request, response);
    }
}
