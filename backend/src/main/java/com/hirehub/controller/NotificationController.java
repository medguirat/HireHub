package com.hirehub.controller;

import com.hirehub.entity.Notification;
import com.hirehub.entity.User;
import com.hirehub.repository.NotificationRepository;
import com.hirehub.security.CurrentUserProvider;
import com.hirehub.exception.BadRequestException;
import com.hirehub.exception.ResourceNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final CurrentUserProvider currentUserProvider;

    public NotificationController(NotificationRepository notificationRepository,
                                  CurrentUserProvider currentUserProvider) {
        this.notificationRepository = notificationRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public List<Notification> getMyNotifications(@AuthenticationPrincipal UserDetails userDetails) {
        User user = currentUserProvider.getAuthenticatedUser(userDetails);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    @PutMapping("/{id}/read")
    public Notification markAsRead(@PathVariable Long id, @AuthenticationPrincipal UserDetails userDetails) {
        User user = currentUserProvider.getAuthenticatedUser(userDetails);
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("You are not allowed to modify this notification.");
        }

        notification.setRead(true);
        return notificationRepository.save(notification);
    }
}
