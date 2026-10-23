package com.trustforge.api.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "judges")
public class JudgeEntity {
    @Id private String id;
    @Column(name = "user_id", nullable = false, unique = true) private String userId;
    @Column(nullable = false) private int capacity;
    @Column(nullable = false) private String tendency;
    protected JudgeEntity() {}
    public JudgeEntity(String id, String userId, int capacity, String tendency) { this.id = id; this.userId = userId; this.capacity = capacity; this.tendency = tendency; }
    public String getId() { return id; }
    public String getUserId() { return userId; }
    public int getCapacity() { return capacity; }
    public String getTendency() { return tendency; }
}
