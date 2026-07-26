package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiFindingLocation(String path, @JsonProperty("line_start") Integer lineStart) {}
