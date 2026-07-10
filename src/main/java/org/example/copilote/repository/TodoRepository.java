package org.example.copilote.repository;

import org.example.copilote.entity.Priority;
import org.example.copilote.entity.Todo;
import org.example.copilote.entity.TodoStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TodoRepository extends JpaRepository<Todo, Long>, JpaSpecificationExecutor<Todo> {

    List<Todo> findByStatus(TodoStatus status);

    List<Todo> findByPriority(Priority priority);

    List<Todo> findByTitleContainingIgnoreCase(String title);

    Page<Todo> findByStatus(TodoStatus status, Pageable pageable);

    List<Todo> findByAnalysisAnalysisId(Long analysisId);

    List<Todo> findByAnalysisProjectProjectId(Long projectId);
}
