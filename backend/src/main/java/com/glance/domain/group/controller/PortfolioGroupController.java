package com.glance.domain.group.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.domain.group.dto.GroupCreateRequest;
import com.glance.domain.group.dto.GroupShareRequest;
import com.glance.domain.group.dto.PortfolioGroupResponse;
import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.service.PortfolioGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups")
@RequiredArgsConstructor
public class PortfolioGroupController {

    private final PortfolioGroupService groupService;

    @PostMapping
    public ApiResponse<Long> createGroup(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody GroupCreateRequest request) {
        Long userId = Long.parseLong(userDetails.getUsername());
        PortfolioGroup group = groupService.createGroup(userId, request.name(), request.description());
        return ApiResponse.success("그룹이 생성되었습니다.", group.getId());
    }

    @PostMapping("/{groupId}/members")
    public ApiResponse<Void> addMember(
            @PathVariable Long groupId,
            @RequestParam Long memberId) {
        // TODO: Only owner can add members? Service logic check needed?
        // Current requirement doesn't specify auth check for adding member, but usually
        // owner does it.
        // Keeping as is for now, but in real app, we should check if requester is
        // owner.
        // For now, just keeping the endpoint as is, but maybe adding auth to know who
        // is adding.
        // The original code didn't take X-User-Id for addMember.
        groupService.addMember(groupId, memberId);
        return ApiResponse.success("멤버가 추가되었습니다.");
    }

    @PostMapping("/{groupId}/share")
    public ApiResponse<Void> sharePortfolio(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @Valid @RequestBody GroupShareRequest request) {
        Long userId = Long.parseLong(userDetails.getUsername());
        groupService.sharePortfolio(groupId, userId, request.portfolioId());
        return ApiResponse.success("포트폴리오 공유 설정이 완료되었습니다.");
    }

    @GetMapping
    public ApiResponse<List<PortfolioGroupResponse>> getMyGroups(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        List<PortfolioGroupResponse> responses = groupService.getMyGroups(userId);
        return ApiResponse.success(responses);
    }
}
