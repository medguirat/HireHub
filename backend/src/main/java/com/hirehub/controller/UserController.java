package com.hirehub.controller;

import com.hirehub.dto.PageResponseDto;
import com.hirehub.dto.UpdateBasicInfoDto;
import com.hirehub.dto.UserRequestDto;
import com.hirehub.dto.UserResponseDto;
import com.hirehub.entity.User;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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

    @GetMapping
    public PageResponseDto<UserResponseDto> getAllUsers(
            @PageableDefault(size = 10, sort = "id") Pageable pageable
    ) {
        return PageResponseDto.from(userService.getAllUsers(pageable));
    }

    @GetMapping("/{id}")
    public UserResponseDto getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }


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