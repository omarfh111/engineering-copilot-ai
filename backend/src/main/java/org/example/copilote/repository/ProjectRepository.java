package org.example.copilote.repository;

import org.example.copilote.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ProjectRepository extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {
    boolean existsByTitle(String title);
    boolean existsByTitleAndProjectIdNot(String title, Long projectId);
}