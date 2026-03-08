package com.glance.domain.group.service;

import com.glance.common.exception.BusinessException;
import com.glance.common.exception.ErrorCode;
import com.glance.domain.group.dto.PortfolioGroupResponse;
import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.entity.PortfolioGroupMember;
import com.glance.domain.group.entity.GroupMemberStatus;
import com.glance.domain.group.repository.PortfolioGroupMemberRepository;
import com.glance.domain.group.repository.PortfolioGroupRepository;
import com.glance.domain.member.entity.Member;
import com.glance.domain.member.repository.MemberRepository;
import com.glance.domain.member.service.MemberService;
import com.glance.domain.portfolio.entity.Portfolio;
import com.glance.domain.portfolio.repository.PortfolioRepository;
import com.glance.domain.group.entity.GroupFeed;
import com.glance.domain.group.entity.GroupFeedActionType;
import com.glance.domain.group.repository.GroupFeedRepository;
import com.glance.domain.group.dto.GroupFeedResponse;
import com.glance.domain.group.entity.GroupPortfolioReaction;
import com.glance.domain.group.repository.GroupPortfolioReactionRepository;
import com.glance.domain.notification.entity.NotificationType;
import com.glance.domain.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioGroupService {

        private final PortfolioGroupRepository groupRepository;
        private final PortfolioGroupMemberRepository groupMemberRepository;
        private final MemberRepository memberRepository;
        private final MemberService memberService;
        private final PortfolioRepository portfolioRepository;
        private final GroupFeedRepository groupFeedRepository;
        private final NotificationService notificationService;
        private final GroupPortfolioReactionRepository reactionRepository;

        @Transactional
        public PortfolioGroup createGroup(Long ownerId, String name, String description) {
                Member owner = memberService.getMember(ownerId);

                PortfolioGroup group = PortfolioGroup.builder()
                                .owner(owner)
                                .name(name)
                                .description(description)
                                .build();

                PortfolioGroup savedGroup = groupRepository.save(group);

                // Owner automatically becomes a member and is ACCEPTED
                groupMemberRepository.save(PortfolioGroupMember.builder()
                                .group(savedGroup)
                                .member(owner)
                                .status(GroupMemberStatus.ACCEPTED)
                                .build());

                groupFeedRepository.save(GroupFeed.builder()
                                .group(savedGroup)
                                .member(owner)
                                .actionType(GroupFeedActionType.CREATE_GROUP)
                                .content(owner.getNickname() + "님이 새로운 그룹을 생성했습니다.")
                                .build());

                return savedGroup;
        }

        @Transactional
        public void leaveGroup(Long groupId, Long userId) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
                Member member = memberService.getMember(userId);

                if (group.getOwner().getId().equals(userId)) {
                        throw new BusinessException("방장은 탈퇴할 수 없습니다. 그룹을 삭제하거나 방장을 위임하세요.",
                                        ErrorCode.INVALID_INPUT_VALUE);
                }

                groupMemberRepository.deleteByGroupAndMember(group, member);

                groupFeedRepository.save(GroupFeed.builder()
                                .group(group)
                                .member(member)
                                .actionType(GroupFeedActionType.LEAVE_GROUP)
                                .content(member.getNickname() + "님이 그룹에서 탈퇴했습니다.")
                                .build());
        }

        @Transactional
        public void deleteGroup(Long groupId, Long ownerId) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

                if (!group.getOwner().getId().equals(ownerId)) {
                        throw new BusinessException("그룹장만 그룹을 삭제할 수 있습니다.", ErrorCode.HANDLE_ACCESS_DENIED);
                }

                // Delete all group members and active feeds first
                groupMemberRepository.deleteAllByGroup(group);
                groupFeedRepository.deleteAllByGroup(group);

                // Then delete the group
                groupRepository.delete(group);
        }

        @Transactional
        public void joinGroupByCode(String inviteCode, Long memberId) {
                if (inviteCode == null || inviteCode.isBlank()) {
                        throw new BusinessException("초대 코드를 입력해주세요.", ErrorCode.INVALID_INPUT_VALUE);
                }

                // 대소문자 구분 없이 검색 가능하도록 개선
                PortfolioGroup group = groupRepository.findByInviteCode(inviteCode.trim().toUpperCase())
                                .orElseThrow(() -> new BusinessException("유효하지 않은 초대 코드입니다.",
                                                ErrorCode.ENTITY_NOT_FOUND));
                Member member = memberService.getMember(memberId);

                // 기존 멤버십 확인 및 처리
                PortfolioGroupMember groupMember = groupMemberRepository.findByGroupAndMember(group, member)
                                .orElseGet(() -> PortfolioGroupMember.builder()
                                                .group(group)
                                                .member(member)
                                                .build());

                if (groupMember.getStatus() == GroupMemberStatus.ACCEPTED) {
                        throw new BusinessException("이미 이 그룹의 멤버입니다.", ErrorCode.INVALID_INPUT_VALUE);
                }

                // 상태를 ACCEPTED로 설정 (신규든 기존 대기자든)
                groupMember.accept();
                groupMemberRepository.save(groupMember);

                groupFeedRepository.save(GroupFeed.builder()
                                .group(group)
                                .member(member)
                                .actionType(GroupFeedActionType.JOIN_GROUP)
                                .content(member.getNickname() + "님이 초대 코드로 그룹에 가입했습니다.")
                                .build());

                // 알림 생성: 그룹장에게 새 멤버 합류 알림 전송
                if (!group.getOwner().getId().equals(memberId)) {
                        notificationService.sendNotification(
                                        group.getOwner(),
                                        member,
                                        NotificationType.GROUP_JOIN,
                                        String.format("'%s' 그룹에 새로운 멤버 %s님이 합류했습니다!", group.getName(),
                                                        member.getNickname()),
                                        group.getId().toString());
                }
        }

        @Transactional
        public void inviteMember(Long groupId, Long ownerId, Long targetMemberId) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

                if (!group.getOwner().getId().equals(ownerId)) {
                        throw new BusinessException("그룹장만 초대할 수 있습니다.", ErrorCode.HANDLE_ACCESS_DENIED);
                }

                Member member = memberService.getMember(targetMemberId);

                if (groupMemberRepository.findByGroupAndMember(group, member).isPresent()) {
                        throw new BusinessException("이미 그룹에 가입된 멤버이거나 요청 중입니다.", ErrorCode.INVALID_INPUT_VALUE);
                }

                groupMemberRepository.save(PortfolioGroupMember.builder()
                                .group(group)
                                .member(member)
                                .status(GroupMemberStatus.INVITED)
                                .build());
        }

        @Transactional
        public void handleJoinRequest(Long groupId, Long ownerId, Long membershipId, boolean accept) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

                if (!group.getOwner().getId().equals(ownerId)) {
                        throw new BusinessException("그룹장만 승인/거절할 수 있습니다.", ErrorCode.HANDLE_ACCESS_DENIED);
                }

                PortfolioGroupMember membership = groupMemberRepository.findById(membershipId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

                if (membership.getStatus() != GroupMemberStatus.PENDING) {
                        throw new BusinessException("대기 중인 가입 신청이 아닙니다.", ErrorCode.INVALID_INPUT_VALUE);
                }

                if (accept) {
                        membership.accept();
                        groupFeedRepository.save(GroupFeed.builder()
                                        .group(group)
                                        .member(membership.getMember())
                                        .actionType(GroupFeedActionType.JOIN_GROUP)
                                        .content(membership.getMember().getNickname() + "님이 그룹에 가입했습니다.")
                                        .build());
                } else {
                        membership.reject();
                }
        }

        @Transactional
        public void handleInvitation(Long membershipId, Long memberId, boolean accept) {
                PortfolioGroupMember membership = groupMemberRepository.findById(membershipId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

                if (membership.getStatus() != GroupMemberStatus.INVITED) {
                        throw new BusinessException("대기 중인 초대가 아닙니다.", ErrorCode.INVALID_INPUT_VALUE);
                }

                if (!membership.getMember().getId().equals(memberId)) {
                        throw new BusinessException("본인만 초대 응답을 할 수 있습니다.", ErrorCode.HANDLE_ACCESS_DENIED);
                }

                if (accept) {
                        membership.accept();
                        groupFeedRepository.save(GroupFeed.builder()
                                        .group(membership.getGroup())
                                        .member(membership.getMember())
                                        .actionType(GroupFeedActionType.JOIN_GROUP)
                                        .content(membership.getMember().getNickname() + "님이 초대를 수락하여 그룹에 가입했습니다.")
                                        .build());
                } else {
                        membership.reject();
                }
        }

        @Transactional
        public void sharePortfolio(Long groupId, Long memberId, Long portfolioId) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
                Member member = memberService.getMember(memberId);
                Portfolio portfolio = portfolioRepository.findById(portfolioId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

                if (!portfolio.getMember().getId().equals(memberId)) {
                        throw new BusinessException("본인의 포트폴리오만 공유할 수 있습니다.", ErrorCode.HANDLE_ACCESS_DENIED);
                }

                PortfolioGroupMember groupMember = groupMemberRepository.findByGroupAndMember(group, member)
                                .orElseThrow(() -> new BusinessException("그룹 멤버가 아닙니다.",
                                                ErrorCode.HANDLE_ACCESS_DENIED));

                groupMember.sharePortfolio(portfolio);

                groupFeedRepository.save(GroupFeed.builder()
                                .group(group)
                                .member(member)
                                .actionType(GroupFeedActionType.SHARE_PORTFOLIO)
                                .content(member.getNickname() + "님이 새 포트폴리오를 공유했습니다.")
                                .build());

                // 알림 생성: 그룹의 모든 멤버에게 포트폴리오 공유 알림 전송 (본인 제외)
                List<PortfolioGroupMember> members = groupMemberRepository.findAllByGroup(group);
                for (PortfolioGroupMember groupMemberEntity : members) {
                        Member recipient = groupMemberEntity.getMember();
                        if (!recipient.getId().equals(memberId) && groupMemberEntity.getStatus() == GroupMemberStatus.ACCEPTED) {
                                notificationService.sendNotification(
                                                recipient,
                                                member,
                                                NotificationType.PORTFOLIO_SHARE,
                                                String.format("'%s' 그룹의 %s님이 새로운 포트폴리오를 공유했습니다!", group.getName(),
                                                                member.getNickname()),
                                                group.getId().toString());
                        }
                }
        }

        public List<PortfolioGroupResponse> getMyGroups(Long userId) {
                Member member = memberRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException("회원 ID: " + userId + "을(를) 찾을 수 없습니다.", ErrorCode.ENTITY_NOT_FOUND));

                List<PortfolioGroupMember> memberships = groupMemberRepository.findAllByMember(member);

                return memberships.stream()
                                .map(PortfolioGroupMember::getGroup)
                                .distinct()
                                .map(group -> {
                                        List<PortfolioGroupMember> members = groupMemberRepository
                                                        .findAllByGroup(group);
                                        
                                        // 해당 그룹의 모든 멤버십에 대한 리액션 조회
                                        Map<Long, List<GroupPortfolioReaction>> reactionsMap = members.stream()
                                                .collect(Collectors.toMap(
                                                        PortfolioGroupMember::getId,
                                                        reactionRepository::findAllByTargetMembership
                                                ));

                                        return PortfolioGroupResponse.from(group, members, userId, reactionsMap);
                                })
                                .toList();
        }

        public List<GroupFeedResponse> getGroupFeeds(Long groupId, Long userId) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
                Member member = memberService.getMember(userId);

                // Ensure the user is an accepted member of the group
                PortfolioGroupMember groupMember = groupMemberRepository.findByGroupAndMember(group, member)
                                .orElseThrow(() -> new BusinessException("그룹 멤버가 아닙니다.",
                                                ErrorCode.HANDLE_ACCESS_DENIED));

                if (groupMember.getStatus() != GroupMemberStatus.ACCEPTED) {
                        throw new BusinessException("승인된 그룹 멤버만 피드를 조회할 수 있습니다.", ErrorCode.HANDLE_ACCESS_DENIED);
                }

                return groupFeedRepository.findTop50ByGroupOrderByCreatedAtDesc(group).stream()
                                .map(GroupFeedResponse::from)
                                .toList();
        }
}
