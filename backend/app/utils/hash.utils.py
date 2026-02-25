"""
Tamper-evident hashing for agreements.

Provides deterministic, canonical JSON serialization and SHA-256 hashing
to create verifiable receipts for agreements.
"""

import hashlib
import json
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict


HASH_VERSION = "v1"


def serialize_for_hash(obj: Any) -> Any:
    """
    Recursively convert Python objects to JSON-serializable primitives
    with deterministic formatting.
    """
    if isinstance(obj, dict):
        # Sort keys alphabetically for deterministic ordering
        return {k: serialize_for_hash(v) for k, v in sorted(obj.items())}
    elif isinstance(obj, list):
        return [serialize_for_hash(item) for item in obj]
    elif isinstance(obj, datetime):
        # ISO format with UTC (no microseconds for stability)
        return obj.replace(microsecond=0).isoformat() + "Z"
    elif isinstance(obj, Decimal):
        # Fixed 2 decimal places for amounts
        return f"{obj:.2f}"
    elif isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    else:
        # Fallback: convert to string
        return str(obj)


def compute_agreement_hash(agreement_data: Dict[str, Any]) -> str:
    """
    Compute deterministic SHA-256 hash of agreement data.
    Returns:
        Hex-encoded SHA-256 hash (64 characters)
    """
    # Serialize to canonical form
    canonical = serialize_for_hash(agreement_data)
    # Convert to JSON with stable formatting
    json_str = json.dumps(
        canonical,
        ensure_ascii=True,
        sort_keys=True,
        separators=(',', ':')
    )
    # Compute SHA-256
    hash_bytes = hashlib.sha256(json_str.encode('utf-8')).digest()
    return hash_bytes.hex()


def verify_agreement_hash(
    agreement_data: Dict[str, Any],
    expected_hash: str
) -> bool:
    """
    Verify that agreement data produces the expected hash.
    """
    computed = compute_agreement_hash(agreement_data)
    return computed == expected_hash


def generate_verification_url(
        agreement_id: str, hash_value: str, base_url: str
        ) -> str:
    """
    Generate a verification URL for QR code embedding.
    """
    return f"{base_url}/api/v1/verify?id={agreement_id}&hash={hash_value}"
