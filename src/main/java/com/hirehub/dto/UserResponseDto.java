package com.hirehub.dto;

import com.hirehub.entity.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponseDto {

    private Long id;

    private String firstName;

    private String lastName;

    private String email;

    private Role role ;
}
