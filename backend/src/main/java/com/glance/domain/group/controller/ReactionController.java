package com.glance.domain.group.controller;

import com.glance.common.dto.ApiResponse;
import com.glance.common.util.SecurityUtil;
import com.glance.domain.group.entity.ReactionType;
import com.glance.domain.group.service.ReactionService;
import com.glance.domain.member.entity.Member;
import com.glance.domain.member.repository.MemberRepository;
import com.glance.common.exception.BusinessException;
import com.glance.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups/reactions")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;
    private final MemberRepository memberRepository;

    @PostMapping("/{membershipId}")
    public ApiResponse<Void> toggleReaction(
            @PathVariable Long membershipId,
            @RequestParam ReactionType type) {
        
        String userIdStr = SecurityUtil.getCurrentUserEmail(); // 실제로는 Member ID가 들어있음
        Long userId = Long.parseLong(userIdStr);

        Member member = memberRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("회원 ID(" + userId + ")에 해당하는 회원을 찾을 수 없습니다.", ErrorCode.ENTITY_NOT_FOUND));
        
        reactionService.toggleReaction(membershipId, type, member.getId());
        return ApiResponse.success(null);
    }
}
