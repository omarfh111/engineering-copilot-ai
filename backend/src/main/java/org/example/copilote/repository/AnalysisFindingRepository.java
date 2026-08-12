package org.example.copilote.repository;

import org.example.copilote.entity.AnalysisFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AnalysisFindingRepository extends JpaRepository<AnalysisFinding, Long> {
    List<AnalysisFinding> findByAnalysisAnalysisId(Long analysisId);
    Optional<AnalysisFinding> findByAnalysisAnalysisIdAndFindingKey(Long analysisId, String findingKey);
    void deleteByAnalysisAnalysisId(Long analysisId);
}
