package org.example.copilote.repository;

import org.example.copilote.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long>, JpaSpecificationExecutor<Team> {

    boolean existsByTeamName(String teamName);

    boolean existsByTeamNameAndTeamIdNot(String teamName, Long teamId);

}
