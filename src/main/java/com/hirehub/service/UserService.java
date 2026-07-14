package com.hirehub.service;

import com.hirehub.dto.UserRequestDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.User;
import com.hirehub.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;


    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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


    public UserResponseDto createUser(UserRequestDto userRequestDto) {
        User user = User.builder()
                .firstName(userRequestDto.getFirstName())
                .lastName(userRequestDto.getLastName())
                .email(userRequestDto.getEmail())
                .password(passwordEncoder.encode(userRequestDto.getPassword()))
                .role(userRequestDto.getRole())
                .build();


        User savedUser = userRepository.save(user);
        return UserResponseDto.builder()
                .id(savedUser.getId())
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