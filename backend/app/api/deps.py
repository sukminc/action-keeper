import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings

_RATE_HISTORY = defaultdict(lambda: deque(maxlen=256))


async def enforce_rate_limit(request: Request) -> None:
    limit = settings.rate_limit_per_minute
    if not limit:
        return
    identifier = request.client.host if request.client else "unknown"
    window = 60
    now = time.time()
    history = _RATE_HISTORY[identifier]
    while history and now - history[0] > window:
        history.popleft()
    if len(history) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again shortly.",
        )
    history.append(now)


async def require_api_token(request: Request, _: None = Depends(enforce_rate_limit)) -> None:
    token = settings.api_token
    if not token:
        return
    auth_header = request.headers.get("Authorization", "")
    if auth_header != f"Bearer {token}":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid API token.",
        )
