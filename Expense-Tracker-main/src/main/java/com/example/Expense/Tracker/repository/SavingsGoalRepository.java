package com.example.Expense.Tracker.repository;

import com.example.Expense.Tracker.model.SavingsGoal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByUserUsername(String username);
    SavingsGoal findByIdAndUserUsername(Long id, String username);
}