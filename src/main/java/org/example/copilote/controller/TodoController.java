package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.TodoSearchRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.TodoSummaryResponse;
import org.example.copilote.service.WorkspaceReadService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TodoController {

    private final WorkspaceReadService workspaceReadService;

    @GetMapping
    public ResponseEntity<PagedResponse<TodoSummaryResponse>> getTodos(@Valid @ModelAttribute TodoSearchRequest request) {
        return ResponseEntity.ok(workspaceReadService.getTodos(request));
    }
}
