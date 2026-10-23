package com.trustforge.api.submissions;

import com.trustforge.api.persistence.ProjectEntity;
import java.util.LinkedHashMap;
import java.util.Map;

public final class ProjectMapper {
    private ProjectMapper() {}
    public static Map<String, Object> project(ProjectEntity project) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", project.getId()); row.put("name", project.getName()); row.put("slug", project.getSlug()); row.put("track", project.getTrack());
        row.put("description", project.getDescription()); row.put("problemStatement", project.getProblemStatement()); row.put("solution", project.getSolution());
        row.put("technology", project.getTechnology()); row.put("team", project.getTeam()); row.put("repository", project.getRepository()); row.put("demo", project.getDemo());
        row.put("supportingLinks", project.getSupportingLinks()); row.put("status", project.getStatus()); row.put("processingStatus", project.getProcessingStatus());
        row.put("contentHash", project.getContentHash()); row.put("version", project.getVersion()); row.put("ownerId", project.getOwnerId()); row.put("submittedAt", project.getSubmittedAt());
        return row;
    }
    public static Map<String, Object> galleryProject(ProjectEntity project) {
        Map<String, Object> row = project(project);
        row.remove("problemStatement"); row.remove("solution"); row.remove("supportingLinks"); row.remove("contentHash"); row.remove("ownerId"); row.remove("submittedAt");
        return row;
    }
}
