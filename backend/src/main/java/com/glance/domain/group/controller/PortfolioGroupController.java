package com.glance.domain.group.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.domain.group.dto.GroupCreateRequest;
import com.glance.domain.group.dto.GroupShareRequest;
import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.service.PortfolioGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups")
@RequiredArgsConstructor
public class PortfolioGroupController {

    private final PortfolioGroupService groupService;

    @PostMapping
    public ApiResponse<Long> createGroup(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody GroupCreateRequest request) {
        PortfolioGroup group = groupService.createGroup(userId, request.name(), request.description());
        return ApiResponse.success("그룹이 생성되었습니다.", group.getId());
    }

    @PostMapping("/{groupId}/members")
    public ApiResponse<Void> addMember(
            @PathVariable Long groupId,
            @RequestParam Long memberId) {
        groupService.addMember(groupId, memberId);
        return ApiResponse.success("멤버가 추가되었습니다.");
    }

    @PostMapping("/{groupId}/share")
    public ApiResponse<Void> sharePortfolio(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long groupId,
            @Valid @RequestBody GroupShareRequest request) {
        groupService.sharePortfolio(groupId, userId, request.portfolioId());
        return ApiResponse.success("포트폴리오 공유 설정이 완료되었습니다.");
    }
}
