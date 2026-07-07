package com.tracemybus.api.security;

import com.tracemybus.api.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class UserPrincipal implements UserDetails {

    private final User user;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this.user = user;
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name().toUpperCase()));
    }

    @Override
    public String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getId();
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return user.getActive() != null && user.getActive(); }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return user.getActive() != null && user.getActive(); }
}
