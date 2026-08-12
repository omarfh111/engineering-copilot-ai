package org.example.copilote.repository;

import org.example.copilote.entity.Conversation;
import org.example.copilote.entity.Project;
import org.example.copilote.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long>, JpaSpecificationExecutor<Conversation> {

    List<Conversation> findByUser(User user);

    List<Conversation> findByProject(Project project);

    List<Conversation> findByQuestionContainingIgnoreCase(String keyword);

    List<Conversation> findByResponseContainingIgnoreCase(String keyword);

    List<Conversation> findByProjectProjectId(Long projectId);
}
