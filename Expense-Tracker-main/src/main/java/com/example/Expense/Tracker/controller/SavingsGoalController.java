package com.example.Expense.Tracker.controller;

import com.example.Expense.Tracker.model.SavingsGoal;
import com.example.Expense.Tracker.model.User;
import com.example.Expense.Tracker.repository.SavingsGoalRepository;
import com.example.Expense.Tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ExpTrack/goals")
@CrossOrigin
public class SavingsGoalController {

    @Autowired
    private SavingsGoalRepository goalRepository;

    @Autowired
    private UserRepository userRepository;

    private boolean isOwner(String username) {
        String authenticatedUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        return authenticatedUsername.equals(username);
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getGoals(@PathVariable String username) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only view your own goals");
        }
        List<SavingsGoal> goals = goalRepository.findByUserUsername(username);
        return ResponseEntity.ok(goals);
    }

    @PostMapping("/{username}")
    public ResponseEntity<?> createGoal(@PathVariable String username, @RequestBody Map<String, Object> body) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only create goals for your own account");
        }
        User user = userRepository.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        String name = (String) body.get("name");
        Object targetRaw = body.get("targetAmount");
        if (name == null || name.isBlank() || targetRaw == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Please provide a goal name and target amount");
        }

        double target = Double.parseDouble(targetRaw.toString());
        if (target <= 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Target amount must be greater than zero");
        }

        SavingsGoal goal = new SavingsGoal();
        goal.setName(name);
        goal.setTargetAmount(target);
        goal.setSavedAmount(0);
        goal.setUser(user);

        return ResponseEntity.ok(goalRepository.save(goal));
    }

    // Adds a contribution amount to an existing goal's saved total.
    @PutMapping("/{username}/{goalId}")
    public ResponseEntity<?> contributeToGoal(@PathVariable String username,
                                               @PathVariable Long goalId,
                                               @RequestBody Map<String, Object> body) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only update your own goals");
        }
        SavingsGoal goal = goalRepository.findByIdAndUserUsername(goalId, username);
        if (goal == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Goal not found");
        }

        Object amountRaw = body.get("amount");
        if (amountRaw == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Please provide an amount");
        }
        double amount = Double.parseDouble(amountRaw.toString());

        goal.setSavedAmount(goal.getSavedAmount() + amount);
        if (goal.getSavedAmount() < 0) {
            goal.setSavedAmount(0);
        }

        return ResponseEntity.ok(goalRepository.save(goal));
    }

    @DeleteMapping("/{username}/{goalId}")
    public ResponseEntity<?> deleteGoal(@PathVariable String username, @PathVariable Long goalId) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only delete your own goals");
        }
        SavingsGoal goal = goalRepository.findByIdAndUserUsername(goalId, username);
        if (goal == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Goal not found");
        }
        goalRepository.delete(goal);
        return ResponseEntity.ok().build();
    }
}