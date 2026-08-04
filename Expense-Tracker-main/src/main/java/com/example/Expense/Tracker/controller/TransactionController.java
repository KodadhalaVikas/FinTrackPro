package com.example.Expense.Tracker.controller;

import com.example.Expense.Tracker.model.Transaction;
import com.example.Expense.Tracker.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ExpTrack/transactions")
@CrossOrigin
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    // Ensures the authenticated JWT user matches the username in the URL,
    // so one logged-in user can't read/modify another user's transactions
    // just by changing the path.
    private boolean isOwner(String username) {
        String authenticatedUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        return authenticatedUsername.equals(username);
    }

    @PostMapping("/{username}")
    public ResponseEntity<?> addTransaction(@RequestBody Transaction transaction, @PathVariable String username) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only add transactions for your own account");
        }
        return ResponseEntity.ok(transactionService.addTransaction(transaction, username));
    }

    @GetMapping("/{username}")
    public ResponseEntity<?> getAllTransactions(@PathVariable String username) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only view your own transactions");
        }
        return ResponseEntity.ok(transactionService.getAllTransactions(username));
    }

    @DeleteMapping("/{username}/{id}")
    public ResponseEntity<?> deleteTransaction(@PathVariable String username, @PathVariable Long id) {
        if (!isOwner(username)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You can only delete your own transactions");
        }
        transactionService.deleteTransaction(id, username);
        return ResponseEntity.ok().build();
    }
}