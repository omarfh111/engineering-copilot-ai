package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiFindingSource(@JsonProperty("source_type") String sourceType, String reference) {}
