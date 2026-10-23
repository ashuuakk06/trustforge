package com.trustforge.api.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

public final class ApiDtos {
    private ApiDtos() {}
    public record Credentials(@NotBlank @Email @Size(max = 255) String email, @NotBlank @Size(min = 8, max = 128) String password) {}
    public record Registration(@NotBlank @Email @Size(max = 255) String email, @NotBlank @Size(min = 2, max = 80) String name, @NotBlank @Size(min = 8, max = 128) String password) {}
    public record RefreshRequest(@NotBlank @Size(min = 20, max = 512) String refreshToken) {}
    public record SubmissionRequest(@NotBlank @Size(min = 2, max = 120) String name,
        @NotBlank @Size(min = 2, max = 80) String track,
        @NotBlank @Size(min = 20, max = 2000) String description,
        @NotBlank @Size(min = 20, max = 3000) String problemStatement,
        @NotBlank @Size(min = 20, max = 3000) String solution,
        @NotBlank @Size(min = 2, max = 500) String technology,
        @NotBlank @Size(min = 2, max = 300) String team,
        @NotBlank @Size(max = 500) String repository,
        @NotBlank @Size(max = 500) String demo,
        @Size(max = 5) List<@NotBlank @Size(max = 500) String> supportingLinks) {}
    public record EvaluationRequest(@NotBlank @Size(max = 80) String projectId, @NotEmpty Map<String, Double> scores, @Size(max = 2000) String comment) {}
    public record ProjectRequest(@NotBlank @Size(max = 80) String projectId) {}
    public record CommentRequest(@NotBlank @Size(max = 80) String projectId, @NotBlank @Size(max = 2000) String body) {}
    public record ReviewRequest(@Size(max = 2000) String notes) {}
    public record CertificateRequest(@NotBlank @Size(max = 120) String certificateId) {}
}
