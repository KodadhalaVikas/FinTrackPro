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
@RequestMapping("/ExpTrack/budget")
@CrossOrigin
public class BudgetController {

    @Autowired
    private UserRepository userRepository;

    private boolean isOwner(String username) {
        String authenticatedUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        return authenticatedUsername.equals(username);
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getBudget(@PathVariable String username) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only view your own budget");
        }
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        Map<String, Double> response = new HashMap<>();
        response.put("monthlyBudget", user.getMonthlyBudget());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{username}")
    public ResponseEntity<?> setBudget(@PathVariable String username, @RequestBody Map<String, Double> body) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only update your own budget");
        }
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }
        Double newBudget = body.get("monthlyBudget");
        if (newBudget == null || newBudget < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Please provide a valid, non-negative monthlyBudget");
        }
        user.setMonthlyBudget(newBudget);
        userRepository.save(user);

        Map<String, Double> response = new HashMap<>();
        response.put("monthlyBudget", user.getMonthlyBudget());
        return ResponseEntity.ok(response);
    }
}