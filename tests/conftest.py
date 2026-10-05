"""Install a minimal in-process `genlayer` stub so the contract module imports
without the GenVM runtime.

The offline suite only exercises pure, deterministic helper logic (outcome
normalisation, URL validation, constants). The non-deterministic settlement
block needs real validators and is covered by the live seed script.
"""
import sys
import types


def _install_genlayer_stub() -> None:
    if "genlayer" in sys.modules:
        return

    class UserError(Exception):
        pass

    class _Return:
        def __init__(self, calldata):
            self.calldata = calldata

    class _Message:
        sender_address = "0x" + "11" * 20
        value = 0

    class _Contract:
        pass

    class _VM:
        pass

    _VM.UserError = UserError
    _VM.Return = _Return
    _VM.run_nondet = staticmethod(lambda leader_fn, validator_fn: leader_fn())

    def _identity(fn):
        return fn

    class _Write:
        def __call__(self, fn):
            return fn

        payable = staticmethod(_identity)

    _public = types.SimpleNamespace(view=_identity, write=_Write())

    gl = types.SimpleNamespace(
        Contract=_Contract,
        vm=_VM,
        message=_Message,
        public=_public,
        nondet=types.SimpleNamespace(),
        get_contract_at=lambda *a, **k: None,
    )

    class _Subscriptable:
        def __class_getitem__(cls, item):
            return cls

    class TreeMap(_Subscriptable, dict):
        pass

    class Address(str):
        def __new__(cls, v=""):
            return str.__new__(cls, v)

        @property
        def as_hex(self):
            return str(self)

    def u256(x):
        return int(x)

    mod = types.ModuleType("genlayer")
    mod.gl = gl
    mod.TreeMap = TreeMap
    mod.Address = Address
    mod.u256 = u256
    mod.__all__ = ["gl", "TreeMap", "Address", "u256"]
    sys.modules["genlayer"] = mod


_install_genlayer_stub()
