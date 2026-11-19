package com.ejemplo.msa.config;

import com.ejemplo.msa.entity.EntityA;
import com.ejemplo.msa.repository.EntityARepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Datos iniciales en memoria (H2). El orden de inserción define los ids 1..N
 * que MS-B referencia en sus relaciones programa-división.
 */
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedDivisiones(EntityARepository repo) {
        return args -> {
            List.of(
                    "División de Ingeniería",
                    "División de Ciencias de la Salud",
                    "División de Ciencias Sociales",
                    "División de Humanidades",
                    "División de Arquitectura"
            ).forEach(nombre -> {
                EntityA a = new EntityA();
                a.setNombreA(nombre);
                repo.save(a);
            });
        };
    }
}
