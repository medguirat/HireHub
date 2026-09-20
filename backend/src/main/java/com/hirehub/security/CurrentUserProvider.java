package com.hirehub.security;

import com.hirehub.entity.Role;
import com.hirehub.entity.User;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import com.hirehub.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public CurrentUserProvider(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getAuthenticatedUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }


    public User requireRole(UserDetails userDetails, Role expectedRole) {
        User user = getAuthenticatedUser(userDetails);

        if (user.getRole() != expectedRole) {
            throw new BadRequestException(
                    "This action requires the " + expectedRole + " role."
            );
        }

        return user;
    }
}