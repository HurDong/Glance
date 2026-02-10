package com.glance.domain.member.service;

import com.glance.common.exception.BusinessException;
import com.glance.common.exception.ErrorCode;
import com.glance.domain.member.entity.Member;
import com.glance.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;

    @Transactional
    public Member createMember(Member member) {
        if (memberRepository.existsByEmail(member.getEmail())) {
            throw new BusinessException(ErrorCode.EMAIL_DUPLICATION);
        }
        if (memberRepository.existsByNickname(member.getNickname())) {
            throw new BusinessException("이미 존재하는 닉네임입니다.", ErrorCode.INVALID_INPUT_VALUE);
        }
        return memberRepository.save(member);
    }

    public boolean existsByEmail(String email) {
        return memberRepository.existsByEmail(email);
    }

    public Member getMember(Long id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
    }
}
