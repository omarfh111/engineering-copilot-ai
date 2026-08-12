package org.example.copilote.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "analysis_findings", uniqueConstraints = @UniqueConstraint(columnNames = {"analysis_id", "finding_key"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AnalysisFinding {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long findingId;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "analysis_id", nullable = false)
    private Analysis analysis;
    @Column(name = "finding_key", nullable = false, length = 180)
    private String findingKey;
    @Column(nullable = false, length = 80)
    private String agent;
    @Column(nullable = false, length = 250)
    private String title;
    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Severity severity;
    private Double confidence;
    @Column(columnDefinition = "TEXT") private String evidence;
    @Column(columnDefinition = "TEXT") private String recommendation;
    @Column(length = 500) private String filePath;
    private Integer lineStart;
    @Column(columnDefinition = "TEXT") private String sourcesJson;
}
