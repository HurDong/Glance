package com.glance.domain.notification.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.domain.member.entity.Member;
import com.glance.domain.member.repository.MemberRepository;
import com.glance.domain.member.service.MemberService;
import com.glance.domain.notification.dto.NotificationResponse;
import com.glance.domain.notification.service.NotificationService;
import com.glance.common.util.SecurityUtil;
import com.glance.common.exception.BusinessException;
import com.glance.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final MemberRepository memberRepository;

    private Member getCurrentMember() {
        String idStr = SecurityUtil.getCurrentUserEmail(); // 실제로는 ID 문자열을 반환함
        Long memberId = Long.parseLong(idStr);
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
    }

    @GetMapping
    public ApiResponse<List<NotificationResponse>> getNotifications() {
        Member member = getCurrentMember();
        
        List<NotificationResponse> responses = notificationService.getMyNotifications(member).stream()
                .map(NotificationResponse::from)
                .collect(Collectors.toList());
                
        return ApiResponse.success(responses);
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount() {
        Member member = getCurrentMember();
        return ApiResponse.success(notificationService.getUnreadCount(member));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ApiResponse.success(null);
    }

    @PatchMapping("/read-all")
    public ApiResponse<Void> markAllAsRead() {
        Member member = getCurrentMember();
        notificationService.markAllAsRead(member);
        return ApiResponse.success(null);
    }
}
