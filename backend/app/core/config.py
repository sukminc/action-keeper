import os
from dataclasses import dataclass


@dataclass
class Settings:
    app_env: str = os.getenv("APP_ENV", "development")
    api_token: str | None = os.getenv("API_TOKEN")
    rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "120"))
    verify_base_url: str = os.getenv("VERIFY_BASE_URL", "http://localhost:8000")
    artifacts_dir: str = os.getenv("ARTIFACTS_DIR", "artifacts")
    stripe_webhook_secret: str | None = os.getenv("STRIPE_WEBHOOK_SECRET", "test-secret")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() != "production"


settings = Settings()
