package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.LoginRequest;
import org.example.copilote.dto.Request.RegisterRequest;
import org.example.copilote.dto.Response.AuthResponse;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.User;
import org.example.copilote.exception.AuthenticationFailedException;
import org.example.copilote.exception.DuplicateResourceException;
import org.example.copilote.repository.UserRepository;
import org.example.copilote.security.CustomUserDetailsService;
import org.example.copilote.security.JwtService;
import org.example.copilote.service.AuthService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final JwtService jwtService;

    @Override
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim();
        String username = request.getUsername().trim();

        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email already exists");
        }

        if (userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Username already exists");
        }

        User user = User.builder()
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.getPassword().trim()))
                .role(Role.DEVELOPER)
                .enabled(true)
                .accountLocked(false)
                .build();

        User savedUser = userRepository.save(user);

        return buildAuthResponse(savedUser, "User registered successfully");
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim();

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
        } catch (AuthenticationException exception) {
            throw new AuthenticationFailedException("Invalid email or password");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthenticationFailedException("Invalid email or password"));

        return buildAuthResponse(user, "Login successful");
    }

    private AuthResponse buildAuthResponse(User user, String message) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtService.generateToken(userDetails, Map.of("role", user.getRole().normalized().name()));

        return new AuthResponse(token, message);
    }
}
