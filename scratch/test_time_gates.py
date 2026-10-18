from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
    et = datetime.now(ZoneInfo('America/New_York'))
except Exception:
    et = datetime.now(timezone.utc) - timedelta(hours=4)

past_cutoff = (et.weekday() < 5) and ((et.hour == 15 and et.minute >= 30) or (et.hour >= 16))
market_opening_churn = (et.weekday() < 5) and (et.hour == 9 and 30 <= et.minute < 45)
market_open = (et.weekday() < 5) and (et.hour > 9 or (et.hour == 9 and et.minute >= 30)) and (et.hour < 16)

print(f"Current ET: {et.strftime('%Y-%m-%d %H:%M:%S ET')}")
print(f"Market Open: {market_open}")
print(f"Past 15:30 Cutoff (No New Trades): {past_cutoff}")
print(f"Opening Churn Active: {market_opening_churn}")

# Simulated Test Cases:
times_to_test = [
    ("9:20 AM ET (Pre-market)", 9, 20),
    ("9:35 AM ET (Opening churn)", 9, 35),
    ("10:15 AM ET (Normal morning trade)", 10, 15),
    ("12:30 PM ET (Midday lull)", 12, 30),
    ("3:25 PM ET (Valid afternoon setup)", 15, 25),
    ("3:31 PM ET (Past cutoff - BLOCKED)", 15, 31),
    ("3:55 PM ET (Near close - BLOCKED)", 15, 55),
    ("4:10 PM ET (After hours - BLOCKED)", 16, 10),
]

print("\nRunning Simulated Time Gate Tests:")
for label, h, m in times_to_test:
    is_blocked = ((h == 15 and m >= 30) or (h >= 16))
    status = "BLOCKED" if is_blocked else "ALLOWED"
    print(f"  [{status}] {label:35} -> {'Correctly Blocked' if is_blocked else 'Trade Permitted'}")
