package org.example.copilote.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record AiFinding(String title, String severity, Double confidence, String evidence,
                        String recommendation, AiFindingLocation location, List<AiFindingSource> sources) {}
