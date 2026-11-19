package com.idgs17.rate.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * RATE como Gateway + Resource Server: valida el JWT emitido por el
 * Authorization Server (auth-server) y enruta /api/** a MS-A y MS-B.
 * La autorización fina por scopes la aplican los microservicios.
 *
 * El CorsConfigurationSource se construye aquí (sin registrarlo como bean)
 * para que solo el filtro de Spring Security agregue los headers CORS;
 * si fuera bean, Spring MVC también los agregaría y el navegador rechaza
 * la respuesta por header duplicado.
 */
@Configuration
public class SecurityConfig {

    private static UrlBasedCorsConfigurationSource corsSource() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of(System.getenv().getOrDefault("FRONTEND_ORIGIN", "http://localhost:4200")));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        c.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http
                .csrf(c -> c.disable())
                .cors(c -> c.configurationSource(corsSource()))
                .formLogin(f -> f.disable())
                .httpBasic(b -> b.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/error", "/actuator/health").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(Customizer.withDefaults()))
                .build();
    }
}
