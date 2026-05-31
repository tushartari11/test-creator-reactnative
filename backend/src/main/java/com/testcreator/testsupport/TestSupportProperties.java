package com.testcreator.testsupport;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("e2e")
@ConfigurationProperties(prefix = "app.test-support")
public class TestSupportProperties {

  /** Master switch. Beans only register when this is true. */
  private boolean enabled = false;

  /** Datasource URL must contain this suffix in the DB name. Prevents accidental prod use. */
  private String allowedDbUrlSuffix = "_e2e";

  /** Scenarios older than this are removed by the sweeper. */
  private Duration scenarioTtl = Duration.ofHours(1);

  /** Sweeper polling interval, in milliseconds. */
  private long sweeperIntervalMs = 900_000;

  public boolean isEnabled() {
    return enabled;
  }

  public void setEnabled(boolean enabled) {
    this.enabled = enabled;
  }

  public String getAllowedDbUrlSuffix() {
    return allowedDbUrlSuffix;
  }

  public void setAllowedDbUrlSuffix(String allowedDbUrlSuffix) {
    this.allowedDbUrlSuffix = allowedDbUrlSuffix;
  }

  public Duration getScenarioTtl() {
    return scenarioTtl;
  }

  public void setScenarioTtl(Duration scenarioTtl) {
    this.scenarioTtl = scenarioTtl;
  }

  public long getSweeperIntervalMs() {
    return sweeperIntervalMs;
  }

  public void setSweeperIntervalMs(long sweeperIntervalMs) {
    this.sweeperIntervalMs = sweeperIntervalMs;
  }
}
