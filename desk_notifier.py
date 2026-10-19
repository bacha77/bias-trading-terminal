import os
import time
import json
import logging
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger("DeskNotifier")

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "telegram_config.json")
_recent_alerts: List[Dict[str, Any]] = []

def get_telegram_config() -> Dict[str, str]:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    tz = os.getenv("TELEGRAM_TIMEZONE", "").strip()
    
    # Check .env
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r") as f:
                for line in f:
                    if "=" in line and not line.startswith("#"):
                        k, v = line.strip().split("=", 1)
                        if k == "TELEGRAM_BOT_TOKEN" and not token:
                            token = v.strip()
                        elif k == "TELEGRAM_CHAT_ID" and not chat_id:
                            chat_id = v.strip()
                        elif k == "TELEGRAM_TIMEZONE" and not tz:
                            tz = v.strip()
        except Exception:
            pass

    # Check saved json config
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
                if not token:
                    token = data.get("bot_token", "").strip()
                if not chat_id:
                    chat_id = data.get("chat_id", "").strip()
                if not tz:
                    tz = data.get("timezone", "").strip()
        except Exception:
            pass
            
    if not tz:
        tz = "America/New_York"
            
    return {"bot_token": token, "chat_id": chat_id, "timezone": tz}

def save_telegram_config(bot_token: str, chat_id: str) -> bool:
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump({"bot_token": bot_token.strip(), "chat_id": chat_id.strip()}, f, indent=2)
        # Update current process environment
        os.environ["TELEGRAM_BOT_TOKEN"] = bot_token.strip()
        os.environ["TELEGRAM_CHAT_ID"] = chat_id.strip()
        return True
    except Exception as e:
        logger.error(f"Failed to save telegram config: {e}")
        return False

