package com.glance.batch.runner;

import com.glance.domain.group.entity.PortfolioGroup;
import com.glance.domain.group.service.PortfolioGroupService;
import com.glance.domain.member.entity.Member;
import com.glance.domain.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class InitialDataSeeder implements ApplicationRunner {

    private final USStockMasterService usStockMasterService;
    private final KoreaStockMasterService koreaStockMasterService;
    private final MemberService memberService;
    private final PortfolioGroupService groupService;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        log.info("🚀 Starting Initial Data Seeding...");

        // 1. Sync Stock Masters
        try {
            usStockMasterService.syncUSStocks();
            koreaStockMasterService.syncKoreaStocks();
        } catch (Exception e) {
            log.error("Failed to sync Stock Masters on startup", e);
        }

        // 2. Create Dummy Member & Group for Testing
        try {
            if (!memberService.existsByEmail("tester@glance.com")) {
                Member tester = Member.builder()
                        .email("tester@glance.com")
                        .password("password") // In real app, this should be encoded
                        .nickname("주식천재")
                        .build();
                Member saved = memberService.createMember(tester);
                log.info("✅ Created Test Member: {} (ID: {})", saved.getNickname(), saved.getId());

                PortfolioGroup group = groupService.createGroup(saved.getId(), "재테크 고수 모임", "함께 수익률을 공유합시다.");
                log.info("✅ Created Test Group: {} (ID: {})", group.getName(), group.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to create initial dummy data", e);
        }

        log.info("✅ Initial Data Seeding Completed.");
    }
}
