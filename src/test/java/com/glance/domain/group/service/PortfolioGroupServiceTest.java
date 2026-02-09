package com.glance.domain.group.service;

import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.entity.PortfolioGroupMember;
import com.glance.domain.group.repository.PortfolioGroupMemberRepository;
import com.glance.domain.group.repository.PortfolioGroupRepository;
import com.glance.domain.member.entity.Member;
import com.glance.domain.member.service.MemberService;
import com.glance.domain.portfolio.entity.Portfolio;
import com.glance.domain.portfolio.repository.PortfolioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PortfolioGroupServiceTest {

    @Mock
    private PortfolioGroupRepository groupRepository;
    @Mock
    private PortfolioGroupMemberRepository groupMemberRepository;
    @Mock
    private MemberService memberService;
    @Mock
    private PortfolioRepository portfolioRepository;

    @InjectMocks
    private PortfolioGroupService groupService;

    @Test
    @DisplayName("그룹 생성 시 소유자가 멤버로 자동 등록됨")
    void createGroup_Success() {
        // given
        Long ownerId = 1L;
        Member owner = Member.builder().nickname("owner").build();
        ReflectionTestUtils.setField(owner, "id", ownerId);

        PortfolioGroup group = PortfolioGroup.builder().name("Group").owner(owner).build();
        ReflectionTestUtils.setField(group, "id", 10L);

        given(memberService.getMember(ownerId)).willReturn(owner);
        given(groupRepository.save(any(PortfolioGroup.class))).willReturn(group);

        // when
        PortfolioGroup saved = groupService.createGroup(ownerId, "Group", "Desc");

        // then
        assertThat(saved.getName()).isEqualTo("Group");
        verify(groupMemberRepository).save(any(PortfolioGroupMember.class));
    }

    @Test
    @DisplayName("그룹에 멤버 추가")
    void addMember_Success() {
        // given
        PortfolioGroup group = PortfolioGroup.builder().name("G").build();
        Member newMember = Member.builder().nickname("new").build();
        given(groupRepository.findById(10L)).willReturn(Optional.of(group));
        given(memberService.getMember(2L)).willReturn(newMember);
        given(groupMemberRepository.findByGroupAndMember(group, newMember)).willReturn(Optional.empty());

        // when
        groupService.addMember(10L, 2L);

        // then
        verify(groupMemberRepository).save(any(PortfolioGroupMember.class));
    }

    @Test
    @DisplayName("포트폴리오 공유")
    void sharePortfolio_Success() {
        // given
        Long memberId = 1L;
        Long portfolioId = 100L;
        Member member = Member.builder().build();
        ReflectionTestUtils.setField(member, "id", memberId);

        Portfolio portfolio = Portfolio.builder().member(member).build();
        PortfolioGroup group = PortfolioGroup.builder().build();
        PortfolioGroupMember groupMember = PortfolioGroupMember.builder().group(group).member(member).build();

        given(groupRepository.findById(10L)).willReturn(Optional.of(group));
        given(memberService.getMember(memberId)).willReturn(member);
        given(portfolioRepository.findById(portfolioId)).willReturn(Optional.of(portfolio));
        given(groupMemberRepository.findByGroupAndMember(group, member)).willReturn(Optional.of(groupMember));

        // when
        groupService.sharePortfolio(10L, memberId, portfolioId);

        // then
        assertThat(groupMember.getSharedPortfolio()).isEqualTo(portfolio);
    }
}
