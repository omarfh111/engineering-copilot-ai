package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiApprovedFinding(String agent, AiFinding finding,
                                @JsonProperty("approved_by") Long approvedBy) {}
