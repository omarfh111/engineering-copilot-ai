package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateUserRequest;
import org.example.copilote.dto.Request.UserSearchRequest;
import org.example.copilote.dto.Request.UserUpdateRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.TeamSummaryResponse;
import org.example.copilote.dto.Response.UserResponse;
import org.example.copilote.entity.Role;
import org.example.copilote.entity.Team;
import org.example.copilote.entity.User;
import org.example.copilote.exception.DuplicateResourceException;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.TeamRepository;
import org.example.copilote.repository.UserRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id",
            "firstName",
            "lastName",
            "username",
            "email",
            "role",
            "enabled",
            "accountLocked",
            "createdAt",
            "updatedAt"
    );

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> getAllUsers(UserSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        if (request == null) {
            request = new UserSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(sortDirection, sortBy)
        );

        Specification<User> specification = buildSpecification(request);

        Page<User> userPage = userRepository.findAll(specification, pageable);

        List<UserResponse> content = userPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();

        return PagedResponse.<UserResponse>builder()
                .content(content)
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .first(userPage.isFirst())
                .last(userPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    @Override
    public UserResponse createUser(CreateUserRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        String firstName = safeTrim(request.getFirstName());
        String lastName = safeTrim(request.getLastName());
        String username = safeTrim(request.getUsername());
        String email = safeTrim(request.getEmail());
        String password = safeTrim(request.getPassword());

        validateUniqueFields(email, username);

        User user = User.builder()
                .firstName(firstName)
                .lastName(lastName)
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(normalizeRole(request.getRole()))
                .enabled(true)
                .accountLocked(false)
                .build();

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        User targetUser = findUserById(id);

        ensureAdminOrSelf(currentUser, targetUser);

        return mapToResponse(targetUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUserProfile() {
        return mapToResponse(currentUserProvider.getCurrentUser());
    }

    @Override
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        User targetUser = findUserById(id);

        boolean admin = currentUserProvider.isAdmin(currentUser);
        boolean self = currentUser.getId().equals(targetUser.getId());

        if (!admin && !self) {
            throw new AccessDeniedException("You are not allowed to update this user");
        }

        if (!admin) {
            validateRestrictedFields(request);
        }

        String firstName = safeTrim(request.getFirstName());
        String lastName = safeTrim(request.getLastName());
        String username = safeTrim(request.getUsername());
        String email = safeTrim(request.getEmail());

        validateUniqueFields(id, email, username);

        targetUser.setFirstName(firstName);
        targetUser.setLastName(lastName);
        targetUser.setUsername(username);
        targetUser.setEmail(email);

        if (StringUtils.hasText(request.getPassword())) {
            targetUser.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        if (admin) {
            if (request.getRole() != null) {
                targetUser.setRole(normalizeRole(request.getRole()));
            }

            if (request.getEnabled() != null) {
                targetUser.setEnabled(request.getEnabled());
            }

            if (request.getAccountLocked() != null) {
                targetUser.setAccountLocked(request.getAccountLocked());
            }
        }

        User savedUser = userRepository.save(targetUser);
        return mapToResponse(savedUser);
    }

    @Override
    public void deleteUser(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        User targetUser = findUserById(id);

        if (currentUser.getId().equals(targetUser.getId())) {
            throw new AccessDeniedException("You cannot delete your own account");
        }

        List<Team> teams = new ArrayList<>(targetUser.getTeams());

        for (Team team : teams) {
            team.getUsers().removeIf(member -> member.getId().equals(targetUser.getId()));

            if (team.getLeader() != null && team.getLeader().getId().equals(targetUser.getId())) {
                team.setLeader(null);
            }
        }

        targetUser.getTeams().clear();
        teamRepository.saveAll(teams);
        userRepository.delete(targetUser);
    }

    private Specification<User> buildSpecification(UserSearchRequest request) {
        Specification<User> specification =
                (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            Specification<User> searchSpec = (root, query, criteriaBuilder) ->
                    criteriaBuilder.or(
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("firstName")), normalizedSearch),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("lastName")), normalizedSearch),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("username")), normalizedSearch),
                            criteriaBuilder.like(criteriaBuilder.lower(root.get("email")), normalizedSearch)
                    );

            specification = specification.and(searchSpec);
        }

        if (request != null && request.getRole() != null) {
            Role normalizedRole = normalizeRole(request.getRole());

            Specification<User> roleSpec;

            if (normalizedRole == Role.MANAGER) {
                roleSpec = (root, query, criteriaBuilder) ->
                        criteriaBuilder.or(
                                criteriaBuilder.equal(root.get("role"), Role.MANAGER),
                                criteriaBuilder.equal(root.get("role"), Role.AUDITOR)
                        );
            } else {
                roleSpec = (root, query, criteriaBuilder) ->
                        criteriaBuilder.equal(root.get("role"), normalizedRole);
            }

            specification = specification.and(roleSpec);
        }

        return specification;
    }
    private User findUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    private void ensureAdmin(User currentUser) {
        if (!currentUserProvider.isAdmin(currentUser)) {
            throw new AccessDeniedException("You are not allowed to perform this action");
        }
    }

    private void ensureAdminOrSelf(User currentUser, User targetUser) {
        if (!currentUserProvider.isAdmin(currentUser) && !currentUser.getId().equals(targetUser.getId())) {
            throw new AccessDeniedException("You are not allowed to access this user");
        }
    }

    private void validateRestrictedFields(UserUpdateRequest request) {
        if (request.getRole() != null || request.getEnabled() != null || request.getAccountLocked() != null) {
            throw new AccessDeniedException("Only administrators can update role or account status");
        }
    }

    private void validateUniqueFields(String email, String username) {
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email already exists");
        }

        if (userRepository.existsByUsername(username)) {
            throw new DuplicateResourceException("Username already exists");
        }
    }

    private void validateUniqueFields(Long id, String email, String username) {
        if (userRepository.existsByEmailAndIdNot(email, id)) {
            throw new DuplicateResourceException("Email already exists");
        }

        if (userRepository.existsByUsernameAndIdNot(username, id)) {
            throw new DuplicateResourceException("Username already exists");
        }
    }

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "createdAt";
        }

        String normalizedSortBy = sortBy.trim();

        if (!ALLOWED_SORT_FIELDS.contains(normalizedSortBy)) {
            throw new IllegalArgumentException("Invalid sortBy value: " + normalizedSortBy);
        }

        return normalizedSortBy;
    }

    private Sort.Direction resolveSortDirection(String sortDirection) {
        if (!StringUtils.hasText(sortDirection)) {
            return Sort.Direction.DESC;
        }

        return Sort.Direction.fromString(sortDirection.trim());
    }

    private UserResponse mapToResponse(User user) {
        List<TeamSummaryResponse> teams = user.getTeams()
                .stream()
                .sorted(Comparator.comparing(Team::getTeamName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(this::mapTeamSummaryResponse)
                .toList();

        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(normalizeRole(user.getRole()))
                .teams(teams)
                .enabled(user.isEnabled())
                .accountLocked(user.isAccountLocked())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private TeamSummaryResponse mapTeamSummaryResponse(Team team) {
        return TeamSummaryResponse.builder()
                .id(team.getTeamId())
                .teamId(team.getTeamId())
                .name(team.getTeamName())
                .teamName(team.getTeamName())
                .description(team.getDescription())
                .projectCount(team.getProjects() == null ? 0 : team.getProjects().size())
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }

    private Role normalizeRole(Role role) {
        return role == null ? null : role.normalized();
    }

    private String safeTrim(String value) {
        return value == null ? null : value.trim();
    }
}
