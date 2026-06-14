"""Ethereum-style signature recovery (keccak256 + secp256k1 ecrecover), pure
Python, no dependencies. dstack gateways (RedPill, Venice) sign each response
with a key whose address is bound to the TDX quote's report_data, so verifying a
response signature ties the transcript to the attested enclave — the basis for
trustless behavioural binding.

Self-tested: keccak256("") matches the known vector, and recover_eth_personal
recovers RedPill's live signing_address from a real response signature.
"""

_RC = [0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
       0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
       0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
       0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
       0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
       0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008]
_ROT = [[0, 36, 3, 41, 18], [1, 44, 10, 45, 2], [62, 6, 43, 15, 61],
        [28, 55, 25, 21, 56], [27, 20, 39, 8, 14]]
_M64 = 0xFFFFFFFFFFFFFFFF


def keccak256(data):
    def rol(x, n):
        return ((x << n) | (x >> (64 - n))) & _M64
    st = [[0] * 5 for _ in range(5)]
    m = bytearray(data)
    m.append(0x01)
    while len(m) % 136:
        m.append(0)
    m[-1] |= 0x80
    for off in range(0, len(m), 136):
        for i in range(17):
            st[i % 5][i // 5] ^= int.from_bytes(m[off + i * 8:off + i * 8 + 8], "little")
        for rnd in range(24):
            C = [st[x][0] ^ st[x][1] ^ st[x][2] ^ st[x][3] ^ st[x][4] for x in range(5)]
            D = [C[(x - 1) % 5] ^ rol(C[(x + 1) % 5], 1) for x in range(5)]
            for x in range(5):
                for y in range(5):
                    st[x][y] ^= D[x]
            B = [[0] * 5 for _ in range(5)]
            for x in range(5):
                for y in range(5):
                    B[y][(2 * x + 3 * y) % 5] = rol(st[x][y], _ROT[x][y])
            for x in range(5):
                for y in range(5):
                    st[x][y] = B[x][y] ^ ((~B[(x + 1) % 5][y]) & B[(x + 2) % 5][y])
            st[0][0] ^= _RC[rnd]
    out = bytearray()
    for i in range(4):
        out += st[i % 5][i // 5].to_bytes(8, "little")
    return bytes(out)


_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
_GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798
_GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8


def _inv(a, m):
    return pow(a, m - 2, m)


def _add(p, q):
    if p is None:
        return q
    if q is None:
        return p
    if p[0] == q[0] and (p[1] + q[1]) % _P == 0:
        return None
    if p == q:
        l = (3 * p[0] * p[0]) * _inv(2 * p[1], _P) % _P
    else:
        l = (q[1] - p[1]) * _inv(q[0] - p[0], _P) % _P
    x = (l * l - p[0] - q[0]) % _P
    return (x, (l * (p[0] - x) - p[1]) % _P)


def _mul(k, p):
    r = None
    while k:
        if k & 1:
            r = _add(r, p)
        p = _add(p, p)
        k >>= 1
    return r


def _ecrecover(msghash, r, s, recid):
    x = r + (_N if recid >= 2 else 0)
    if x >= _P:
        return None
    y = pow((pow(x, 3, _P) + 7) % _P, (_P + 1) // 4, _P)
    if y % 2 != (recid & 1):
        y = _P - y
    e = int.from_bytes(msghash, "big")
    ri = _inv(r, _N)
    Q = _mul(ri, _add(_mul(s, (x, y)), _mul((-e) % _N, (_GX, _GY))))
    if Q is None:
        return None
    return "0x" + keccak256(Q[0].to_bytes(32, "big") + Q[1].to_bytes(32, "big"))[-20:].hex()


def _eth_personal_hash(text):
    body = text.encode()
    return keccak256(b"\x19Ethereum Signed Message:\n" + str(len(body)).encode() + body)


def recover_eth_personal(text, signature_hex):
    """Recover the signer address from an eth-personal-signed `text` (the format
    RedPill/dstack uses for response signatures). Returns 0x-address or None."""
    try:
        raw = bytes.fromhex(signature_hex[2:] if signature_hex.startswith("0x") else signature_hex)
        if len(raw) != 65:
            return None
        r = int.from_bytes(raw[0:32], "big")
        s = int.from_bytes(raw[32:64], "big")
        v = raw[64]
        recid = v - 27 if v >= 27 else v
        h = _eth_personal_hash(text)
        return _ecrecover(h, r, s, recid)
    except Exception:
        return None


def selftest():
    """keccak vector; recovery exercised live against RedPill in tests."""
    return keccak256(b"").hex() == "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
