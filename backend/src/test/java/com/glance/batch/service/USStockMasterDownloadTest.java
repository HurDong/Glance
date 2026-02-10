package com.glance.batch.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.assertj.core.api.Assertions.assertThat;

class USStockMasterDownloadTest {

    private final RestTemplate restTemplate = new RestTemplate();
    // NASDAQ Master File URL
    private static final String NASDAQ_URL = "https://new.real.download.dws.co.kr/common/master/nasmst.cod.zip";

    @Test
    @DisplayName("Download and unzip NASDAQ master file to check content structure")
    void downloadAndCheckStructure() throws Exception {
        // 1. Download
        System.out.println("Attempting to download from: " + NASDAQ_URL);
        byte[] fileBytes = restTemplate.getForObject(NASDAQ_URL, byte[].class);

        assertThat(fileBytes).isNotNull();
        assertThat(fileBytes.length).isGreaterThan(0);
        System.out.println("Download successful. Size: " + fileBytes.length + " bytes");

        // 2. Unzip & Read
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(fileBytes));
                BufferedReader br = new BufferedReader(new InputStreamReader(zis, "EUC-KR"))) { // KIS uses CP949/EUC-KR

            ZipEntry entry = zis.getNextEntry();
            assertThat(entry).isNotNull();
            System.out.println("Entry Name: " + entry.getName());

            if (!entry.isDirectory()) {
                System.out.println("--- First 5 lines of content ---");
                for (int i = 0; i < 5; i++) {
                    String line = br.readLine();
                    if (line == null)
                        break;
                    System.out.println("Line " + (i + 1) + ": " + line);
                }
                System.out.println("--------------------------------");
            }
        }
    }
}
