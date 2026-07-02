package org.example.copilote.repository;

import org.example.copilote.entity.Analysis;
import org.example.copilote.entity.AnalysisStatus;
import org.example.copilote.entity.AnalysisType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalysisRepository extends JpaRepository<Analysis, Long> {

    List<Analysis> findByStatus(AnalysisStatus status);

    List<Analysis> findByType(AnalysisType type);

    Page<Analysis> findByStatus(AnalysisStatus status, Pageable pageable);

    Page<Analysis> findByType(AnalysisType type, Pageable pageable);

    Page<Analysis> findByStatusAndType(AnalysisStatus status, AnalysisType type, Pageable pageable);

}
