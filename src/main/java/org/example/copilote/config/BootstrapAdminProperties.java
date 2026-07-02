package org.example.copilote.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.bootstrap.admin")
public class BootstrapAdminProperties {

    private boolean enabled = true;

    private String firstName = "Platform";

    private String lastName = "Admin";

    private String username = "admin";

    private String email = "admin@copilote.dev";

    private String password = "Admin12345!";
}
