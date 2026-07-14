package org.example.copilote.service;

import org.example.copilote.dto.Request.CreateDocumentRequest;
import org.example.copilote.dto.Request.DocumentSearchRequest;
import org.example.copilote.dto.Request.UpdateDocumentRequest;
import org.example.copilote.dto.Response.DocumentResponse;
import org.example.copilote.dto.Response.PagedResponse;

import java.util.List;

public interface DocumentService {

    PagedResponse<DocumentResponse> getAllDocuments(DocumentSearchRequest request);

    DocumentResponse createDocument(CreateDocumentRequest request);

    DocumentResponse getDocumentById(Long id);

    DocumentResponse updateDocument(Long id, UpdateDocumentRequest request);

    void deleteDocument(Long id);

    List<DocumentResponse> getDocumentsByProjectId(Long projectId);
}
