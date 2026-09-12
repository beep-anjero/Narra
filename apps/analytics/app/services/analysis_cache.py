import secrets
import time
from collections import OrderedDict
from dataclasses import dataclass
from threading import Lock

from app.schemas.dataset import DatasetAnalysis
from app.schemas.filters import FilterField
from app.services.csv_parser import ParsedCsv
from app.services.errors import DatasetError


@dataclass
class CachedAnalysis:
    scope: str
    parsed: ParsedCsv
    analysis: DatasetAnalysis
    fields: list[FilterField]
    expires_at: float
    size: int


class AnalysisCache:
    """Single-process, owner-scoped, bounded temporary cache; no durable storage."""

    def __init__(self, max_bytes: int = 128 * 1024 * 1024, ttl: int = 900, max_entries: int = 8):
        self.max_bytes, self.ttl, self.max_entries = max_bytes, ttl, max_entries
        self.entries: OrderedDict[str, CachedAnalysis] = OrderedDict()
        self.lock = Lock()

    def _expire(self):
        for token in list(self.entries):
            if self.entries[token].expires_at <= time.monotonic():
                del self.entries[token]

    def put(
        self, scope: str, parsed: ParsedCsv, analysis: DatasetAnalysis, fields: list[FilterField]
    ) -> str | None:
        size = int(parsed.frame.memory_usage(index=True, deep=True).sum())
        if size > self.max_bytes:
            return None
        with self.lock:
            self._expire()
            while self.entries and (
                len(self.entries) >= self.max_entries
                or sum(item.size for item in self.entries.values()) + size > self.max_bytes
            ):
                self.entries.popitem(last=False)
            token = secrets.token_urlsafe(32)
            self.entries[token] = CachedAnalysis(
                scope, parsed, analysis, fields, time.monotonic() + self.ttl, size
            )
            return token

    def get(self, token: str, scope: str) -> CachedAnalysis:
        with self.lock:
            self._expire()
            entry = self.entries.get(token)
            if entry is None or entry.scope != scope:
                raise DatasetError(
                    "analysis_expired",
                    "This analysis is unavailable or expired. Upload the CSV again.",
                    410,
                )
            self.entries.move_to_end(token)
            return entry
