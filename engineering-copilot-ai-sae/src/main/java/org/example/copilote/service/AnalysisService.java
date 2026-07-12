package org.example.copilote.service;

import org.example.copilote.dto.Request.AnalysisSearchRequest;
import org.example.copilote.dto.Request.CreateAnalysisRequest;
import org.example.copilote.dto.Request.UpdateAnalysisRequest;
import org.example.copilote.dto.Response.AnalysisResponse;
import org.example.copilote.dto.Response.PagedResponse;

import java.util.List;

public interface AnalysisService {

    PagedResponse<AnalysisResponse> getAllAnalyses(AnalysisSearchRequest request);

    AnalysisResponse createAnalysis(CreateAnalysisRequest request);

    AnalysisResponse getAnalysisById(Long id);

    AnalysisResponse updateAnalysis(Long id, UpdateAnalysisRequest request);

    void deleteAnalysis(Long id);

    List<AnalysisResponse> getAnalysesByProject(Long projectId);

    List<AnalysisResponse> getRecentAnalyses();
}