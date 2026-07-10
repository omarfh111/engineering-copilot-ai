package org.example.copilote.repository;

import org.example.copilote.entity.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface RepositoryRepository extends JpaRepository<Repository, Long>, JpaSpecificationExecutor<Repository> {

    boolean existsByUrl(String url);

    boolean existsByUrlAndRepoIdNot(String url, Long repoId);

    List<Repository> findByProjectProjectId(Long projectId);
}
