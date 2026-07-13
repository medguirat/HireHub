package com.hirehub.controller;

import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.User;
import com.hirehub.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {


    private final UserService userService;


    public UserController(UserService userService) {
        this.userService = userService;
    }


    @GetMapping
    public List<UserResponseDto> getAllUsers() {
        return userService.getAllUsers();
    }


    @GetMapping("/{id}")
    public UserResponseDto getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }


    @PostMapping
    public UserResponseDto createUser(@RequestBody User user) {
        return userService.createUser(user);
    }


    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }
}