package org.example.copilote.service;

import org.example.copilote.dto.Request.CreateRepositoryRequest;
import org.example.copilote.dto.Request.RepositorySearchRequest;
import org.example.copilote.dto.Request.UpdateRepositoryRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.RepositoryResponse;

import java.util.List;

public interface RepositoryService {

    PagedResponse<RepositoryResponse> getAllRepositories(RepositorySearchRequest request);

    RepositoryResponse createRepository(CreateRepositoryRequest request);

    RepositoryResponse getRepositoryById(Long id);

    RepositoryResponse updateRepository(Long id, UpdateRepositoryRequest request);

    void deleteRepository(Long id);

    List<RepositoryResponse> getRepositoriesByProjectId(Long projectId);
}
