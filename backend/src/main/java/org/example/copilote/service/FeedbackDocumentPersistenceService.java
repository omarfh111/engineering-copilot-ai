package org.example.copilote.service;

import lombok.RequiredArgsConstructor;
import org.example.copilote.entity.Document;
import org.example.copilote.entity.DocumentIndexingStatus;
import org.example.copilote.entity.DocumentType;
import org.example.copilote.entity.Project;
import org.example.copilote.repository.DocumentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Keeps PostgreSQL transactions short while an external indexing call happens later. */
@Service
@RequiredArgsConstructor
public class FeedbackDocumentPersistenceService {
    private final DocumentRepository documentRepository;

    @Transactional
    public Document createPending(Project project, String title, String path) {
        if (documentRepository.existsByTitleAndProjectProjectId(title, project.getProjectId())) {
            throw new IllegalArgumentException("This approved feedback is already in project knowledge");
        }
        return documentRepository.save(Document.builder()
                .title(title)
                .description("Human-approved analysis feedback. Indexing status is tracked separately.")
                .type(DocumentType.MD)
                .path(path)
                .source("approved_human_feedback")
                .indexingStatus(DocumentIndexingStatus.PENDING)
                .project(project)
                .build());
    }

    @Transactional
    public void markStatus(Long documentId, DocumentIndexingStatus status) {
        documentRepository.findById(documentId).ifPresent(document -> document.setIndexingStatus(status));
    }
}
