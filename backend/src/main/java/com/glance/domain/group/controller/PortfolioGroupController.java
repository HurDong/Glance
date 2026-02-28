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

    @DeleteMapping("/{groupId}")
    public ApiResponse<Void> deleteGroup(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId) {
        Long userId = Long.parseLong(userDetails.getUsername());
        groupService.deleteGroup(groupId, userId);
        return ApiResponse.success("그룹이 삭제되었습니다.");
    }

    @PostMapping("/{groupId}/join")
    public ApiResponse<Void> joinGroup(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId) {
        Long userId = Long.parseLong(userDetails.getUsername());
        groupService.joinGroup(groupId, userId);
        return ApiResponse.success("그룹 가입 신청이 완료되었습니다.");
    }

    @PostMapping("/join-by-code")
    public ApiResponse<Void> joinGroupByCode(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String code) {
        Long userId = Long.parseLong(userDetails.getUsername());
        groupService.joinGroupByCode(code, userId);
        return ApiResponse.success("초대 코드로 그룹에 가입되었습니다.");
    }

    @PostMapping("/{groupId}/invite")
    public ApiResponse<Void> inviteMember(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @RequestParam Long memberId) {
        Long ownerId = Long.parseLong(userDetails.getUsername());
        groupService.inviteMember(groupId, ownerId, memberId);
        return ApiResponse.success("그룹 초대가 완료되었습니다.");
    }

    @PostMapping("/{groupId}/requests/{membershipId}")
    public ApiResponse<Void> handleJoinRequest(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @PathVariable Long membershipId,
            @RequestParam boolean accept) {
        Long ownerId = Long.parseLong(userDetails.getUsername());
        groupService.handleJoinRequest(groupId, ownerId, membershipId, accept);
        return ApiResponse.success(accept ? "가입 신청을 승인했습니다." : "가입 신청을 거절했습니다.");
    }

    @PostMapping("/invitations/{membershipId}")
    public ApiResponse<Void> handleInvitation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long membershipId,
            @RequestParam boolean accept) {
        Long userId = Long.parseLong(userDetails.getUsername());
        groupService.handleInvitation(membershipId, userId, accept);
        return ApiResponse.success(accept ? "초대를 수락했습니다." : "초대를 거절했습니다.");
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
