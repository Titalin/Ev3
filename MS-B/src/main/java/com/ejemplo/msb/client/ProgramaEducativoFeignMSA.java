package com.ejemplo.msb.client;
import com.ejemplo.msb.dto.EntityADto; import org.springframework.cloud.openfeign.FeignClient; import org.springframework.web.bind.annotation.PostMapping; import org.springframework.web.bind.annotation.RequestBody; import java.util.List;
@FeignClient(name="MS-A") public interface ProgramaEducativoFeignMSA { @PostMapping("/api/entity-a/by-ids") List<EntityADto> obtenerDTOsDelMSA(@RequestBody List<Long> ids); }
