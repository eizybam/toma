"""Decodes the tap code appended to the NFC URL into a monotonically increasing counter.

Each tag declares its scheme. `hex` is a public counter used for simulated tags. `st25` decodes
the ST25TV02KC unique tap code and is provided by `tap_codes_private`, which is deployed from the
owner's machine and never committed.
"""
import re
from collections.abc import Callable

_HEX = re.compile(r"^[0-9A-Fa-f]{1,8}$")


def decode_hex_counter(code: str) -> int | None:
    return int(code, 16) if _HEX.match(code) else None


DECODERS: dict[str, Callable[[str], int | None]] = {"hex": decode_hex_counter}

try:
    from tap_codes_private import decode as _decode_st25

    DECODERS["st25"] = _decode_st25
except ImportError:
    pass

DEFAULT_SCHEME = "hex"
