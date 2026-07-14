package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateDocumentRequest;
import org.example.copilote.dto.Request.DocumentSearchRequest;
import org.example.copilote.dto.Request.UpdateDocumentRequest;
import org.example.copilote.dto.Response.DocumentResponse;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.service.DocumentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    public ResponseEntity<PagedResponse<DocumentResponse>> getDocuments(
            @Valid @ModelAttribute DocumentSearchRequest request
    ) {
        return ResponseEntity.ok(documentService.getAllDocuments(request));
    }

    @PostMapping
    public ResponseEntity<DocumentResponse> createDocument(@Valid @RequestBody CreateDocumentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(documentService.createDocument(request));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> createDocumentWithUpload(
            @Valid @RequestPart("metadata") CreateDocumentRequest request,
            @RequestPart("file") org.springframework.web.multipart.MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(documentService.createDocumentWithFile(request, file));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getDocumentById(@PathVariable Long id) {
        return ResponseEntity.ok(documentService.getDocumentById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DocumentResponse> updateDocument(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDocumentRequest request
    ) {
        return ResponseEntity.ok(documentService.updateDocument(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        documentService.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<DocumentResponse>> getDocumentsByProjectId(@PathVariable Long projectId) {
        return ResponseEntity.ok(documentService.getDocumentsByProjectId(projectId));
    }
}
