package com.hirehub.dto;

import com.hirehub.entity.Role;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequestDto {

    private String firstName;

    private String lastName;

    private String email;

    private String password ;

    private Role role;

}
