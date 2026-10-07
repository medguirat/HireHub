package com.hirehub.security;

import com.hirehub.entity.User;
import com.hirehub.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return new AppUserDetails(user.getEmail(), user.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())), user.getCredentialsChangedAt());
    }

    /** Spring's user, plus when the password last changed (login tokens issued before that are refused). */
    public static class AppUserDetails extends org.springframework.security.core.userdetails.User {

        private final Instant credentialsChangedAt;

        public AppUserDetails(String username, String password, List<SimpleGrantedAuthority> authorities,
                              Instant credentialsChangedAt) {
            super(username, password, authorities);
            this.credentialsChangedAt = credentialsChangedAt;
        }

        /** A token issued before the last password change no longer signs anyone in. */
        public boolean acceptsTokenIssuedAt(Instant issuedAt) {
            if (credentialsChangedAt == null) {
                return true;
            }
            // Token times have second precision: compare at that precision.
            return issuedAt != null && !issuedAt.isBefore(credentialsChangedAt.truncatedTo(ChronoUnit.SECONDS));
        }
    }
}
