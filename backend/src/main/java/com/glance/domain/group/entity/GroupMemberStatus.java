package com.glance.domain.group.entity;

public enum GroupMemberStatus {
    PENDING, // 가입 신청 중
    INVITED, // 초대받은 상태
    ACCEPTED, // 가입 완료
    REJECTED // 거절됨/취소됨
}
