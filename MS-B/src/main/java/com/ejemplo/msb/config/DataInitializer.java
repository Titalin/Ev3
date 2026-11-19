package com.ejemplo.msb.config;

import com.ejemplo.msb.entity.EntityB;
import com.ejemplo.msb.repository.EntityBRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;

/**
 * Datos iniciales en memoria (H2). Los entityAIds corresponden a los ids que
 * MS-A genera al sembrar sus divisiones (mismo orden que DataInitializer de MS-A).
 */
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedProgramas(EntityBRepository repo) {
        return args -> {
            Map.ofEntries(
                    Map.entry("Ing. en Sistemas Computacionales", List.of(1L)),
                    Map.entry("Ing. Industrial", List.of(1L, 5L)),
                    Map.entry("Medicina General", List.of(2L)),
                    Map.entry("Lic. en Psicología", List.of(2L, 3L)),
                    Map.entry("Lic. en Historia", List.of(4L)),
                    Map.entry("Arq. y Urbanismo", List.of(5L, 1L))
            ).forEach((nombre, divisionIds) -> {
                EntityB b = new EntityB();
                b.setNombreB(nombre);
                divisionIds.forEach(b::addDivision);
                repo.save(b);
            });
        };
    }
}
