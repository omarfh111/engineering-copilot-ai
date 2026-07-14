package org.example.copilote.service;

import org.example.copilote.dto.Request.LoginRequest;
import org.example.copilote.dto.Request.RegisterRequest;
import org.example.copilote.dto.Response.AuthResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

}