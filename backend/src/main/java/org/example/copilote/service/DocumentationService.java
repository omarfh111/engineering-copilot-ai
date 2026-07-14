package org.example.copilote.service;

import org.example.copilote.dto.Request.CreateDocumentationRequest;
import org.example.copilote.dto.Request.DocumentationSearchRequest;
import org.example.copilote.dto.Request.UpdateDocumentationRequest;
import org.example.copilote.dto.Response.DocumentationResponse;
import org.example.copilote.dto.Response.PagedResponse;

import java.util.List;

public interface DocumentationService {

    PagedResponse<DocumentationResponse> getAllDocumentation(DocumentationSearchRequest request);

    DocumentationResponse createDocumentation(CreateDocumentationRequest request);

    DocumentationResponse getDocumentationById(Long id);

    DocumentationResponse updateDocumentation(Long id, UpdateDocumentationRequest request);

    void deleteDocumentation(Long id);

    List<DocumentationResponse> getDocumentationByProjectId(Long projectId);
}
