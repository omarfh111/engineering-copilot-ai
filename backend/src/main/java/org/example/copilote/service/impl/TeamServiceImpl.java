package org.example.copilote.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateTeamRequest;
import org.example.copilote.dto.Request.TeamSearchRequest;
import org.example.copilote.dto.Request.UpdateTeamRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.TeamMemberResponse;
import org.example.copilote.dto.Response.TeamResponse;
import org.example.copilote.entity.Team;
import org.example.copilote.entity.User;
import org.example.copilote.exception.DuplicateResourceException;
import org.example.copilote.exception.ResourceNotFoundException;
import org.example.copilote.repository.TeamRepository;
import org.example.copilote.repository.UserRepository;
import org.example.copilote.security.CurrentUserProvider;
import org.example.copilote.service.TeamService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamServiceImpl implements TeamService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "teamId",
            "teamName",
            "createdAt",
            "updatedAt"
    );

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<TeamResponse> getAllTeams(TeamSearchRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        if (request == null) {
            request = new TeamSearchRequest();
        }

        String sortBy = resolveSortBy(request.getSortBy());
        Sort.Direction sortDirection = resolveSortDirection(request.getSortDirection());

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                Sort.by(sortDirection, sortBy)
        );

        Page<Team> teamPage = teamRepository.findAll(buildSpecification(request), pageable);

        List<TeamResponse> content = teamPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .toList();

        return PagedResponse.<TeamResponse>builder()
                .content(content)
                .page(teamPage.getNumber())
                .size(teamPage.getSize())
                .totalElements(teamPage.getTotalElements())
                .totalPages(teamPage.getTotalPages())
                .first(teamPage.isFirst())
                .last(teamPage.isLast())
                .sortBy(sortBy)
                .sortDirection(sortDirection.name().toLowerCase())
                .build();
    }

    @Override
    public TeamResponse createTeam(CreateTeamRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        String teamName = safeTrim(request.getTeamName());
        String description = safeTrim(request.getDescription());

        validateUniqueTeamName(teamName);

        Team team = Team.builder()
                .teamName(teamName)
                .description(description)
                .build();

        return mapToResponse(teamRepository.save(team));
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponse getTeamById(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        return mapToResponse(findTeamById(id));
    }

    @Override
    public TeamResponse updateTeam(Long id, UpdateTeamRequest request) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Team team = findTeamById(id);

        String teamName = safeTrim(request.getTeamName());
        String description = safeTrim(request.getDescription());

        validateUniqueTeamName(id, teamName);

        team.setTeamName(teamName);
        team.setDescription(description);

        return mapToResponse(teamRepository.save(team));
    }

    @Override
    public void deleteTeam(Long id) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Team team = findTeamById(id);

        if (team.getProjects() != null && !team.getProjects().isEmpty()) {
            throw new IllegalArgumentException("Team cannot be deleted while projects are still linked to it");
        }

        for (User member : team.getUsers()) {
            member.getTeams().removeIf(userTeam -> userTeam.getTeamId().equals(team.getTeamId()));
        }

        team.getUsers().clear();
        teamRepository.delete(team);
    }

    @Override
    public TeamResponse addUserToTeam(Long teamId, Long userId) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Team team = findTeamById(teamId);
        User user = findUserById(userId);

        if (isTeamMember(team, userId)) {
            throw new IllegalArgumentException("User is already a member of this team");
        }

        attachUserToTeam(team, user);

        return mapToResponse(teamRepository.save(team));
    }

    @Override
    public TeamResponse removeUserFromTeam(Long teamId, Long userId) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Team team = findTeamById(teamId);
        User user = findUserById(userId);

        boolean removed = team.getUsers().removeIf(member -> member.getId().equals(userId));

        if (!removed) {
            throw new ResourceNotFoundException("User is not a member of this team");
        }

        if (team.getLeader() != null && team.getLeader().getId().equals(userId)) {
            team.setLeader(null);
        }

        user.getTeams().removeIf(userTeam -> userTeam.getTeamId().equals(teamId));

        return mapToResponse(teamRepository.save(team));
    }

    @Override
    public TeamResponse assignTeamLeader(Long teamId, Long userId) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Team team = findTeamById(teamId);
        User user = findUserById(userId);

        if (!isTeamMember(team, userId)) {
            attachUserToTeam(team, user);
        }

        team.setLeader(user);

        return mapToResponse(teamRepository.save(team));
    }

    @Override
    public TeamResponse removeTeamLeader(Long teamId) {
        User currentUser = currentUserProvider.getCurrentUser();
        ensureAdmin(currentUser);

        Team team = findTeamById(teamId);
        team.setLeader(null);

        return mapToResponse(teamRepository.save(team));
    }

    private Team findTeamById(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + id));
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

    private void validateUniqueTeamName(String teamName) {
        if (teamRepository.existsByTeamName(teamName)) {
            throw new DuplicateResourceException("Team name already exists");
        }
    }

    private void validateUniqueTeamName(Long id, String teamName) {
        if (teamRepository.existsByTeamNameAndTeamIdNot(teamName, id)) {
            throw new DuplicateResourceException("Team name already exists");
        }
    }

    private Specification<Team> buildSpecification(TeamSearchRequest request) {
        Specification<Team> specification = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (request != null && StringUtils.hasText(request.getSearch())) {
            String normalizedSearch = "%" + request.getSearch().trim().toLowerCase() + "%";

            Specification<Team> searchSpecification = (root, query, criteriaBuilder) -> {
                query.distinct(true);

                var usersJoin = root.join("users", jakarta.persistence.criteria.JoinType.LEFT);

                return criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("teamName")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(usersJoin.get("firstName")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(usersJoin.get("lastName")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(usersJoin.get("username")), normalizedSearch),
                        criteriaBuilder.like(criteriaBuilder.lower(usersJoin.get("email")), normalizedSearch)
                );
            };

            specification = specification.and(searchSpecification);
        }

        return specification;
    }

    private String resolveSortBy(String sortBy) {
        if (!StringUtils.hasText(sortBy)) {
            return "createdAt";
        }

        String normalizedSortBy = sortBy.trim();

        if ("id".equals(normalizedSortBy)) {
            return "teamId";
        }

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

    private boolean isTeamMember(Team team, Long userId) {
        return team.getUsers()
                .stream()
                .anyMatch(member -> member.getId().equals(userId));
    }

    private void attachUserToTeam(Team team, User user) {
        team.getUsers().add(user);

        if (user.getTeams().stream().noneMatch(userTeam -> userTeam.getTeamId().equals(team.getTeamId()))) {
            user.getTeams().add(team);
        }
    }

    private TeamResponse mapToResponse(Team team) {
        List<TeamMemberResponse> members = team.getUsers()
                .stream()
                .sorted(Comparator.comparing(User::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(User::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(this::mapMemberResponse)
                .toList();

        TeamMemberResponse leader = team.getLeader() == null ? null : mapMemberResponse(team.getLeader());

        return TeamResponse.builder()
                .id(team.getTeamId())
                .teamName(team.getTeamName())
                .description(team.getDescription())
                .memberCount(members.size())
                .projectCount(team.getProjects() == null ? 0 : team.getProjects().size())
                .members(members)
                .leader(leader)
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }

    private TeamMemberResponse mapMemberResponse(User user) {
        return TeamMemberResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole() == null ? null : user.getRole().normalized())
                .enabled(user.isEnabled())
                .accountLocked(user.isAccountLocked())
                .build();
    }

    private String safeTrim(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }
}
