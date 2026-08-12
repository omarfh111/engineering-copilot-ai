package org.example.copilote.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.copilote.dto.Request.CreateTodoRequest;
import org.example.copilote.dto.Request.TodoSearchRequest;
import org.example.copilote.dto.Request.UpdateTodoRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.TodoResponse;
import org.example.copilote.service.TodoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;

    @GetMapping
    public ResponseEntity<PagedResponse<TodoResponse>> getTodos(@Valid @ModelAttribute TodoSearchRequest request) {
        return ResponseEntity.ok(todoService.getAllTodos(request));
    }

    @PostMapping
    public ResponseEntity<TodoResponse> createTodo(@Valid @RequestBody CreateTodoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(todoService.createTodo(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TodoResponse> getTodoById(@PathVariable Long id) {
        return ResponseEntity.ok(todoService.getTodoById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TodoResponse> updateTodo(
            @PathVariable Long id,
            @Valid @RequestBody UpdateTodoRequest request
    ) {
        return ResponseEntity.ok(todoService.updateTodo(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(@PathVariable Long id) {
        todoService.deleteTodo(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<TodoResponse>> getTodosByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(todoService.getTodosByProject(projectId));
    }

    @GetMapping("/analysis/{analysisId}")
    public ResponseEntity<List<TodoResponse>> getTodosByAnalysis(@PathVariable Long analysisId) {
        return ResponseEntity.ok(todoService.getTodosByAnalysis(analysisId));
    }
}
