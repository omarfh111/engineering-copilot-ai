package org.example.copilote.security;

import lombok.RequiredArgsConstructor;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.User;
import org.example.copilote.exception.AuthenticationFailedException;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.UserRepository;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new AuthenticationFailedException("User is not authenticated");
        }

        String email = extractAuthenticatedEmail(authentication);

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
    }

    public boolean isAdmin(User user) {
        if (user == null) {
            throw new AuthenticationFailedException("Authenticated user is missing");
        }

        return user.getRole().normalized() == Role.ADMIN;
    }

    public boolean hasRole(User user, Role role) {
        if (user == null) {
            throw new AuthenticationFailedException("Authenticated user is missing");
        }

        return user.getRole().normalized() == role.normalized();
    }

    private String extractAuthenticatedEmail(Authentication authentication) {
        Object principal = authentication.getPrincipal();

        if (principal instanceof UserDetails userDetails && StringUtils.hasText(userDetails.getUsername())) {
            return userDetails.getUsername().trim();
        }

        if (StringUtils.hasText(authentication.getName())) {
            return authentication.getName().trim();
        }

        throw new AuthenticationFailedException("Authenticated user email is missing");
    }
}
