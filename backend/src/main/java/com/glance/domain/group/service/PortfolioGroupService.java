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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PortfolioGroupService {

        private final PortfolioGroupRepository groupRepository;
        private final PortfolioGroupMemberRepository groupMemberRepository;
        private final MemberRepository memberRepository;
        private final MemberService memberService;
        private final PortfolioRepository portfolioRepository;

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

                return savedGroup;
        }

        @Transactional
        public void deleteGroup(Long groupId, Long ownerId) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

                if (!group.getOwner().getId().equals(ownerId)) {
                        throw new BusinessException("그룹장만 그룹을 삭제할 수 있습니다.", ErrorCode.HANDLE_ACCESS_DENIED);
                }

                // Delete all group members first (since it's a manual many-to-one mapped entity
                // without CascadeType.ALL on group's side)
                groupMemberRepository.deleteAllByGroup(group);

                // Then delete the group
                groupRepository.delete(group);
        }

        @Transactional
        public void joinGroup(Long groupId, Long memberId) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
                Member member = memberService.getMember(memberId);

                if (groupMemberRepository.findByGroupAndMember(group, member).isPresent()) {
                        throw new BusinessException("이미 그룹에 가입된 멤버이거나 요청 중입니다.", ErrorCode.INVALID_INPUT_VALUE);
                }

                groupMemberRepository.save(PortfolioGroupMember.builder()
                                .group(group)
                                .member(member)
                                .status(GroupMemberStatus.PENDING)
                                .build());
        }

        @Transactional
        public void joinGroupByCode(String inviteCode, Long memberId) {
                PortfolioGroup group = groupRepository.findByInviteCode(inviteCode)
                                .orElseThrow(() -> new BusinessException("유효하지 않은 초대 코드입니다.",
                                                ErrorCode.ENTITY_NOT_FOUND));
                Member member = memberService.getMember(memberId);

                if (groupMemberRepository.findByGroupAndMember(group, member).isPresent()) {
                        throw new BusinessException("이미 그룹에 가입된 멤버이거나 요청 중입니다.", ErrorCode.INVALID_INPUT_VALUE);
                }

                groupMemberRepository.save(PortfolioGroupMember.builder()
                                .group(group)
                                .member(member)
                                .status(GroupMemberStatus.ACCEPTED)
                                .build());
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
        }

        public List<PortfolioGroupResponse> getMyGroups(Long userId) {
                Member member = memberRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));

                List<PortfolioGroupMember> memberships = groupMemberRepository.findAllByMember(member);

                return memberships.stream()
                                .map(PortfolioGroupMember::getGroup)
                                .distinct()
                                .map(group -> {
                                        List<PortfolioGroupMember> members = groupMemberRepository
                                                        .findAllByGroup(group);
                                        return PortfolioGroupResponse.from(group, members);
                                })
                                .toList();
        }
}
