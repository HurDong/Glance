package com.glance.domain.group.service;

import com.glance.common.exception.BusinessException;
import com.glance.common.exception.ErrorCode;
import com.glance.domain.group.entity.GroupPortfolioReaction;
import com.glance.domain.group.entity.PortfolioGroupMember;
import com.glance.domain.group.entity.ReactionType;
import com.glance.domain.group.repository.GroupPortfolioReactionRepository;
import com.glance.domain.group.repository.PortfolioGroupMemberRepository;
import com.glance.domain.member.entity.Member;
import com.glance.domain.member.service.MemberService;
import com.glance.domain.notification.entity.NotificationType;
import com.glance.domain.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReactionService {

    private final GroupPortfolioReactionRepository reactionRepository;
    private final PortfolioGroupMemberRepository groupMemberRepository;
    private final MemberService memberService;
    private final NotificationService notificationService;

    @Transactional
    public void toggleReaction(Long membershipId, ReactionType type, Long memberId) {
        PortfolioGroupMember targetMembership = groupMemberRepository.findById(membershipId)
                .orElseThrow(() -> new BusinessException("멤버십 ID: " + membershipId + "을(를) 찾을 수 없습니다.", ErrorCode.ENTITY_NOT_FOUND));
        
        Member member = memberService.getMember(memberId);

        Optional<GroupPortfolioReaction> existing = reactionRepository.findByMemberAndTargetMembershipAndType(member, targetMembership, type);

        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
        } else {
            reactionRepository.save(GroupPortfolioReaction.builder()
                    .member(member)
                    .targetMembership(targetMembership)
                    .type(type)
                    .build());

            // 알림 발송: 포트폴리오 소유자에게 알림 (본인 제외)
            Member owner = targetMembership.getMember();
            if (!owner.getId().equals(memberId)) {
                String emoji = getEmoji(type);
                String content = String.format("%s님이 회원님의 포트폴리오에 '%s %s' 반응을 남겼습니다.", 
                        member.getNickname(), emoji, getLabel(type));
                
                notificationService.sendNotification(
                        owner,
                        member,
                        NotificationType.REACTION,
                        content,
                        targetMembership.getGroup().getId().toString()
                );
            }
        }
    }

    private String getEmoji(ReactionType type) {
        return switch (type) {
            case GOOD -> "👍";
            case METOO -> "🙋";
            case WATCH -> "👀";
            case PASS -> "😅";
        };
    }

    private String getLabel(ReactionType type) {
        return switch (type) {
            case GOOD -> "잘 담았다";
            case METOO -> "나도 관심";
            case WATCH -> "관망중";
            case PASS -> "이건 패스";
        };
    }
}
