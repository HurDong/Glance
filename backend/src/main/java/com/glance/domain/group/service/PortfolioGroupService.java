package com.glance.domain.group.service;

import com.glance.common.exception.BusinessException;
import com.glance.common.exception.ErrorCode;
import com.glance.domain.group.dto.PortfolioGroupResponse;
import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.entity.PortfolioGroupMember;
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

                // Owner automatically becomes a member
                groupMemberRepository.save(PortfolioGroupMember.builder()
                                .group(savedGroup)
                                .member(owner)
                                .build());

                return savedGroup;
        }

        @Transactional
        public void addMember(Long groupId, Long memberId) {
                PortfolioGroup group = groupRepository.findById(groupId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ENTITY_NOT_FOUND));
                Member member = memberService.getMember(memberId);

                if (groupMemberRepository.findByGroupAndMember(group, member).isPresent()) {
                        throw new BusinessException("이미 그룹에 가입된 멤버입니다.", ErrorCode.INVALID_INPUT_VALUE);
                }

                groupMemberRepository.save(PortfolioGroupMember.builder()
                                .group(group)
                                .member(member)
                                .build());
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
