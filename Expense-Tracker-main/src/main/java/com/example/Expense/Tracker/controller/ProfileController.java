package com.example.Expense.Tracker.controller;

import com.example.Expense.Tracker.model.User;
import com.example.Expense.Tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/ExpTrack/profile")
@CrossOrigin
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    private boolean isOwner(String username) {
        String authenticatedUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        return authenticatedUsername.equals(username);
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getProfile(@PathVariable String username) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only view your own profile");
        }
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("currency", user.getCurrency() == null ? "USD" : user.getCurrency());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{username}")
    public ResponseEntity<?> updateProfile(@PathVariable String username, @RequestBody Map<String, String> body) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only update your own profile");
        }
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        if (body.containsKey("avatarUrl")) {
            user.setAvatarUrl(body.get("avatarUrl"));
        }
        if (body.containsKey("currency")) {
            user.setCurrency(body.get("currency"));
        }
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("currency", user.getCurrency());
        return ResponseEntity.ok(response);
    }
}