def send_telegram_alert(text: str, parse_mode: str = "HTML", reply_markup: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    cfg = get_telegram_config()
    token = cfg.get("bot_token")
    chat_id = cfg.get("chat_id")
    
    if not token or not chat_id:
        return {
            "success": False,
            "status": "not_configured",
            "message": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured."
        }
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload: Dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if res_data.get("ok"):
                return {"success": True, "status": "delivered", "data": res_data}
            else:
                return {"success": False, "status": "error", "error": res_data.get("description", "Unknown error")}
    except Exception as e:
        logger.error(f"Telegram dispatch error: {e}")
        return {"success": False, "status": "exception", "error": str(e)}

def dispatch_desk_alert(
    title: str,
    details: str,
    category: str = "CRYPTO_TRADE",
    level: str = "INFO",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Central notification dispatcher:
    1. Formats crisp HTML for Telegram.
    2. Sends to Telegram bot with interactive inline action buttons.
    3. Keeps in-memory buffer of recent alerts for the frontend notification feed.
    """
    global _recent_alerts
    # Format time in local/market time (defaults to US Eastern Time ET, America/New_York)
    try:
        from zoneinfo import ZoneInfo
        cfg = get_telegram_config()
        tz_name = cfg.get("timezone") or os.getenv("TELEGRAM_TIMEZONE", "America/New_York")
        now = datetime.now(ZoneInfo(tz_name))
        now_str = now.strftime("%I:%M:%S %p %Z · %b %d")
    except Exception:
        now = datetime.now().astimezone()
        tz_abbr = now.tzname() or "ET"
        if "Eastern" in tz_abbr:
            tz_abbr = "EDT" if "Daylight" in tz_abbr else "EST"
        now_str = now.strftime(f"%I:%M:%S %p {tz_abbr} · %b %d")
    
    icon_map = {
        "CRYPTO_TRADE": "⚡",
        "OPTIONS_TRADE": "🤖",
        "STOP_LOSS": "🛑",
        "TAKE_PROFIT": "💰",
        "RATCHET": "🔒",
        "GAMMA_WALL": "🏛️",
        "RISK_ALERT": "⚠️"
    }
    icon = icon_map.get(category, "🔔")
    
    # Desk tag identification
    if "DEX" in title or "DEX" in details or (metadata and metadata.get("chain") in ("solana", "base")):
        desk_label = "🪐 DEX RADAR & SNIPER"
    elif "OPTION" in title or "0DTE" in title or category == "OPTIONS_TRADE":
        desk_label = "📈 0DTE OPTIONS DESK"
    elif "CRYPTO" in title or category == "CRYPTO_TRADE":
        desk_label = "🪙 MAIN CRYPTO DESK (24/7)"
    else:
        desk_label = "🏛️ DUMAY B.I.A.S. TERMINAL"

    # Telegram message format
    tg_lines = [
        f"<b>{icon} {desk_label}</b>",
        f"<b>{title}</b>",
        f"<code>{details}</code>",
        f"<i>Time: {now_str}</i>"
    ]
    if metadata and isinstance(metadata, dict):
        extra = " | ".join([f"{k}: {v}" for k, v in metadata.items() if v is not None])
        if extra:
            tg_lines.append(f"<b>Telemetry:</b> <code>{extra}</code>")
            
    tg_text = "\n".join(tg_lines)

    # Dynamic interactive Telegram inline buttons
    reply_markup = None
    keyboard = []
    
    pair_url = metadata.get("pair_url") if metadata and isinstance(metadata, dict) else None
    token_sym = (metadata.get("symbol") or metadata.get("token")) if metadata and isinstance(metadata, dict) else None

    row1 = []
    if pair_url:
        row1.append({"text": "📊 Live Chart", "url": pair_url})
    elif token_sym:
        row1.append({"text": f"📊 Chart {token_sym}", "url": f"https://dexscreener.com/search?q={token_sym}"})
    row1.append({"text": "🖥️ Terminal", "url": "https://bias-trading-terminal-app.web.app"})
    keyboard.append(row1)

    # Row 2: One-Touch Phone Trading Buttons (Sell 50%, Market Exit, Flatten All)
    token_addr = (metadata.get("token_address") or metadata.get("address")) if metadata else None
    if token_addr and category in ("CRYPTO_TRADE", "RATCHET", "TAKE_PROFIT"):
        keyboard.append([
            {"text": "💰 Sell 50%", "callback_data": f"half:{token_addr}"},
            {"text": "🛑 Market Exit", "callback_data": f"exit:{token_addr}"}
        ])
    elif category == "RISK_ALERT" or "FLATTEN" in title:
        keyboard.append([{"text": "⚡ FLATTEN ALL TO CASH", "callback_data": "flatten_all"}])

    if keyboard:
        reply_markup = {"inline_keyboard": keyboard}

    tg_result = send_telegram_alert(tg_text, reply_markup=reply_markup)
    
    alert_record = {
        "id": f"alert_{int(time.time() * 1000)}",
        "timestamp": time.time(),
        "time": now_str,
        "title": title,
        "details": details,
        "category": category,
        "level": level,
        "telegram_status": tg_result.get("status", "unknown"),
        "metadata": metadata or {}
    }
    
    _recent_alerts.insert(0, alert_record)
    if len(_recent_alerts) > 100:
        _recent_alerts = _recent_alerts[:100]
        
    return {
        "alert": alert_record,
        "telegram": tg_result
    }

_CALLBACK_LISTENER_STARTED = False

def process_telegram_callback_action(cq_data: str) -> str:
    """
    Executes trades requested from Telegram inline buttons:
    - half:<address>
    - exit:<address>
    - flatten_all
    """
    import solana_dex_engine
    answer_text = "Action completed!"

    if cq_data.startswith("exit:"):
        addr = cq_data.split("exit:")[1]
        res = solana_dex_engine.close_dex_position_by_address(addr, partial_pct=1.0)
        sym = res.get("token", "Token")
        answer_text = f"🛑 Market exit executed for {sym}!"
        send_telegram_alert(f"✅ <b>TELEGRAM ONE-TOUCH EXIT</b>: Market liquidated <b>{sym}</b>! Banked P&L: <code>${res.get('pnl', 0.0):+.2f}</code>")
    elif cq_data.startswith("half:"):
        addr = cq_data.split("half:")[1]
        res = solana_dex_engine.close_dex_position_by_address(addr, partial_pct=0.5)
        sym = res.get("token", "Token")
        answer_text = f"💰 Sold 50% of {sym}!"
        send_telegram_alert(f"💰 <b>TELEGRAM 50% CASH OUT</b>: Sold half of <b>{sym}</b>! Banked: <code>${res.get('pnl', 0.0):+.2f}</code>")
    elif cq_data == "flatten_all":
        res = solana_dex_engine.flatten_all_dex_positions()
        answer_text = f"⚡ FLATTEN COMPLETE: Liquidated {res.get('closed_count', 0)} positions!"

    return answer_text

def start_telegram_callback_listener():
    """
    Background daemon thread that listens for interactive button taps in Telegram.
    Allows user to tap [ 💰 Sell 50% ] or [ 🛑 Market Exit ] from their phone!
    """
    global _CALLBACK_LISTENER_STARTED
    if _CALLBACK_LISTENER_STARTED:
        return
    _CALLBACK_LISTENER_STARTED = True

    import threading
    def listener_loop():
        cfg = get_telegram_config()
        token = cfg.get("bot_token")
        if not token:
            return
            
        offset = 0
        while True:
            try:
                url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=15"
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = json.loads(resp.read().decode())
                    for update in data.get("result", []):
                        offset = max(offset, update["update_id"] + 1)
                        cq = update.get("callback_query")
                        if not cq:
                            continue
                            
                        cq_id = cq["id"]
                        cq_data = cq.get("data", "")
                        answer_text = process_telegram_callback_action(cq_data)
                        
                        # Acknowledge callback query
                        try:
                            ack_url = f"https://api.telegram.org/bot{token}/answerCallbackQuery"
                            ack_payload = json.dumps({"callback_query_id": cq_id, "text": answer_text}).encode()
                            ack_req = urllib.request.Request(ack_url, data=ack_payload, headers={"Content-Type": "application/json"})
                            urllib.request.urlopen(ack_req, timeout=5)
                        except Exception:
                            pass
            except Exception as e:
                time.sleep(4)
            time.sleep(1)

    t = threading.Thread(target=listener_loop, daemon=True)
    t.start()

def get_recent_desk_alerts(limit: int = 40) -> List[Dict[str, Any]]:
    return _recent_alerts[:limit]
