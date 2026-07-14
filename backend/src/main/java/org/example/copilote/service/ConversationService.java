package org.example.copilote.service;

import org.example.copilote.dto.Request.ConversationSearchRequest;
import org.example.copilote.dto.Request.CreateConversationRequest;
import org.example.copilote.dto.Request.UpdateConversationRequest;
import org.example.copilote.dto.Response.ConversationResponse;
import org.example.copilote.dto.Response.PagedResponse;

import java.util.List;

public interface ConversationService {

    PagedResponse<ConversationResponse> getAllConversations(ConversationSearchRequest request);

    ConversationResponse createConversation(CreateConversationRequest request);

    ConversationResponse getConversationById(Long id);

    ConversationResponse updateConversation(Long id, UpdateConversationRequest request);

    void deleteConversation(Long id);

    List<ConversationResponse> getConversationsByProject(Long projectId);
}
