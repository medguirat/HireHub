package com.hirehub.controller;

import com.hirehub.dto.UpdateBasicInfoDto;
import com.hirehub.dto.UserRequestDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.User;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final CurrentUserProvider currentUserProvider;

    public UserController(UserService userService, CurrentUserProvider currentUserProvider) {
        this.userService = userService;
        this.currentUserProvider = currentUserProvider;
    }

    // No endpoint lists users or looks one up by ID: that exposed every account's name, email and
    // role to any signed-in user, and no screen needs it (there is no admin role).


    @GetMapping("/me")
    public UserResponseDto getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User user = currentUserProvider.getAuthenticatedUser(userDetails);
        return userService.getMyProfile(user);
    }

    @PutMapping("/me")
    public UserResponseDto updateMyBasicInfo(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateBasicInfoDto dto
    ) {
        User user = currentUserProvider.getAuthenticatedUser(userDetails);
        return userService.updateBasicInfo(user, dto);
    }

    @PostMapping
    public UserResponseDto createUser(@Valid @RequestBody UserRequestDto user) {
        return userService.createUser(user);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id,
                           @AuthenticationPrincipal UserDetails userDetails) {
        User currentUser = currentUserProvider.getAuthenticatedUser(userDetails);
        userService.deleteUser(id, currentUser);
    }
}