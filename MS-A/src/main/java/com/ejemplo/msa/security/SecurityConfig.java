package com.ejemplo.msa.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * MS-A como Resource Server: valida el JWT emitido por el Authorization Server.
 *  - Scopes (SCOPE_xxx) controlan el tipo de acceso (leer / escribir).
 *  - Roles (ROLE_xxx, claim "roles") controlan operaciones sensibles (borrar).
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // API stateless con Bearer token
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/entity-a/**").hasAuthority("SCOPE_entity-a.read")
                // /by-ids es POST pero solo consulta (lo usa MS-B por Feign)
                .requestMatchers(HttpMethod.POST, "/api/entity-a/by-ids").hasAuthority("SCOPE_entity-a.read")
                .requestMatchers(HttpMethod.POST, "/api/entity-a").hasAuthority("SCOPE_entity-a.write")
                .requestMatchers(HttpMethod.PUT, "/api/entity-a/**").hasAuthority("SCOPE_entity-a.write")
                .requestMatchers(HttpMethod.DELETE, "/api/entity-a/**").hasRole("ADMIN")
                .anyRequest().denyAll())
            .oauth2ResourceServer(oauth -> oauth
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    /** Combina scopes del token (SCOPE_) con el claim "roles" (ROLE_). */
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter((Jwt jwt) -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>(scopes.convert(jwt));
            List<String> roles = jwt.getClaimAsStringList("roles");
            if (roles != null) {
                roles.forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
            }
            return authorities;
        });
        return converter;
    }

}