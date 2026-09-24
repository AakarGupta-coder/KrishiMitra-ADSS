import httpx
import asyncio
import time
import logging
from typing import Dict, Any, Optional

from . import store

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("KrishiMitra")

USER_AGENT = "KRISHIMITRA-ADSS/2.1 (agricultural decision support; academic project)"

_cache: Dict[str, Any] = {}
_locks: Dict[str, asyncio.Lock] = {}
_failures: Dict[str, int] = {}
MAX_ERROR_TTL = 3600


class AsyncDataFetcher:
    async def fetch_json(
        self,
        url: str,
        cache_key: str,
        ttl_success=3600,
        ttl_error=60,
        timeout_connect=3.0,
        timeout_read=10.0,
        max_retries=2,
        source_id: Optional[str] = None,
        headers: Optional[dict] = None,
        validate=None,
        raw: bool = False,
    ) -> Any:
        now = time.time()

        if cache_key in _cache:
            entry = _cache[cache_key]
            if now < entry['expires_at']:
                if entry['status'] == 'success':
                    return entry['data']
                else:
                    raise Exception(entry['error'])

        if cache_key not in _locks:
            _locks[cache_key] = asyncio.Lock()

        async with _locks[cache_key]:
            if cache_key in _cache:
                entry = _cache[cache_key]
                if time.time() < entry['expires_at']:
                    if entry['status'] == 'success':
                        return entry['data']
                    else:
                        raise Exception(entry['error'])

            logger.info(f"[{cache_key}] HTTP fetch: {url}")
            timeout = httpx.Timeout(timeout_connect, read=timeout_read)
            req_headers = {"User-Agent": USER_AGENT}
            if headers:
                req_headers.update(headers)

            last_err = None
            error_ttl = ttl_error
            for attempt in range(1, max_retries + 1):
                try:
                    async with httpx.AsyncClient(timeout=timeout, headers=req_headers) as client:
                        resp = await client.get(url)
                        resp.raise_for_status()
                        data = resp.content if raw else resp.json()
                        if validate is not None and not raw:
                            problem = validate(data)
                            if problem:
                                raise ValueError(problem)

                        _cache[cache_key] = {
                            'status': 'success',
                            'data': data,
                            'fetched_at': time.time(),
                            'expires_at': time.time() + ttl_success
                        }
                        _failures.pop(cache_key, None)
                        if source_id:
                            store.record_source(source_id, True)
                        return data
                except Exception as e:
                    last_err = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
                    logger.warning(f"[{cache_key}] Attempt {attempt}/{max_retries} failed: {last_err}")
                    status = getattr(getattr(e, "response", None), "status_code", None)
                    if status == 429 or "rate limit" in str(e).lower():
                        last_err = "Rate limit exceeded (HTTP 429)"
                        error_ttl = max(ttl_error, 900)
                        break
                    if isinstance(e, ValueError) or (status is not None and 400 <= status < 500):
                        break
                    if attempt < max_retries:
                        await asyncio.sleep(1.5 ** attempt)

            _failures[cache_key] = _failures.get(cache_key, 0) + 1
            error_ttl = min(MAX_ERROR_TTL, error_ttl * 2 ** (_failures[cache_key] - 1))
            logger.error(f"[{cache_key}] All attempts failed; backing off {int(error_ttl)} s.")
            _cache[cache_key] = {
                'status': 'error',
                'error': last_err,
                'fetched_at': time.time(),
                'expires_at': time.time() + error_ttl
            }
            if source_id:
                store.record_source(source_id, False, last_err)
            raise Exception(f"Request failed: {last_err}")


def fetched_at(cache_key: str) -> Optional[float]:
    entry = _cache.get(cache_key)
    if entry and entry.get('status') == 'success':
        return entry.get('fetched_at')
    return None


def invalidate(prefix: str) -> int:
    keys = [k for k in _cache if k.startswith(prefix)]
    for k in keys:
        _cache.pop(k, None)
        _failures.pop(k, None)
    return len(keys)


data_fetcher = AsyncDataFetcher()
