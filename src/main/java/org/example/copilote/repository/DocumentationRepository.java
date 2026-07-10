package org.example.copilote.repository;

import org.example.copilote.entity.Documentation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface DocumentationRepository extends JpaRepository<Documentation, Long>, JpaSpecificationExecutor<Documentation> {

    List<Documentation> findByProjectProjectId(Long projectId);

    boolean existsByTitleAndProjectProjectId(String title, Long projectId);

    boolean existsByTitleAndProjectProjectIdAndDocumentationIdNot(String title, Long projectId, Long documentationId);
}
