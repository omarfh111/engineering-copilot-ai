package org.example.copilote.service;

import org.example.copilote.dto.Request.CreateProjectRequest;
import org.example.copilote.dto.Request.ProjectSearchRequest;
import org.example.copilote.dto.Request.UpdateProjectRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.ProjectResponse;

public interface ProjectService {

    PagedResponse<ProjectResponse> getAllProjects(ProjectSearchRequest request);

    ProjectResponse createProject(CreateProjectRequest request);

    ProjectResponse getProjectById(Long id);

    ProjectResponse updateProject(Long id, UpdateProjectRequest request);

    void deleteProject(Long id);
}