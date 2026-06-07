package com.testcreator.testsupport;

import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Reclaims scenarios whose cleanup never arrived (process killed, network partition, etc.). Without
 * this a long-running e2e server would leak rows.
 */
@Component
@Profile("e2e")
@RequiredArgsConstructor
@Slf4j
public class TestSupportSweeper {

  private final TestSupportService service;
  private final TestSupportProperties props;

  /** Periodically removes stale scenarios that have exceeded their TTL. */
  @Scheduled(fixedDelayString = "${app.test-support.sweeper-interval-ms:900000}")
  public void sweep() {
    Instant cutoff = Instant.now().minus(props.getScenarioTtl());
    int swept = service.sweepStale(cutoff);
    if (swept > 0) {
      log.warn(
          "Sweeper reclaimed {} stale scenario(s) older than {}", swept, props.getScenarioTtl());
    }
  }
}
