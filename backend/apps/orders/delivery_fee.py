"""
Delivery fee calculation for Bammidi's Collections.

Rules:
  - Andhra Pradesh & Telangana: Free delivery on orders ₹499+, else ₹199
  - All other states:           Free delivery on orders ₹999+, else ₹199
"""

FREE_DELIVERY_STATES = {
    'andhra pradesh', 'telangana',
    'ap', 'ts',  # abbreviations
}

FREE_THRESHOLD_AP_TS = 499   # ₹499 for AP & Telangana
FREE_THRESHOLD_OTHER = 999   # ₹999 for all other states
DELIVERY_CHARGE      = 199   # ₹199 flat charge when not free


def calculate_delivery_fee(subtotal: float, state: str) -> float:
    """
    Return delivery fee based on subtotal and delivery state.

    Args:
        subtotal: Cart subtotal in ₹
        state:    Delivery address state (case-insensitive)

    Returns:
        0 if eligible for free delivery, else 199
    """
    normalised = (state or '').strip().lower()
    is_ap_ts = normalised in FREE_DELIVERY_STATES

    threshold = FREE_THRESHOLD_AP_TS if is_ap_ts else FREE_THRESHOLD_OTHER
    return 0 if subtotal >= threshold else float(DELIVERY_CHARGE)


def delivery_info_for_state(state: str) -> dict:
    """Return human-readable free-delivery info for the given state."""
    normalised = (state or '').strip().lower()
    is_ap_ts = normalised in FREE_DELIVERY_STATES
    threshold = FREE_THRESHOLD_AP_TS if is_ap_ts else FREE_THRESHOLD_OTHER
    return {
        'free_delivery_threshold': threshold,
        'delivery_charge': DELIVERY_CHARGE,
        'is_ap_ts': is_ap_ts,
    }
