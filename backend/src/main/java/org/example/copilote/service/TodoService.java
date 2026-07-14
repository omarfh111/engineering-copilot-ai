package org.example.copilote.service;

import org.example.copilote.dto.Request.CreateTodoRequest;
import org.example.copilote.dto.Request.TodoSearchRequest;
import org.example.copilote.dto.Request.UpdateTodoRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.TodoResponse;

import java.util.List;

public interface TodoService {

    PagedResponse<TodoResponse> getAllTodos(TodoSearchRequest request);

    TodoResponse createTodo(CreateTodoRequest request);

    TodoResponse getTodoById(Long id);

    TodoResponse updateTodo(Long id, UpdateTodoRequest request);

    void deleteTodo(Long id);

    List<TodoResponse> getTodosByProject(Long projectId);

    List<TodoResponse> getTodosByAnalysis(Long analysisId);
}
