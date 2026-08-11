package org.example.copilote.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.example.copilote.dto.Request.ChangePasswordRequest;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateUserRequest;
import org.example.copilote.dto.Request.UserSearchRequest;
import org.example.copilote.dto.Request.UserUpdateRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.UserResponse;
import org.example.copilote.entity.AuditLogStatus;
import org.example.copilote.entity.User;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.AuditLogService;
import org.example.copilote.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuditLogService auditLogService;
    private final CurrentUserProvider currentUserProvider;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<PagedResponse<UserResponse>> getAllUsers(@Valid @ModelAttribute UserSearchRequest request) {
        return ResponseEntity.ok(userService.getAllUsers(request));
    }

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUserProfile() {
        return ResponseEntity.ok(userService.getCurrentUserProfile());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request,
            HttpServletRequest servletRequest
    ) {
        User currentUser = currentUserProvider.getCurrentUser();
        String action = currentUser.getId().equals(id) ? "Updated own profile" : "Updated user profile";
        String ipAddress = AuditLogController.resolveClientIp(servletRequest);

        try {
            UserResponse response = userService.updateUser(id, request);
            recordAuditSafely(currentUser, action, ipAddress, AuditLogStatus.SUCCESS);
            return ResponseEntity.ok(response);
        } catch (RuntimeException exception) {
            recordAuditSafely(currentUser, action, ipAddress, AuditLogStatus.FAILURE);
            throw exception;
        }
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> changeCurrentUserPassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest servletRequest
    ) {
        User currentUser = currentUserProvider.getCurrentUser();
        String ipAddress = AuditLogController.resolveClientIp(servletRequest);

        try {
            if (!passwordEncoder.matches(request.getCurrentPassword(), currentUser.getPassword())) {
                throw new IllegalArgumentException("Current password is incorrect");
            }

            userService.updateUser(currentUser.getId(), buildPasswordUpdateRequest(currentUser, request.getNewPassword()));
            recordAuditSafely(currentUser, "User changed security password", ipAddress, AuditLogStatus.SUCCESS);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException exception) {
            recordAuditSafely(currentUser, "User changed security password", ipAddress, AuditLogStatus.FAILURE);
            throw exception;
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    private UserUpdateRequest buildPasswordUpdateRequest(User currentUser, String newPassword) {
        UserUpdateRequest request = new UserUpdateRequest();
        request.setFirstName(currentUser.getFirstName());
        request.setLastName(currentUser.getLastName());
        request.setUsername(currentUser.getUsername());
        request.setEmail(currentUser.getEmail());
        request.setPassword(newPassword);
        return request;
    }

    private void recordAuditSafely(User currentUser, String action, String ipAddress, AuditLogStatus status) {
        try {
            auditLogService.record(currentUser, action, ipAddress, status);
        } catch (RuntimeException ignored) {
            // Audit persistence must not block profile or password changes.
        }
    }
}
