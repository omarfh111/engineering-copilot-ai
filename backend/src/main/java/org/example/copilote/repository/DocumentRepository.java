package org.example.copilote.repository;

import org.example.copilote.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long>, JpaSpecificationExecutor<Document> {

    boolean existsByTitleAndProjectProjectId(String title, Long projectId);

    boolean existsByTitleAndProjectProjectIdAndDocIdNot(String title, Long projectId, Long docId);

    List<Document> findByProjectProjectId(Long projectId);
}
