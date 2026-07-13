package com.hirehub.service;

import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.User;
import com.hirehub.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;


    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }


    public List<UserResponseDto> getAllUsers() {

        List <User> users = userRepository.findAll();

        return users.stream().map(user -> UserResponseDto.builder()
                .id (user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole())
                .build()
        ).toList();
    }


    public UserResponseDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return  UserResponseDto.builder()
                .id (user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();

    }


    public UserResponseDto createUser(User user) {
        User savedUser = userRepository.save(user);
        return UserResponseDto.builder()
                .id (savedUser.getId())
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .email(savedUser.getEmail())
                .role(savedUser.getRole())
                .build();
    }


    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}