package org.example.copilote.service;

import org.example.copilote.dto.Request.AssistantAskRequest;
import org.example.copilote.dto.Response.AssistantAnswerResponse;

/**
 * Business entry point for the AI assistant. Sits between the controller and
 * the {@code AiRagClient}, so authorization, auditing and DTO mapping stay on
 * the SAE side of the boundary.
 */
public interface AssistantService {

    /** Answer a technical question via the IA RAG pipeline. */
    AssistantAnswerResponse ask(AssistantAskRequest request);

    /** Whether the IA service is currently reachable. */
    boolean isAiHealthy();
}
