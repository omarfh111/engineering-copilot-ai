package org.example.copilote.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.User;
import org.example.copilote.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapInitializer implements ApplicationRunner {

    private static final int MAX_USERNAME_ATTEMPTS = 100;

    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.isEnabled()) {
            log.info("Bootstrap admin initialization is disabled.");
            return;
        }

        if (!hasRequiredBootstrapValues()) {
            log.warn("Bootstrap admin initialization was skipped because one or more required properties are blank.");
            return;
        }

        boolean hasAdmin = userRepository.existsByRole(Role.ADMIN);

        userRepository.findByEmail(properties.getEmail().trim())
                .ifPresentOrElse(this::promoteExistingUser, () -> {
                    if (hasAdmin) {
                        log.info("At least one admin already exists. Skipping bootstrap admin creation.");
                        return;
                    }

                    createBootstrapAdmin();
                });
    }

    private boolean hasRequiredBootstrapValues() {
        return StringUtils.hasText(properties.getFirstName())
                && StringUtils.hasText(properties.getLastName())
                && StringUtils.hasText(properties.getUsername())
                && StringUtils.hasText(properties.getEmail())
                && StringUtils.hasText(properties.getPassword());
    }

    private void promoteExistingUser(User user) {
        user.setRole(Role.ADMIN);
        user.setEnabled(true);
        user.setAccountLocked(false);
        user.setPassword(passwordEncoder.encode(properties.getPassword().trim()));
        userRepository.save(user);

        log.info("Existing user with email '{}' was synchronized as the bootstrap ADMIN account.", user.getEmail());
    }

    private void createBootstrapAdmin() {
        String resolvedUsername = resolveUniqueUsername(properties.getUsername().trim());

        User bootstrapAdmin = User.builder()
                .firstName(properties.getFirstName().trim())
                .lastName(properties.getLastName().trim())
                .username(resolvedUsername)
                .email(properties.getEmail().trim())
                .password(passwordEncoder.encode(properties.getPassword().trim()))
                .role(Role.ADMIN)
                .enabled(true)
                .accountLocked(false)
                .build();

        userRepository.save(bootstrapAdmin);

        log.info("Bootstrap admin account created successfully with email '{}'.", bootstrapAdmin.getEmail());
    }

    private String resolveUniqueUsername(String preferredUsername) {
        if (!userRepository.existsByUsername(preferredUsername)) {
            return preferredUsername;
        }

        for (int index = 1; index <= MAX_USERNAME_ATTEMPTS; index++) {
            String candidate = preferredUsername + index;

            if (!userRepository.existsByUsername(candidate)) {
                return candidate;
            }
        }

        throw new IllegalStateException("Unable to create a unique username for the bootstrap admin account");
    }
}
