package org.example.copilote.repository;

import org.example.copilote.entity.TodoProposal;
import org.example.copilote.entity.TodoProposalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TodoProposalRepository extends JpaRepository<TodoProposal, Long> {
    List<TodoProposal> findByAnalysisAnalysisIdOrderByCreatedAtDesc(Long analysisId);
    List<TodoProposal> findByProposalIdInAndAnalysisAnalysisId(Collection<Long> proposalIds, Long analysisId);
    boolean existsByFindingFindingIdAndStatus(Long findingId, TodoProposalStatus status);
}
