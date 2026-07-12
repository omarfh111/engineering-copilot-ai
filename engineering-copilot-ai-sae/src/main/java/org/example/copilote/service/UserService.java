package org.example.copilote.service;

import org.example.copilote.dto.Request.CreateUserRequest;
import org.example.copilote.dto.Request.UserSearchRequest;
import org.example.copilote.dto.Request.UserUpdateRequest;
import org.example.copilote.dto.Response.PagedResponse;
import org.example.copilote.dto.Response.UserResponse;

public interface UserService {

    PagedResponse<UserResponse> getAllUsers(UserSearchRequest request);

    UserResponse createUser(CreateUserRequest request);

    UserResponse getUserById(Long id);

    UserResponse getCurrentUserProfile();

    UserResponse updateUser(Long id, UserUpdateRequest request);

    void deleteUser(Long id);
}
