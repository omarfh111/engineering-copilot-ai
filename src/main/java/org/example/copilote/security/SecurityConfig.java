package org.example.copilote.security;

import lombok.RequiredArgsConstructor;
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
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:4173",
                "http://127.0.0.1:4173"
        ));

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
                        .requestMatchers(HttpMethod.GET, "/api/users/*").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/users/*").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/dashboard/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")

                        .requestMatchers("/api/teams/**")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/projects/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers("/api/projects/**")
                        .hasAnyRole("ADMIN", "MANAGER", "AUDITOR")

                        .requestMatchers(HttpMethod.GET, "/api/repositories/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ARCHITECT", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers("/api/repositories/**")
                        .hasAnyRole("ADMIN", "MANAGER", "AUDITOR")

                        .requestMatchers(HttpMethod.GET, "/api/documents/**")
                        .hasAnyRole("ADMIN", "ARCHITECT", "DEVELOPER")

                        .requestMatchers(HttpMethod.GET, "/api/analyses/**", "/api/analysis/**")
                        .hasAnyRole("ADMIN", "ARCHITECT", "QA", "DEVELOPER")

                        .requestMatchers(HttpMethod.GET, "/api/reviews/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA", "AUDITOR")
                        .requestMatchers("/api/reviews/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA", "AUDITOR")

                        .requestMatchers(HttpMethod.GET, "/api/todos/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA", "DEVELOPER", "AUDITOR")
                        .requestMatchers("/api/todos/**")
                        .hasAnyRole("ADMIN", "MANAGER", "QA", "AUDITOR")

                        .requestMatchers("/api/architecture/**", "/api/impact/**", "/api/dependencies/**")
                        .hasAnyRole("ADMIN", "ARCHITECT")

                        .requestMatchers("/api/quality/**", "/api/security/**")
                        .hasAnyRole("ADMIN", "QA")

                        .requestMatchers("/api/assistant/**")
                        .hasAnyRole("ADMIN", "DEVELOPER")

                        .requestMatchers("/api/documentation/**")
                        .hasAnyRole("ADMIN", "ARCHITECT", "DEVELOPER")

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
