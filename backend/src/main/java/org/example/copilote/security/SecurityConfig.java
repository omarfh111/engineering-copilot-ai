package org.example.copilote.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider(
            CustomUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder
    ) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") String configuredOrigins
    ) {

        CorsConfiguration configuration = new CorsConfiguration();

        List<String> allowedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();
        if (allowedOrigins.isEmpty() || allowedOrigins.contains("*")) {
            throw new IllegalStateException("app.cors.allowed-origins must contain explicit origins only");
        }
        configuration.setAllowedOrigins(allowedOrigins);

        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of("*"));

        configuration.setExposedHeaders(List.of("Authorization"));

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            DaoAuthenticationProvider authenticationProvider
    ) throws Exception {

        return http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(exception ->
                        exception.authenticationEntryPoint(authenticationEntryPoint))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider)
                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/login",
                                "/api/auth/register"
                        ).permitAll()

                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers("/api/users/me").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/me/password").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/users").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/*/password").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/users/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/*").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/dashboard/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")

                        .requestMatchers(HttpMethod.GET, "/api/health")
                        .authenticated()

                        .requestMatchers(HttpMethod.POST, "/api/notifications/email")
                        .authenticated()

                        .requestMatchers("/api/teams/**")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/projects/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers("/api/projects/**")
                        .hasAnyRole("ADMIN", "MANAGER", "AUDITOR")

                        .requestMatchers(HttpMethod.GET, "/api/repositories/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers("/api/repositories/**")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/documents/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers("/api/documents/**")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/analyses/**", "/api/analysis/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")

                        .requestMatchers(HttpMethod.POST, "/api/analyses/run")
                        .hasAnyRole("ADMIN", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers(HttpMethod.POST, "/api/analyses/impact")
                        .hasAnyRole("ADMIN", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers(HttpMethod.POST, "/api/analyses/*/todo-proposals/confirm")
                        .hasAnyRole("ADMIN", "MANAGER", "QA")
                        .requestMatchers(HttpMethod.POST, "/api/analyses/**", "/api/analysis/**")
                        .hasAnyRole("ADMIN", "QA")
                        .requestMatchers(HttpMethod.PUT, "/api/analyses/**", "/api/analysis/**")
                        .hasAnyRole("ADMIN", "QA")
                        .requestMatchers(HttpMethod.DELETE, "/api/analyses/**", "/api/analysis/**")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/reviews/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA", "AUDITOR")
                        .requestMatchers(HttpMethod.POST, "/api/reviews/**")
                        .hasAnyRole("ADMIN", "QA")
                        .requestMatchers(HttpMethod.PUT, "/api/reviews/**")
                        .hasAnyRole("ADMIN", "QA")
                        .requestMatchers(HttpMethod.DELETE, "/api/reviews/**")
                        .hasAnyRole("ADMIN", "QA")

                        .requestMatchers(HttpMethod.GET, "/api/todos/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA", "DEVELOPER")
                        .requestMatchers(HttpMethod.POST, "/api/todos/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA")
                        .requestMatchers(HttpMethod.PUT, "/api/todos/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA", "DEVELOPER")
                        .requestMatchers(HttpMethod.DELETE, "/api/todos/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA")

                        .requestMatchers(HttpMethod.GET, "/api/conversations/**")
                        .hasAnyRole("ADMIN", "MANAGER", "DEVELOPER")
                        .requestMatchers(HttpMethod.POST, "/api/conversations/**")
                        .hasAnyRole("ADMIN", "DEVELOPER")
                        .requestMatchers(HttpMethod.PUT, "/api/conversations/**")
                        .hasAnyRole("ADMIN", "DEVELOPER")
                        .requestMatchers(HttpMethod.DELETE, "/api/conversations/**")
                        .hasAnyRole("ADMIN", "DEVELOPER")

                        .requestMatchers("/api/architecture/**", "/api/impact/**", "/api/dependencies/**")
                        .hasAnyRole("ADMIN", "ARCHITECT")

                        .requestMatchers("/api/quality/**", "/api/security/**")
                        .hasAnyRole("ADMIN", "QA")

                        .requestMatchers("/api/assistant/**")
                        .hasAnyRole("ADMIN", "DEVELOPER")

                        .requestMatchers(HttpMethod.GET, "/api/audit/logs")
                        .authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/audit/events")
                        .authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/documentation/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers(HttpMethod.POST, "/api/documentation/**")
                        .hasAnyRole("ADMIN", "ARCHITECT")
                        .requestMatchers(HttpMethod.PUT, "/api/documentation/**")
                        .hasAnyRole("ADMIN", "ARCHITECT")
                        .requestMatchers(HttpMethod.DELETE, "/api/documentation/**")
                        .hasRole("ADMIN")

                        .requestMatchers("/api/reports/**", "/api/sprint/**")
                        .hasAnyRole("ADMIN", "MANAGER", "AUDITOR")

                        .requestMatchers("/api/users/**", "/api/admin/**", "/api/settings/**", "/api/audit/**")
                        .hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }
}
